/**
 * Durable in-app notifications for the creator admin bell.
 * Respects user_settings.notification_prefs category toggles.
 */

import sql from '@/app/api/utils/sql';
import {
  DEFAULT_NOTIF_PREFS,
  type NotifPrefKey,
  type NotificationPrefs,
} from '@/lib/notification-prefs';
import { getUserSettings } from '@/lib/settings/persist';

export type InAppPrefKey = Exclude<NotifPrefKey, 'weeklyEmailDigest'>;

export type UserNotification = {
  id: string;
  user_id: string;
  pref_key: InAppPrefKey;
  title: string;
  body: string | null;
  href: string | null;
  meta: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

let schemaReady: Promise<void> | null = null;

export async function ensureNotificationsSchema(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  if (schemaReady) return schemaReady;

  schemaReady = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS public.user_notifications (
        id           bigserial PRIMARY KEY,
        user_id      text NOT NULL,
        pref_key     text NOT NULL,
        title        text NOT NULL,
        body         text,
        href         text,
        meta         jsonb NOT NULL DEFAULT '{}'::jsonb,
        read_at      timestamptz,
        created_at   timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS user_notifications_user_created_idx
        ON public.user_notifications (user_id, created_at DESC)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS user_notifications_user_unread_idx
        ON public.user_notifications (user_id)
        WHERE read_at IS NULL
    `;
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });

  return schemaReady;
}

function mapRow(row: Record<string, unknown>): UserNotification {
  const meta =
    row.meta && typeof row.meta === 'object'
      ? (row.meta as Record<string, unknown>)
      : {};
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    pref_key: String(row.pref_key) as InAppPrefKey,
    title: String(row.title || ''),
    body: row.body != null ? String(row.body) : null,
    href: row.href != null ? String(row.href) : null,
    meta,
    read_at: row.read_at ? String(row.read_at) : null,
    created_at: String(row.created_at || new Date().toISOString()),
  };
}

const IN_APP_KEYS: InAppPrefKey[] = [
  'notifNewMembers',
  'notifPurchases',
  'notifAutomations',
  'notifLiveReminders',
];

function isInAppPrefKey(value: string): value is InAppPrefKey {
  return (IN_APP_KEYS as string[]).includes(value);
}

/** True when the user still wants this category in the in-app bell. */
export async function userWantsInAppNotif(
  userId: string,
  prefKey: InAppPrefKey
): Promise<boolean> {
  try {
    const settings = await getUserSettings(userId);
    const prefs: NotificationPrefs = {
      ...DEFAULT_NOTIF_PREFS,
      ...settings.notification_prefs,
    };
    return Boolean(prefs[prefKey]);
  } catch {
    return DEFAULT_NOTIF_PREFS[prefKey];
  }
}

/**
 * Insert a notification for a creator. No-ops when the category is muted
 * or DATABASE_URL is unset. Never throws to callers (best-effort).
 */
export async function createUserNotification(input: {
  userId: string;
  prefKey: InAppPrefKey;
  title: string;
  body?: string | null;
  href?: string | null;
  meta?: Record<string, unknown>;
}): Promise<UserNotification | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  const userId = input.userId?.trim();
  const title = input.title?.trim();
  if (!userId || !title || !isInAppPrefKey(input.prefKey)) return null;

  try {
    const wants = await userWantsInAppNotif(userId, input.prefKey);
    if (!wants) return null;

    await ensureNotificationsSchema();
    const rows = await sql`
      INSERT INTO public.user_notifications (
        user_id, pref_key, title, body, href, meta
      )
      VALUES (
        ${userId},
        ${input.prefKey},
        ${title},
        ${input.body?.trim() || null},
        ${input.href?.trim() || null},
        ${JSON.stringify(input.meta || {})}
      )
      RETURNING *
    `;
    const row = rows?.[0] as Record<string, unknown> | undefined;
    return row ? mapRow(row) : null;
  } catch (error) {
    console.warn('[notifications] create failed', error);
    return null;
  }
}

export async function listUserNotifications(input: {
  userId: string;
  limit?: number;
  unreadOnly?: boolean;
}): Promise<UserNotification[]> {
  if (!process.env.DATABASE_URL?.trim()) return [];
  await ensureNotificationsSchema();
  const limit = Math.min(Math.max(input.limit ?? 30, 1), 100);

  // Filter by current preference toggles so muted categories disappear.
  let prefs: NotificationPrefs = { ...DEFAULT_NOTIF_PREFS };
  try {
    prefs = (await getUserSettings(input.userId)).notification_prefs;
  } catch {
    /* defaults */
  }
  const enabledKeys = IN_APP_KEYS.filter((k) => prefs[k]);
  if (!enabledKeys.length) return [];

  const rows = input.unreadOnly
    ? await sql`
        SELECT *
        FROM public.user_notifications
        WHERE user_id = ${input.userId}
          AND read_at IS NULL
          AND pref_key = ANY(${enabledKeys})
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
    : await sql`
        SELECT *
        FROM public.user_notifications
        WHERE user_id = ${input.userId}
          AND pref_key = ANY(${enabledKeys})
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;

  return (rows as Record<string, unknown>[]).map(mapRow);
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  if (!process.env.DATABASE_URL?.trim()) return 0;
  await ensureNotificationsSchema();

  let prefs: NotificationPrefs = { ...DEFAULT_NOTIF_PREFS };
  try {
    prefs = (await getUserSettings(userId)).notification_prefs;
  } catch {
    /* defaults */
  }
  const enabledKeys = IN_APP_KEYS.filter((k) => prefs[k]);
  if (!enabledKeys.length) return 0;

  const rows = await sql`
    SELECT COUNT(*)::int AS n
    FROM public.user_notifications
    WHERE user_id = ${userId}
      AND read_at IS NULL
      AND pref_key = ANY(${enabledKeys})
  `;
  return Number(rows?.[0]?.n || 0);
}

export async function markNotificationRead(input: {
  userId: string;
  notificationId: string;
}): Promise<boolean> {
  if (!process.env.DATABASE_URL?.trim()) return false;
  await ensureNotificationsSchema();
  const rows = await sql`
    UPDATE public.user_notifications
    SET read_at = COALESCE(read_at, now())
    WHERE id = ${input.notificationId}
      AND user_id = ${input.userId}
    RETURNING id
  `;
  return Boolean(rows?.[0]?.id);
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  if (!process.env.DATABASE_URL?.trim()) return 0;
  await ensureNotificationsSchema();
  const rows = await sql`
    UPDATE public.user_notifications
    SET read_at = now()
    WHERE user_id = ${userId}
      AND read_at IS NULL
    RETURNING id
  `;
  return Array.isArray(rows) ? rows.length : 0;
}

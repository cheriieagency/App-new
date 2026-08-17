/**
 * Durable user + workspace settings (timezone, notifs, org branding).
 */

import sql from '@/app/api/utils/sql';
import type { NotificationPrefs } from '@/lib/notification-prefs';
import { DEFAULT_NOTIF_PREFS } from '@/lib/notification-prefs';
import type { OrgBranding, PendingInvite } from '@/lib/settings-prefs';

let schemaReady: Promise<void> | null = null;

export async function ensureSettingsSchema(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  if (schemaReady) return schemaReady;

  schemaReady = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS public.user_settings (
        user_id              text PRIMARY KEY,
        timezone             text NOT NULL DEFAULT 'Europe/Stockholm',
        notification_prefs   jsonb NOT NULL DEFAULT '{}'::jsonb,
        updated_at           timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`
      ALTER TABLE public.workspaces
        ADD COLUMN IF NOT EXISTS branding jsonb NOT NULL DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS pending_invites jsonb NOT NULL DEFAULT '[]'::jsonb
    `;
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });

  return schemaReady;
}

export type UserSettingsRow = {
  timezone: string;
  notification_prefs: NotificationPrefs;
};

export async function getUserSettings(userId: string): Promise<UserSettingsRow> {
  await ensureSettingsSchema();
  const rows = await sql`
    SELECT timezone, notification_prefs
    FROM public.user_settings
    WHERE user_id = ${userId}
    LIMIT 1
  `;
  const row = rows?.[0] as Record<string, unknown> | undefined;
  if (!row) {
    return {
      timezone: 'Europe/Stockholm',
      notification_prefs: { ...DEFAULT_NOTIF_PREFS },
    };
  }
  return {
    timezone: String(row.timezone || 'Europe/Stockholm'),
    notification_prefs: {
      ...DEFAULT_NOTIF_PREFS,
      ...((row.notification_prefs as Partial<NotificationPrefs>) || {}),
    },
  };
}

export async function upsertUserSettings(input: {
  userId: string;
  timezone?: string;
  notification_prefs?: NotificationPrefs;
}): Promise<UserSettingsRow> {
  await ensureSettingsSchema();
  const current = await getUserSettings(input.userId);
  const timezone = input.timezone?.trim() || current.timezone;
  const notification_prefs =
    input.notification_prefs ?? current.notification_prefs;

  await sql`
    INSERT INTO public.user_settings (user_id, timezone, notification_prefs, updated_at)
    VALUES (
      ${input.userId},
      ${timezone},
      ${JSON.stringify(notification_prefs)},
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      timezone = EXCLUDED.timezone,
      notification_prefs = EXCLUDED.notification_prefs,
      updated_at = now()
  `;

  return { timezone, notification_prefs };
}

export async function getWorkspaceBranding(
  workspaceId: string,
  userId: string
): Promise<OrgBranding> {
  await ensureSettingsSchema();
  const rows = await sql`
    SELECT branding, name
    FROM public.workspaces
    WHERE id = ${workspaceId} AND user_id::text = ${userId}
    LIMIT 1
  `;
  const row = rows?.[0] as Record<string, unknown> | undefined;
  const branding = (row?.branding as Partial<OrgBranding>) || {};
  return {
    name: String(branding.name || row?.name || ''),
    logoUrl: (branding.logoUrl as string | null) ?? null,
    faviconUrl: (branding.faviconUrl as string | null) ?? null,
  };
}

export async function upsertWorkspaceBranding(input: {
  workspaceId: string;
  userId: string;
  branding: OrgBranding;
}): Promise<OrgBranding> {
  await ensureSettingsSchema();
  const branding = {
    name: input.branding.name.trim(),
    logoUrl: input.branding.logoUrl,
    faviconUrl: input.branding.faviconUrl,
  };
  await sql`
    UPDATE public.workspaces
    SET
      branding = ${JSON.stringify(branding)},
      name = COALESCE(NULLIF(${branding.name}, ''), name),
      updated_at = now()
    WHERE id = ${input.workspaceId}
      AND user_id::text = ${input.userId}
  `;
  return branding;
}

export async function getWorkspaceInvites(
  workspaceId: string,
  userId: string
): Promise<PendingInvite[]> {
  await ensureSettingsSchema();
  const rows = await sql`
    SELECT pending_invites
    FROM public.workspaces
    WHERE id = ${workspaceId} AND user_id::text = ${userId}
    LIMIT 1
  `;
  const raw = rows?.[0]?.pending_invites;
  return Array.isArray(raw) ? (raw as PendingInvite[]) : [];
}

export async function upsertWorkspaceInvites(input: {
  workspaceId: string;
  userId: string;
  invites: PendingInvite[];
}): Promise<PendingInvite[]> {
  await ensureSettingsSchema();
  await sql`
    UPDATE public.workspaces
    SET pending_invites = ${JSON.stringify(input.invites)}, updated_at = now()
    WHERE id = ${input.workspaceId}
      AND user_id::text = ${input.userId}
  `;
  return input.invites;
}

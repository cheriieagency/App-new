/**
 * Creator notification preferences — in-app bell + weekly email digest.
 * Source of truth is user_settings (via /api/settings); localStorage caches
 * toggles for instant UI + cross-tab sync of the admin bell.
 */

export type NotifPrefKey =
  | 'notifNewMembers'
  | 'notifPurchases'
  | 'notifAutomations'
  | 'notifLiveReminders'
  | 'weeklyEmailDigest';

export type NotificationPrefs = Record<NotifPrefKey, boolean>;

export const DEFAULT_NOTIF_PREFS: NotificationPrefs = {
  notifNewMembers: true,
  notifPurchases: true,
  notifAutomations: true,
  notifLiveReminders: true,
  weeklyEmailDigest: true,
};

const STORAGE_PREFIX = 'clikd_notif_prefs_';

export function notifPrefsStorageKey(userId?: string | null): string {
  return `${STORAGE_PREFIX}${userId || 'anon'}`;
}

export function loadNotificationPrefs(userId?: string | null): NotificationPrefs {
  if (typeof window === 'undefined') return { ...DEFAULT_NOTIF_PREFS };
  try {
    const raw = window.localStorage.getItem(notifPrefsStorageKey(userId));
    if (!raw) return { ...DEFAULT_NOTIF_PREFS };
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
    return { ...DEFAULT_NOTIF_PREFS, ...parsed };
  } catch {
    return { ...DEFAULT_NOTIF_PREFS };
  }
}

export function saveNotificationPrefs(
  prefs: NotificationPrefs,
  userId?: string | null
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(notifPrefsStorageKey(userId), JSON.stringify(prefs));
    // Broadcast so the admin header bell can refresh without a full remount.
    window.dispatchEvent(
      new CustomEvent('clikd:notif-prefs', { detail: { prefs, userId } })
    );
  } catch {
    /* ignore quota */
  }
}

/**
 * Creator notification preferences — in-app bell + weekly email digest.
 * Persisted in localStorage so demo / local sessions keep choices.
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

/** Sample in-app notifications tied to preference categories. */
export type InAppNotification = {
  id: string;
  prefKey: Exclude<NotifPrefKey, 'weeklyEmailDigest'>;
  messageKey: string;
};

export const SAMPLE_IN_APP_NOTIFICATIONS: InAppNotification[] = [
  {
    id: 'n1',
    prefKey: 'notifNewMembers',
    messageKey: 'notifSampleNewMembers',
  },
  {
    id: 'n2',
    prefKey: 'notifPurchases',
    messageKey: 'notifSamplePurchase',
  },
  {
    id: 'n3',
    prefKey: 'notifAutomations',
    messageKey: 'notifSampleAutomation',
  },
  {
    id: 'n4',
    prefKey: 'notifLiveReminders',
    messageKey: 'notifSampleLive',
  },
];

export function filterInAppNotifications(
  prefs: NotificationPrefs
): InAppNotification[] {
  return SAMPLE_IN_APP_NOTIFICATIONS.filter((n) => prefs[n.prefKey]);
}

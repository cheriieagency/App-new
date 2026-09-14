'use client';

import {
  DEFAULT_NOTIF_PREFS,
  loadNotificationPrefs,
  saveNotificationPrefs,
  type NotifPrefKey,
  type NotificationPrefs,
} from '@/lib/notification-prefs';
import { SectionBlock } from '@/components/admin/settings/SettingsUi';
import { t, type Locale, type TranslationKey } from '@/lib/i18n';
import { Bell, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const IN_APP_KEYS: Exclude<NotifPrefKey, 'weeklyEmailDigest'>[] = [
  'notifNewMembers',
  'notifPurchases',
  'notifAutomations',
  'notifLiveReminders',
];

const EMAIL_KEYS: NotifPrefKey[] = ['weeklyEmailDigest'];

type NotificationsTabProps = {
  locale: Locale;
  userId?: string | null;
  userEmail: string;
};

export default function NotificationsTab({
  locale,
  userId,
  userEmail,
}: NotificationsTabProps) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIF_PREFS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/settings', { credentials: 'include' });
        if (r.ok) {
          const data = (await r.json()) as {
            notification_prefs?: NotificationPrefs | null;
          };
          if (!cancelled && data.notification_prefs) {
            setPrefs(data.notification_prefs);
            saveNotificationPrefs(data.notification_prefs, userId);
            return;
          }
        }
      } catch {
        /* local fallback */
      }
      if (!cancelled) setPrefs(loadNotificationPrefs(userId));
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const toggle = (key: NotifPrefKey) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveNotificationPrefs(next, userId);
      void fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notification_prefs: next }),
      }).then(async (r) => {
        if (!r.ok) toast.error(t('toastNotifPrefsSaveFailed', locale));
      });
      return next;
    });
  };

  const SwitchRow = ({
    labelKey,
    prefKey,
    hint,
  }: {
    labelKey: TranslationKey;
    prefKey: NotifPrefKey;
    hint?: string;
  }) => (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-[#E6E3DB] px-4 py-3 min-h-[52px] cursor-pointer hover:bg-[#F0EFEA]/80 transition-colors">
      <div className="min-w-0">
        <span className="text-sm font-semibold text-[#2C2621]">
          {t(labelKey, locale)}
        </span>
        {hint ? (
          <p className="text-xs text-[#8A857D] font-medium mt-0.5 truncate">{hint}</p>
        ) : null}
      </div>
      <input
        type="checkbox"
        checked={prefs[prefKey]}
        onChange={() => toggle(prefKey)}
        className="h-5 w-5 rounded border-[#E6E3DB] accent-[#243228] flex-shrink-0"
      />
    </label>
  );

  return (
    <>
      <SectionBlock
        title={t('notifInAppTitle', locale)}
        subtitle={t('notifInAppHint', locale)}
      >
        <div className="flex items-center gap-2 mb-3 text-[#8A857D]">
          <Bell size={14} />
          <p className="text-[11px] font-bold uppercase tracking-wide">
            {t('notifInAppBellHint', locale)}
          </p>
        </div>
        <div className="space-y-3">
          {IN_APP_KEYS.map((key) => (
            <SwitchRow key={key} labelKey={key} prefKey={key} />
          ))}
        </div>
      </SectionBlock>

      <SectionBlock
        title={t('notifEmailTitle', locale)}
        subtitle={t('notifWeeklyDigestHint', locale)}
      >
        <div className="flex items-center gap-2 mb-3 text-[#8A857D]">
          <Mail size={14} />
          <p className="text-[11px] font-bold uppercase tracking-wide">
            Sent to {userEmail}
          </p>
        </div>
        <div className="space-y-3">
          {EMAIL_KEYS.map((key) => (
            <SwitchRow
              key={key}
              labelKey="notifWeeklyDigest"
              prefKey={key}
              hint={userEmail}
            />
          ))}
        </div>
      </SectionBlock>
    </>
  );
}

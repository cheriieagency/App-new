'use client';

/**
 * Admin header notification bell — loads real user_notifications from the API.
 */

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import type { UserNotification } from '@/lib/notifications/persist';

type NotifListResponse = {
  items?: UserNotification[];
  unread?: number;
};

function relativeTime(iso: string, locale: string): string {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return '';
  const diffSec = Math.round((Date.now() - ts) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (Math.abs(diffSec) < 60) return rtf.format(-diffSec, 'second');
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(-diffMin, 'minute');
  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 48) return rtf.format(-diffHr, 'hour');
  const diffDay = Math.round(diffHr / 24);
  return rtf.format(-diffDay, 'day');
}

export default function AdminNotificationBell() {
  const { locale } = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ['user-notifications'],
    queryFn: async (): Promise<NotifListResponse> => {
      const r = await fetch('/api/notifications?limit=30', {
        credentials: 'include',
      });
      if (!r.ok) return { items: [], unread: 0 };
      return (await r.json()) as NotifListResponse;
    },
    refetchInterval: 60_000,
    staleTime: 15_000,
  });

  const items = data?.items ?? [];
  const unread = data?.unread ?? 0;

  const markMutation = useMutation({
    mutationFn: async (body: { id?: string; all?: boolean }) => {
      const r = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error('mark_failed');
      return r.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
    },
  });

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Refresh when Settings toggles prefs.
  useEffect(() => {
    const onPrefs = () => {
      void queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
    };
    window.addEventListener('clikd:notif-prefs', onPrefs as EventListener);
    return () => {
      window.removeEventListener('clikd:notif-prefs', onPrefs as EventListener);
    };
  }, [queryClient]);

  const openItem = (n: UserNotification) => {
    if (!n.read_at) {
      markMutation.mutate({ id: n.id });
    }
    setOpen(false);
    if (n.href?.startsWith('/')) {
      router.push(n.href);
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-full hover:bg-[#F0EFEA] flex items-center justify-center text-[#8A857D] relative transition-colors"
        aria-label={t('notificationsTitle', locale)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell size={17} strokeWidth={1.75} />
        {unread > 0 ? (
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#B85C38]" />
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-[#FFFFFF] border border-[#E6E3DB] rounded-xl shadow-[0_12px_30px_-12px_rgba(44,38,33,0.08)] z-40 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E6E3DB] flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-[#2C2621]">
              {t('notificationsTitle', locale)}
            </p>
            {unread > 0 ? (
              <button
                type="button"
                onClick={() => markMutation.mutate({ all: true })}
                className="text-[11px] font-semibold text-[#8A857D] hover:text-[#2C2621] min-h-[32px] px-1"
              >
                {t('notifMarkAllRead', locale)}
              </button>
            ) : null}
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-5 text-xs font-medium text-[#8A857D] leading-relaxed">
              {t('notifEmpty', locale)}
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id} className="border-b border-[#F0EFEA] last:border-0">
                  <button
                    type="button"
                    onClick={() => openItem(n)}
                    className={`w-full text-left px-4 py-3 min-h-[52px] hover:bg-[#F0EFEA] transition-colors ${
                      n.read_at ? 'opacity-70' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read_at ? (
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#B85C38] flex-shrink-0" />
                      ) : (
                        <span className="mt-1.5 w-1.5 h-1.5 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[#2C2621] leading-snug">
                          {n.title}
                        </p>
                        {n.body ? (
                          <p className="text-[11px] font-medium text-[#8A857D] mt-0.5 line-clamp-2">
                            {n.body}
                          </p>
                        ) : null}
                        <p className="text-[10px] font-medium text-[#8A857D]/70 mt-1">
                          {relativeTime(n.created_at, locale)}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

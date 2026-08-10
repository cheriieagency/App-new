'use client';

import { Inbox, MessageCircle } from 'lucide-react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { AdminPageHeader, adminCardClass } from '@/components/admin/AdminUi';
import { useLocale } from '@/lib/locale-context';
import { t, tf } from '@/lib/i18n';

const THREADS = [
  {
    id: 1,
    name: 'Emma L.',
    preview: 'Is the serum still in stock?',
    platform: 'Instagram',
    time: '12m',
  },
  {
    id: 2,
    name: 'Marcus J.',
    preview: 'Loved the reel — link please!',
    platform: 'TikTok',
    time: '1h',
  },
  {
    id: 3,
    name: 'Astrid K.',
    preview: 'Can I get a refund on my order?',
    platform: 'Instagram',
    time: '3h',
  },
];

export default function SocialInboxPanel() {
  const { locale } = useLocale();
  const { activeWorkspace } = useWorkspace();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t('socialInboxEyebrow', locale)}
        title={t('socialInboxTitle', locale)}
        description={tf('socialInboxSub', locale, { workspace: activeWorkspace.name })}
      />

      <div className={`${adminCardClass} overflow-hidden`}>
        {THREADS.map((thread) => (
          <button
            key={thread.id}
            type="button"
            className="w-full flex items-center gap-3 px-5 py-4 border-b border-slate-100 last:border-0 hover:bg-slate-50/80 text-left min-h-[56px] transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
              <MessageCircle size={16} strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900 truncate">{thread.name}</p>
                <span className="text-[11px] font-medium text-slate-400 flex-shrink-0">
                  {thread.time}
                </span>
              </div>
              <p className="text-sm text-slate-500 truncate">{thread.preview}</p>
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                {thread.platform}
              </p>
            </div>
          </button>
        ))}
        {THREADS.length === 0 && (
          <div className="py-16 text-center text-slate-400">
            <Inbox size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold">{t('inboxZero', locale)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

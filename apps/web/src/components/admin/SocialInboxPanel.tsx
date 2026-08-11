'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Inbox, Send } from 'lucide-react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { AdminPageHeader, adminCardClass } from '@/components/admin/AdminUi';
import { InstagramIcon } from '@/components/icons/SocialBrandIcons';
import type { ConnectedSocialAccount } from '@/lib/mock-content-planner';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';

type DmMessage = {
  id: string;
  from: 'them' | 'you';
  text: string;
  time: string;
};

type DmThread = {
  id: string;
  name: string;
  handle: string;
  preview: string;
  time: string;
  unread: boolean;
  messages: DmMessage[];
};

const THREADS: DmThread[] = [
  {
    id: '1',
    name: 'Emma L.',
    handle: '@emmaloveskin',
    preview: 'Is the serum still in stock?',
    time: '12m',
    unread: true,
    messages: [
      {
        id: 'm1',
        from: 'them',
        text: 'Hey! Saw your story about the new serum 💕',
        time: '18m',
      },
      {
        id: 'm2',
        from: 'them',
        text: 'Is the serum still in stock?',
        time: '12m',
      },
    ],
  },
  {
    id: '2',
    name: 'Astrid K.',
    handle: '@astrid.k',
    preview: 'Can I get a refund on my order?',
    time: '3h',
    unread: true,
    messages: [
      {
        id: 'm1',
        from: 'them',
        text: 'Hi — I ordered last week but the shade was wrong.',
        time: '3h',
      },
      {
        id: 'm2',
        from: 'them',
        text: 'Can I get a refund on my order?',
        time: '3h',
      },
    ],
  },
  {
    id: '3',
    name: 'Noah Berg',
    handle: '@noahberg',
    preview: 'When does the next live drop?',
    time: 'Yesterday',
    unread: false,
    messages: [
      {
        id: 'm1',
        from: 'them',
        text: 'Loved the last reel — when does the next live drop?',
        time: 'Yesterday',
      },
      {
        id: 'm2',
        from: 'you',
        text: 'Thursday 19:00 — I’ll post the link in stories!',
        time: 'Yesterday',
      },
    ],
  },
];

/** Normalize a handle so the UI always shows a single leading @. */
function formatInstagramHandle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/^@+/, '');
  if (!cleaned) return null;
  return `@${cleaned}`;
}

/** Instagram DM inbox for the active workspace / social space. */
export default function SocialInboxPanel() {
  const { locale } = useLocale();
  const { activeWorkspace } = useWorkspace();
  const [activeId, setActiveId] = useState(THREADS[0]?.id ?? null);
  const [draft, setDraft] = useState('');

  // Instagram account connected to this social space (workspace).
  const { data: socials } = useQuery<{ accounts: ConnectedSocialAccount[] }>({
    queryKey: ['planner-socials'],
    queryFn: async () => {
      const r = await fetch('/api/planner/socials');
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
  });

  const instagramHandle = useMemo(() => {
    const igConnected = socials?.accounts?.some(
      (a) => a.platform === 'instagram' && a.connected
    );
    if (!igConnected) return null;
    // Show the @handle for the Instagram account on this social space.
    const ig = socials?.accounts?.find((a) => a.platform === 'instagram');
    return (
      formatInstagramHandle(activeWorkspace.handle) ||
      formatInstagramHandle(ig?.handle) ||
      null
    );
  }, [socials?.accounts, activeWorkspace.handle]);

  const active = useMemo(
    () => THREADS.find((thread) => thread.id === activeId) ?? null,
    [activeId]
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t('socialInboxEyebrow', locale)}
        title={t('socialInboxTitle', locale)}
        description={
          instagramHandle ?? t('instagramNotConnected', locale)
        }
      />

      <div
        className={`${adminCardClass} overflow-hidden grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] min-h-[520px]`}
      >
        {/* Thread list — Instagram DMs only */}
        <aside className="border-b lg:border-b-0 lg:border-r border-slate-100 flex flex-col min-h-0">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white">
              <InstagramIcon size={14} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {t('instagramDmsTitle', locale)}
              </p>
              <p className="text-[11px] text-slate-400 truncate font-mono">
                {instagramHandle ?? t('instagramDmsHint', locale)}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {THREADS.length === 0 ? (
              <div className="py-16 text-center text-slate-400 px-4">
                <Inbox size={28} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold">{t('inboxZero', locale)}</p>
              </div>
            ) : (
              THREADS.map((thread) => {
                const selected = thread.id === activeId;
                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => setActiveId(thread.id)}
                    className={`w-full flex items-start gap-3 px-4 py-3.5 border-b border-slate-50 last:border-0 text-left min-h-[56px] transition-colors ${
                      selected ? 'bg-[#E9D5FF]/35' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0 text-xs font-bold">
                      {thread.name
                        .split(' ')
                        .map((p) => p[0])
                        .join('')
                        .slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-sm truncate ${
                            thread.unread
                              ? 'font-extrabold text-slate-900'
                              : 'font-semibold text-slate-800'
                          }`}
                        >
                          {thread.name}
                        </p>
                        <span className="text-[11px] font-medium text-slate-400 flex-shrink-0">
                          {thread.time}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">{thread.handle}</p>
                      <p
                        className={`text-sm truncate mt-0.5 ${
                          thread.unread ? 'text-slate-700 font-medium' : 'text-slate-500'
                        }`}
                      >
                        {thread.preview}
                      </p>
                    </div>
                    {thread.unread ? (
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-[#F472B6] flex-shrink-0" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Conversation */}
        <section className="flex flex-col min-h-[360px]">
          {active ? (
            <>
              <header className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                  {active.name
                    .split(' ')
                    .map((p) => p[0])
                    .join('')
                    .slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{active.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{active.handle} · Instagram DM</p>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-[#FAFAFA]/80">
                {active.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.from === 'you' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        msg.from === 'you'
                          ? 'bg-[#2B2568] text-white rounded-br-md'
                          : 'bg-white border border-slate-200/80 text-slate-800 rounded-bl-md'
                      }`}
                    >
                      <p>{msg.text}</p>
                      <p
                        className={`text-[10px] mt-1 ${
                          msg.from === 'you' ? 'text-white/60' : 'text-slate-400'
                        }`}
                      >
                        {msg.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <form
                className="flex items-center gap-2 px-4 py-3 border-t border-slate-100"
                onSubmit={(e) => {
                  e.preventDefault();
                  setDraft('');
                }}
              >
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t('instagramDmReplyPlaceholder', locale)}
                  className="flex-1 h-11 min-h-[44px] rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#F472B6] focus:ring-2 focus:ring-[#F472B6]/20"
                />
                <button
                  type="submit"
                  disabled={!draft.trim()}
                  className="inline-flex items-center justify-center h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-[#2B2568] text-white hover:bg-[#1a1848] disabled:opacity-40 transition-colors"
                  aria-label={t('instagramDmSend', locale)}
                >
                  <Send size={16} strokeWidth={2} />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 px-6">
              <Inbox size={28} className="mb-2 opacity-40" />
              <p className="text-sm font-semibold">{t('inboxZero', locale)}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

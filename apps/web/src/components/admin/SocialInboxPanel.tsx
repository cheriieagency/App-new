'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Inbox, Loader2, RefreshCw, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/context/WorkspaceContext';
import { AdminPageHeader, adminCardClass } from '@/components/admin/AdminUi';
import ConnectSocialsEmpty from '@/components/admin/ConnectSocialsEmpty';
import { InstagramIcon } from '@/components/icons/SocialBrandIcons';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { useConnectedSocials } from '@/hooks/useConnectedSocials';
import { refreshMetaSync, useMetaSync } from '@/hooks/useMetaSync';

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

/** Normalize a handle so the UI always shows a single leading @. */
function formatInstagramHandle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/^@+/, '');
  if (!cleaned) return null;
  return `@${cleaned}`;
}

/**
 * Instagram inbox — currently powered by comments on recent media
 * (Meta Graph). Real Instagram Messaging DMs are not wired yet.
 */
export default function SocialInboxPanel() {
  const { locale } = useLocale();
  const queryClient = useQueryClient();
  const { activeWorkspace } = useWorkspace();
  const { hasInstagram, accounts, isLoading } = useConnectedSocials();
  const { data: metaSync, isFetching, isError, error } = useMetaSync(hasInstagram);
  const [localThreads, setLocalThreads] = useState<DmThread[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);

  const syncedThreads = useMemo<DmThread[]>(
    () =>
      (metaSync?.snapshot?.inbox_threads ?? []).map((thread) => ({
        id: thread.id,
        name: thread.name,
        handle: thread.handle,
        preview: thread.preview,
        time: thread.time,
        unread: thread.unread,
        messages: thread.messages,
      })),
    [metaSync?.snapshot?.inbox_threads]
  );

  const threads = localThreads ?? syncedThreads;

  useEffect(() => {
    setLocalThreads(null);
  }, [metaSync?.snapshot?.synced_at]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!activeId && threads.length > 0) setActiveId(threads[0].id);
  }, [activeId, threads]);

  const instagramHandle = useMemo(() => {
    if (!hasInstagram) return null;
    const ig = accounts.find((a) => a.platform === 'instagram');
    const synced = metaSync?.snapshot?.instagram?.username;
    return (
      formatInstagramHandle(synced) ||
      formatInstagramHandle(ig?.handle) ||
      formatInstagramHandle(activeWorkspace.handle) ||
      null
    );
  }, [
    hasInstagram,
    accounts,
    activeWorkspace.handle,
    metaSync?.snapshot?.instagram?.username,
  ]);

  const active = useMemo(
    () => threads.find((thread) => thread.id === activeId) ?? null,
    [activeId, threads]
  );

  const syncError =
    metaSync?.error ||
    (isError ? (error instanceof Error ? error.message : 'Sync failed') : null);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await refreshMetaSync();
      queryClient.setQueryData(['meta-sync'], res);
      setLocalThreads(null);
      if (!res.synced) {
        toast.error(res.error || 'Could not refresh Instagram inbox');
      } else {
        const count = res.snapshot?.inbox_threads?.length ?? 0;
        toast.success(
          count > 0
            ? `Synced ${count} comment thread${count === 1 ? '' : 's'}`
            : 'Synced — no comments on recent posts yet'
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  const onSend = async (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!active || !text || sending) return;
    setSending(true);
    try {
      const r = await fetch('/api/meta/inbox/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId: active.id, message: text }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(
          json.message ||
            json.error ||
            'Reply failed — reconnect Instagram with comment permissions'
        );
      }
      const replyId = String(json.reply_id || `local-${Date.now()}`);
      setLocalThreads((prev) => {
        const base = prev ?? syncedThreads;
        return base.map((thread) =>
          thread.id === active.id
            ? {
                ...thread,
                unread: false,
                preview: text.slice(0, 120),
                messages: [
                  ...thread.messages,
                  { id: replyId, from: 'you', text, time: 'now' },
                ],
              }
            : thread
        );
      });
      if (json.snapshot) {
        queryClient.setQueryData(['meta-sync'], {
          synced: true,
          snapshot: json.snapshot,
        });
      }
      setDraft('');
      toast.success('Reply sent');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send reply');
    } finally {
      setSending(false);
    }
  };

  if (!isLoading && !hasInstagram) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow={t('socialInboxEyebrow', locale)}
          title={t('socialInboxTitle', locale)}
          description={t('instagramNotConnected', locale)}
        />
        <ConnectSocialsEmpty />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t('socialInboxEyebrow', locale)}
        title={t('socialInboxTitle', locale)}
        description={instagramHandle ?? t('instagramNotConnected', locale)}
        actions={
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={refreshing || isFetching}
            className="inline-flex items-center gap-1.5 h-11 min-h-[44px] px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {refreshing || isFetching ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            Sync
          </button>
        }
      />

      {syncError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">
          Instagram sync issue: {syncError}. Try Sync, or reconnect under Settings →
          Socials (comment permissions required).
        </div>
      ) : null}

      <div
        className={`${adminCardClass} overflow-hidden grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] min-h-[520px]`}
      >
        <aside className="border-b lg:border-b-0 lg:border-r border-slate-100 flex flex-col min-h-0">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white">
              <InstagramIcon size={14} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">
                Instagram comments
              </p>
              <p className="text-[11px] text-slate-400 truncate font-mono">
                {instagramHandle ?? 'Connected account'}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isFetching && threads.length === 0 ? (
              <div className="py-16 text-center text-slate-400 px-4">
                <Loader2 size={22} className="mx-auto mb-2 animate-spin opacity-50" />
                <p className="text-sm font-semibold">Syncing Instagram…</p>
              </div>
            ) : threads.length === 0 ? (
              <div className="py-16 text-center text-slate-400 px-4 space-y-2">
                <Inbox size={28} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold">No comments on recent posts yet</p>
                <p className="text-[11px] font-medium text-slate-400 leading-relaxed">
                  Inbox shows comments on your latest Instagram media. Private DMs are not
                  connected yet. Tap Sync after new comments arrive.
                </p>
              </div>
            ) : (
              threads.map((thread) => {
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
                    {thread.unread && (
                      <span className="mt-2 h-2 w-2 rounded-full bg-[#F472B6] flex-shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="flex flex-col min-h-[320px]">
          {active ? (
            <>
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold">
                  {active.name
                    .split(' ')
                    .map((p) => p[0])
                    .join('')
                    .slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{active.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{active.handle}</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {active.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.from === 'you' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                        msg.from === 'you'
                          ? 'bg-[#2B2568] text-white'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      <p className="leading-relaxed">{msg.text}</p>
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
                className="border-t border-slate-100 p-3 flex items-center gap-2"
                onSubmit={(e) => void onSend(e)}
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Reply to this comment…"
                  className="flex-1 h-11 min-h-[44px] rounded-xl border border-slate-200 px-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#2B2568]/15"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || sending}
                  className="h-11 min-h-[44px] w-11 rounded-xl bg-[#2B2568] text-white inline-flex items-center justify-center hover:bg-[#1a1848] disabled:opacity-40"
                  aria-label={t('send', locale)}
                >
                  {sending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 px-6 text-center">
              <div>
                <Inbox size={28} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold">
                  Select a comment thread or tap Sync
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

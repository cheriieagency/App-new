'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Inbox, Loader2, MessageCircle, RefreshCw, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/context/WorkspaceContext';
import { AdminPageHeader, adminCardClass } from '@/components/admin/AdminUi';
import ConnectSocialsEmpty from '@/components/admin/ConnectSocialsEmpty';
import { InstagramIcon } from '@/components/icons/SocialBrandIcons';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { useConnectedSocials } from '@/hooks/useConnectedSocials';
import { refreshMetaSync, useMetaSync } from '@/hooks/useMetaSync';

type InboxChannel = 'all' | 'comment' | 'dm';

type DmMessage = {
  id: string;
  from: 'them' | 'you';
  text: string;
  time: string;
};

type DmThread = {
  id: string;
  channel: 'comment' | 'dm';
  name: string;
  handle: string;
  preview: string;
  time: string;
  unread: boolean;
  recipient_id?: string;
  page_id?: string;
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
 * Instagram inbox — comments on recent media + private DMs via Messaging API.
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
  const [channelFilter, setChannelFilter] = useState<InboxChannel>('all');

  const syncedThreads = useMemo<DmThread[]>(
    () =>
      (metaSync?.snapshot?.inbox_threads ?? []).map((thread) => ({
        id: thread.id,
        channel: (thread.channel === 'dm' ? 'dm' : 'comment') as 'comment' | 'dm',
        name: thread.name,
        handle: thread.handle,
        preview: thread.preview,
        time: thread.time,
        unread: thread.unread,
        recipient_id: thread.recipient_id,
        page_id: thread.page_id,
        messages: thread.messages,
      })),
    [metaSync?.snapshot?.inbox_threads]
  );

  const allThreads = localThreads ?? syncedThreads;
  const threads = useMemo(() => {
    if (channelFilter === 'all') return allThreads;
    return allThreads.filter((t) => t.channel === channelFilter);
  }, [allThreads, channelFilter]);

  const dmCount = allThreads.filter((t) => t.channel === 'dm').length;
  const commentCount = allThreads.filter((t) => t.channel === 'comment').length;

  useEffect(() => {
    setLocalThreads(null);
  }, [metaSync?.snapshot?.synced_at]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (threads.length === 0) {
      setActiveId(null);
      return;
    }
    if (!activeId || !threads.some((t) => t.id === activeId)) {
      setActiveId(threads[0].id);
    }
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

  const inboxStatus = metaSync?.snapshot?.inbox_status;
  const syncError =
    metaSync?.error ||
    (isError ? (error instanceof Error ? error.message : 'Sync failed') : null);
  const dmPermissionIssue = Boolean(inboxStatus?.needs_reconnect_for_dms);
  const reconnectHref =
    '/api/auth/meta/login?target=both&workspaceId=' +
    encodeURIComponent(activeWorkspace.id || 'default-my-workspace');

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await refreshMetaSync();
      queryClient.setQueryData(['meta-sync'], res);
      setLocalThreads(null);
      if (!res.synced) {
        toast.error(res.error || 'Could not refresh Instagram inbox');
      } else {
        const list = res.snapshot?.inbox_threads ?? [];
        const dms = list.filter((t) => t.channel === 'dm').length;
        const comments = list.length - dms;
        const status = res.snapshot?.inbox_status;
        if (status?.needs_reconnect_for_dms) {
          toast.error(
            status.dm_error ||
              'DMs need messaging permissions — reconnect Instagram'
          );
        } else {
          toast.success(
            list.length > 0
              ? `Synced ${dms} DM${dms === 1 ? '' : 's'} · ${comments} comment${comments === 1 ? '' : 's'}`
              : status?.media_scanned === 0
                ? 'Synced — no recent posts (comments) or DMs yet'
                : 'Synced — no DMs or comments on recent posts yet'
          );
        }
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
        body: JSON.stringify({
          threadId: active.id,
          commentId: active.id,
          channel: active.channel,
          message: text,
          recipientId: active.recipient_id,
          pageId: active.page_id,
        }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(
          json.message ||
            json.error ||
            'Reply failed — reconnect Instagram with comment + messaging permissions'
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
      toast.success(active.channel === 'dm' ? 'DM sent' : 'Comment reply sent');
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
          Socials (comment + messaging permissions required).
        </div>
      ) : null}

      {dmPermissionIssue ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-950 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div className="space-y-1 min-w-0">
            <p>
              Instagram DMs are blocked — this account is missing messaging
              permissions
              {inboxStatus?.missing_scopes?.length
                ? ` (${inboxStatus.missing_scopes.join(', ')})`
                : ''}
              .
            </p>
            <p className="font-medium text-rose-800/90">
              {inboxStatus?.dm_error ||
                'Reconnect and approve Instagram messaging + Page messaging.'}
            </p>
          </div>
          <a
            href={reconnectHref}
            className="inline-flex items-center justify-center h-11 min-h-[44px] px-4 rounded-xl bg-[#2B2568] text-white text-xs font-extrabold whitespace-nowrap"
          >
            Reconnect Instagram
          </a>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(
          [
            { key: 'all', label: `All (${allThreads.length})` },
            { key: 'dm', label: `DMs (${dmCount})` },
            { key: 'comment', label: `Comments (${commentCount})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setChannelFilter(tab.key)}
            className={`min-h-11 px-3.5 rounded-xl text-sm font-semibold border transition-colors ${
              channelFilter === tab.key
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

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
                Instagram inbox
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
                <p className="text-sm font-semibold">
                  {channelFilter === 'dm'
                    ? 'No DMs yet'
                    : channelFilter === 'comment'
                      ? 'No comments on recent posts yet'
                      : 'Inbox is empty'}
                </p>
                <p className="text-[11px] font-medium text-slate-400 leading-relaxed">
                  {dmPermissionIssue
                    ? 'DMs need a reconnect with messaging permissions (see banner above). Comments appear once you have recent posts with comments.'
                    : inboxStatus?.media_scanned === 0
                      ? 'No recent Instagram posts found — comments will show after you publish. DMs appear when someone messages @' +
                        (instagramHandle?.replace(/^@/, '') || 'your account') +
                        '.'
                      : 'Shows Instagram comments on recent posts and private DMs. Tap Sync after new activity.'}
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
                      <p className="text-[11px] text-slate-400 truncate inline-flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center h-5 px-1.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wide ${
                            thread.channel === 'dm'
                              ? 'bg-slate-900 text-white'
                              : 'bg-pink-50 text-[#DB2777]'
                          }`}
                        >
                          {thread.channel === 'dm' ? 'DM' : 'Comment'}
                        </span>
                        {thread.handle}
                      </p>
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
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {active.name}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate inline-flex items-center gap-1.5">
                    {active.channel === 'dm' ? (
                      <MessageCircle size={12} className="text-slate-500" />
                    ) : null}
                    {active.channel === 'dm' ? 'Direct message' : 'Comment'} ·{' '}
                    {active.handle}
                  </p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {active.messages.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">
                    No messages in this thread yet
                  </p>
                ) : (
                  active.messages.map((msg) => (
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
                  ))
                )}
              </div>
              <form
                className="border-t border-slate-100 p-3 flex items-center gap-2"
                onSubmit={(e) => void onSend(e)}
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={
                    active.channel === 'dm'
                      ? 'Reply to this DM…'
                      : 'Reply to this comment…'
                  }
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
                  Select a thread or tap Sync
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

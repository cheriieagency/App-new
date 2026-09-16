'use client';

/**
 * Unified Social Inbox — Instagram (Meta sync) + TikTok DMs.
 * Ultra-clean toolbar + conversation list + chat thread.
 */

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ExternalLink,
  Heart,
  Inbox,
  Loader2,
  MoreHorizontal,
  Paperclip,
  Pencil,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/context/WorkspaceContext';
import { adminCardClass } from '@/components/admin/AdminUi';
import ConnectSocialsEmpty from '@/components/admin/ConnectSocialsEmpty';
import {
  InstagramIcon,
  TikTokIcon,
} from '@/components/icons/SocialBrandIcons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLocale } from '@/lib/locale-context';
import { t, tf } from '@/lib/i18n';
import { useConnectedSocials } from '@/hooks/useConnectedSocials';
import { refreshMetaSync, useLiveMetaInboxSync } from '@/hooks/useMetaSync';
import { useTikTokInbox } from '@/hooks/useTikTokInbox';
import DMAutomationPanel from '@/components/admin/inbox/DMAutomationPanel';

type InboxMainTab = 'inbox' | 'automations';
type InboxChannel = 'all' | 'comment' | 'dm';
type InboxPlatform = 'instagram' | 'tiktok';
type InboxPlatformFilter = 'all' | InboxPlatform;

type DmMessage = {
  id: string;
  from: 'them' | 'you';
  text: string;
  time: string;
  media_url?: string | null;
  liked?: boolean;
};

type DmThread = {
  id: string;
  platform: InboxPlatform;
  channel: 'comment' | 'dm';
  name: string;
  handle: string;
  preview: string;
  time: string;
  unread: boolean;
  recipient_id?: string;
  page_id?: string;
  conversation_id?: string;
  media_id?: string;
  avatar_url?: string | null;
  messages: DmMessage[];
};

/** Keep Analytics + live Inbox caches aligned after mutations / sync. */
function setMetaSyncCaches(
  queryClient: {
    setQueryData: (key: unknown[], data: unknown) => void;
  },
  data: unknown
) {
  queryClient.setQueryData(['meta-sync'], data);
  queryClient.setQueryData(['meta-sync', 'live-inbox'], data);
}

/** Normalize a handle so the UI always shows a single leading @. */
function formatHandle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/^@+/, '');
  if (!cleaned) return null;
  return `@${cleaned}`;
}

function isTikTokThread(thread: DmThread): boolean {
  return thread.platform === 'tiktok' || thread.id.startsWith('tt:dm:');
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function profileUrl(thread: DmThread): string {
  const handle = thread.handle.replace(/^@+/, '');
  if (isTikTokThread(thread)) {
    return `https://www.tiktok.com/@${encodeURIComponent(handle)}`;
  }
  return `https://www.instagram.com/${encodeURIComponent(handle)}/`;
}

/** Resolve the Graph comment id for a bubble (root uses thread id). */
function resolveCommentId(thread: DmThread, msg: DmMessage): string | null {
  if (msg.id.startsWith('local-')) return null;
  if (msg.id === `${thread.id}-m1` || msg.id.endsWith('-m1')) return thread.id;
  return msg.id;
}

function Avatar({
  name,
  url,
  size = 40,
}: {
  name: string;
  url?: string | null;
  size?: number;
}) {
  return (
    <div
      className="rounded-full bg-[#F0EFEA] flex items-center justify-center text-[#8A857D] font-medium overflow-hidden flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.28 }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        initials(name)
      )}
    </div>
  );
}

/**
 * Unified Social Inbox — Instagram comments/DMs + TikTok DMs.
 */
export default function SocialInboxPanel() {
  const { locale } = useLocale();
  const queryClient = useQueryClient();
  const { activeWorkspace } = useWorkspace();
  const { hasInstagram, hasTikTok, accounts, isLoading } = useConnectedSocials();
  const { data: metaSync, isFetching, isError, error } = useLiveMetaInboxSync(
    hasInstagram
  );
  const {
    data: tiktokInbox,
    isFetching: tiktokFetching,
    refetch: refetchTikTok,
  } = useTikTokInbox(true, { live: true });
  const tiktokMock = Boolean(tiktokInbox?.mock || tiktokInbox?.demo);
  const hasTikTokInbox =
    hasTikTok || tiktokMock || (tiktokInbox?.threads?.length ?? 0) > 0;
  const hasAnyInboxChannel = hasInstagram || hasTikTokInbox;

  const [localThreads, setLocalThreads] = useState<DmThread[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] =
    useState<InboxPlatformFilter>('all');
  const [channelFilter, setChannelFilter] = useState<InboxChannel>('all');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [commentBusyId, setCommentBusyId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const didMountSync = useRef(false);

  const [mainTab, setMainTab] = useState<InboxMainTab>(() => {
    if (typeof window === 'undefined') return 'inbox';
    const sub = new URLSearchParams(window.location.search).get('sub');
    return sub === 'automations' ? 'automations' : 'inbox';
  });

  // Entering Social Inbox → force a fresh Graph pull so threads aren't stale.
  useEffect(() => {
    if (didMountSync.current) return;
    if (!hasInstagram && !hasTikTokInbox) return;
    didMountSync.current = true;
    void (async () => {
      try {
        if (hasInstagram) {
          const res = await refreshMetaSync();
          setMetaSyncCaches(queryClient, res);
        }
        if (hasTikTokInbox) await refetchTikTok();
        setLocalThreads(null);
      } catch (err) {
        console.warn('[SocialInboxPanel] mount sync failed', err);
      }
    })();
  }, [hasInstagram, hasTikTokInbox, queryClient, refetchTikTok]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('sub') === 'automations') setMainTab('automations');
  }, []);

  useEffect(() => {
    if (platformFilter === 'instagram' && !hasInstagram) {
      setPlatformFilter(hasTikTokInbox ? 'tiktok' : 'all');
    } else if (platformFilter === 'tiktok' && !hasTikTokInbox) {
      setPlatformFilter(hasInstagram ? 'instagram' : 'all');
    }
  }, [hasInstagram, hasTikTokInbox, platformFilter]);

  useEffect(() => {
    if (platformFilter === 'tiktok' && channelFilter === 'comment') {
      setChannelFilter('all');
    }
  }, [platformFilter, channelFilter]);

  const igThreads = useMemo<DmThread[]>(
    () =>
      (metaSync?.snapshot?.inbox_threads ?? []).map((thread) => ({
        id: thread.id,
        platform: 'instagram' as const,
        channel: (thread.channel === 'dm' ? 'dm' : 'comment') as
          | 'comment'
          | 'dm',
        name: thread.name,
        handle: thread.handle,
        preview: thread.preview,
        time: thread.time,
        unread: thread.unread,
        recipient_id: thread.recipient_id,
        page_id: thread.page_id,
        media_id: thread.media_id,
        messages: thread.messages,
      })),
    [metaSync?.snapshot?.inbox_threads]
  );

  const ttThreads = useMemo<DmThread[]>(
    () =>
      (tiktokInbox?.threads ?? []).map((thread) => ({
        id: thread.id,
        platform: 'tiktok' as const,
        channel: 'dm' as const,
        name: thread.name,
        handle: thread.handle,
        preview: thread.preview,
        time: thread.time,
        unread: thread.unread,
        recipient_id: thread.recipient_id,
        conversation_id: thread.conversation_id,
        avatar_url: thread.avatar_url,
        messages: thread.messages,
      })),
    [tiktokInbox?.threads]
  );

  const syncedThreads = useMemo(
    () => [...ttThreads, ...igThreads],
    [ttThreads, igThreads]
  );

  const allThreads = localThreads ?? syncedThreads;

  const platformScopedThreads = useMemo(() => {
    if (platformFilter === 'all') return allThreads;
    return allThreads.filter((t) => t.platform === platformFilter);
  }, [allThreads, platformFilter]);

  const channelScopedThreads = useMemo(() => {
    if (channelFilter === 'all') return platformScopedThreads;
    return platformScopedThreads.filter((t) => t.channel === channelFilter);
  }, [platformScopedThreads, channelFilter]);

  const threads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return channelScopedThreads;
    return channelScopedThreads.filter((t) => {
      const hay = `${t.name} ${t.handle} ${t.preview}`.toLowerCase();
      return hay.includes(q);
    });
  }, [channelScopedThreads, searchQuery]);

  const showCommentFilter = platformFilter !== 'tiktok';
  const showPlatformSwitcher = hasInstagram && hasTikTokInbox;

  useEffect(() => {
    setLocalThreads(null);
  }, [metaSync?.snapshot?.synced_at, tiktokInbox?.threads]);

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
      formatHandle(synced) ||
      formatHandle(ig?.handle) ||
      formatHandle(activeWorkspace.handle) ||
      null
    );
  }, [
    hasInstagram,
    accounts,
    activeWorkspace.handle,
    metaSync?.snapshot?.instagram?.username,
  ]);

  const tiktokHandle = useMemo(() => {
    if (!hasTikTokInbox) return null;
    if (tiktokMock && !hasTikTok) return '@tiktok (demo)';
    const tt = accounts.find((a) => a.platform === 'tiktok');
    return formatHandle(tt?.handle || tt?.display_name) || '@tiktok';
  }, [hasTikTokInbox, hasTikTok, tiktokMock, accounts]);

  const handleBadge = useMemo(() => {
    if (platformFilter === 'instagram') return instagramHandle;
    if (platformFilter === 'tiktok') return tiktokHandle;
    return instagramHandle || tiktokHandle;
  }, [platformFilter, instagramHandle, tiktokHandle]);

  const active = useMemo(
    () => threads.find((thread) => thread.id === activeId) ?? null,
    [activeId, threads]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeId, active?.messages.length]);

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
      const jobs: Promise<unknown>[] = [];
      if (hasInstagram) {
        jobs.push(
          refreshMetaSync().then((res) => {
            setMetaSyncCaches(queryClient, res);
            return res;
          })
        );
      }
      if (hasTikTok || tiktokMock) {
        jobs.push(refetchTikTok());
      }
      const results = await Promise.all(jobs);
      setLocalThreads(null);

      if (hasInstagram) {
        const res = results[0] as Awaited<ReturnType<typeof refreshMetaSync>>;
        if (res && 'synced' in res && !res.synced) {
          toast.error(res.error || 'Could not refresh Instagram inbox');
        } else if (res && 'snapshot' in res) {
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
              `Synced IG ${dms} DM${dms === 1 ? '' : 's'} · ${comments} comment${comments === 1 ? '' : 's'}${
                hasTikTokInbox ? ' · TikTok refreshed' : ''
              }`
            );
          }
        }
      } else if (hasTikTokInbox) {
        toast.success(tiktokMock ? 'Demo TikTok inbox refreshed' : 'TikTok inbox refreshed');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  const onAiQuickReply = async () => {
    if (!active || aiLoading) return;
    const lastThem = [...active.messages]
      .reverse()
      .find((m) => m.from === 'them');
    const context =
      lastThem?.text || active.preview || 'a fan message on social media';
    setAiLoading(true);
    try {
      const r = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          platform: active.platform,
          tone: 'friendly',
          prompt: `Write a short, warm direct-message reply (1-2 sentences, no hashtags) to this ${active.channel === 'dm' ? 'DM' : 'comment'} from ${active.handle}: "${context}"`,
        }),
      });
      const json = (await r.json().catch(() => ({}))) as {
        caption?: string;
        message?: string;
        error?: string;
      };
      if (!r.ok) {
        throw new Error(json.message || json.error || 'AI reply failed');
      }
      const suggestion = (json.caption || '').trim();
      if (!suggestion) throw new Error('Empty AI suggestion');
      setDraft(suggestion);
      toast.success('AI reply drafted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'AI reply failed');
    } finally {
      setAiLoading(false);
    }
  };

  const runCommentAction = async (input: {
    action: 'delete' | 'like' | 'unlike' | 'edit';
    msg: DmMessage;
    message?: string;
  }) => {
    if (!active || isTikTokThread(active)) return;

    const isDm = active.channel === 'dm';
    const isComment = active.channel === 'comment';
    if (!isDm && !isComment) return;

    // Instagram Graph cannot edit other people's comments — only our replies.
    if (
      isComment &&
      input.action === 'edit' &&
      input.msg.from !== 'you'
    ) {
      toast.message(
        "Instagram doesn't allow editing fans' comments. Reply or delete instead."
      );
      return;
    }

    // DMs: only moderate your own bubbles for edit/delete; like works on either side.
    if (
      isDm &&
      (input.action === 'edit' || input.action === 'delete') &&
      input.msg.from !== 'you'
    ) {
      toast.message(
        input.action === 'edit'
          ? "You can only edit your own DMs."
          : "You can only remove your own DMs from Inbox."
      );
      return;
    }

    const commentId = isComment ? resolveCommentId(active, input.msg) : null;
    if (isComment && !commentId) {
      toast.message('Wait for the comment to sync before moderating.');
      return;
    }
    if (isDm && input.msg.id.startsWith('local-')) {
      toast.message('Wait for the message to send before moderating.');
      return;
    }

    setCommentBusyId(input.msg.id);
    try {
      const endpoint = isDm ? '/api/meta/inbox/dm' : '/api/meta/inbox/comment';
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(
          isDm
            ? {
                action: input.action,
                threadId: active.id,
                messageId: input.msg.id,
                message: input.message,
                recipientId: active.recipient_id,
                pageId: active.page_id,
              }
            : {
                action: input.action,
                commentId,
                threadId: active.id,
                message: input.message,
              }
        ),
      });
      const json = (await r.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
        notice?: string | null;
        snapshot?: { inbox_threads?: DmThread[] };
        reply_id?: string;
        replacement_id?: string;
      };
      if (!r.ok) {
        throw new Error(json.message || json.error || `${input.action} failed`);
      }

      if (json.snapshot?.inbox_threads) {
        const prev = queryClient.getQueryData(['meta-sync', 'live-inbox'])
          ?? queryClient.getQueryData(['meta-sync']);
        const base =
          prev && typeof prev === 'object'
            ? (prev as Record<string, unknown>)
            : {};
        const snap =
          base.snapshot && typeof base.snapshot === 'object'
            ? (base.snapshot as Record<string, unknown>)
            : {};
        setMetaSyncCaches(queryClient, {
          ...base,
          snapshot: {
            ...snap,
            inbox_threads: json.snapshot.inbox_threads,
          },
        });
        setLocalThreads(null);
        if (
          isComment &&
          input.action === 'delete' &&
          commentId === active.id &&
          activeId === active.id
        ) {
          setActiveId(null);
        }
      } else {
        const deletingRoot =
          isComment &&
          input.action === 'delete' &&
          commentId === active.id;
        if (deletingRoot && activeId === active.id) setActiveId(null);
        setLocalThreads((prev) => {
          const base = prev ?? syncedThreads;
          if (input.action === 'delete') {
            if (deletingRoot) {
              return base.filter((t) => t.id !== active.id);
            }
            return base.map((t) =>
              t.id === active.id
                ? {
                    ...t,
                    messages: t.messages.filter((m) => m.id !== input.msg.id),
                  }
                : t
            );
          }
          if (input.action === 'like' || input.action === 'unlike') {
            return base.map((t) =>
              t.id === active.id
                ? {
                    ...t,
                    messages: t.messages.map((m) =>
                      m.id === input.msg.id
                        ? { ...m, liked: input.action === 'like' }
                        : m
                    ),
                  }
                : t
            );
          }
          if (input.action === 'edit' && input.message) {
            const nextId =
              json.replacement_id || json.reply_id || input.msg.id;
            return base.map((t) => {
              if (t.id !== active.id) return t;
              if (isDm) {
                const messages = t.messages
                  .filter((m) => m.id !== input.msg.id)
                  .concat([
                    {
                      id: nextId,
                      from: 'you' as const,
                      text: input.message!,
                      time: 'now',
                    },
                  ]);
                return {
                  ...t,
                  preview: input.message!.slice(0, 120),
                  messages,
                };
              }
              return {
                ...t,
                preview: input.message!.slice(0, 120),
                messages: t.messages.map((m) =>
                  m.id === input.msg.id
                    ? {
                        ...m,
                        id: nextId,
                        text: input.message!,
                        time: 'now',
                      }
                    : m
                ),
              };
            });
          }
          return base;
        });
      }

      if (json.notice) {
        toast.message(json.notice);
      } else if (input.action === 'delete') {
        toast.success(isDm ? 'Removed from Inbox' : 'Comment deleted');
      } else if (input.action === 'like') {
        toast.success(isDm ? 'Reaction sent' : 'Comment liked');
      } else if (input.action === 'unlike') {
        toast.success(isDm ? 'Reaction removed' : 'Like removed');
      } else if (input.action === 'edit') {
        toast.success(isDm ? 'Updated message sent' : 'Reply updated');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setCommentBusyId(null);
    }
  };

  const onEditComment = (msg: DmMessage) => {
    if (!active) return;
    if (msg.from !== 'you') {
      toast.message(
        active.channel === 'dm'
          ? 'You can only edit your own DMs.'
          : "Instagram doesn't allow editing fans' comments. Reply or delete instead."
      );
      return;
    }
    const next = window.prompt(
      active.channel === 'dm'
        ? 'Edit message (sends as a new DM — Instagram can’t edit in place)'
        : 'Edit your reply',
      msg.text
    );
    if (next == null) return;
    const trimmed = next.trim();
    if (!trimmed || trimmed === msg.text) return;
    void runCommentAction({ action: 'edit', msg, message: trimmed });
  };

  const onSend = async (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!active || !text || sending) return;

    const optimisticId = `local-${Date.now()}`;
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
                { id: optimisticId, from: 'you', text, time: 'now' },
              ],
            }
          : thread
      );
    });
    setDraft('');
    setSending(true);

    try {
      if (isTikTokThread(active)) {
        const r = await fetch('/api/inbox/tiktok/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-workspace-id': activeWorkspace.id || '',
          },
          credentials: 'include',
          body: JSON.stringify({
            workspaceId: activeWorkspace.id,
            threadId: active.id,
            conversationId: active.conversation_id,
            recipientId: active.recipient_id,
            message: text,
          }),
        });
        const json = (await r.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
          message_id?: string;
        };
        if (!r.ok) {
          throw new Error(
            json.message || json.error || 'TikTok DM failed — reconnect TikTok'
          );
        }
        if (json.message_id) {
          setLocalThreads((prev) => {
            const base = prev ?? syncedThreads;
            return base.map((thread) =>
              thread.id === active.id
                ? {
                    ...thread,
                    messages: thread.messages.map((m) =>
                      m.id === optimisticId
                        ? { ...m, id: String(json.message_id) }
                        : m
                    ),
                  }
                : thread
            );
          });
        }
        void queryClient.invalidateQueries({
          queryKey: ['tiktok-inbox', activeWorkspace.id],
        });
        toast.success('TikTok DM sent');
        return;
      }

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
      const replyId = String(json.reply_id || optimisticId);
      setLocalThreads((prev) => {
        const base = prev ?? syncedThreads;
        return base.map((thread) =>
          thread.id === active.id
            ? {
                ...thread,
                messages: thread.messages.map((m) =>
                  m.id === optimisticId ? { ...m, id: replyId } : m
                ),
              }
            : thread
        );
      });
      if (json.snapshot) {
        setMetaSyncCaches(queryClient, {
          synced: true,
          snapshot: json.snapshot,
        });
      }
      toast.success(active.channel === 'dm' ? 'DM sent' : 'Comment reply sent');
    } catch (err) {
      setLocalThreads((prev) => {
        const base = prev ?? syncedThreads;
        return base.map((thread) =>
          thread.id === active.id
            ? {
                ...thread,
                messages: thread.messages.filter((m) => m.id !== optimisticId),
              }
            : thread
        );
      });
      setDraft(text);
      toast.error(err instanceof Error ? err.message : 'Could not send reply');
    } finally {
      setSending(false);
    }
  };

  if (!isLoading && !hasAnyInboxChannel) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-playfair font-medium text-[28px] sm:text-[32px] text-[#2C2621] tracking-tight">
            Inbox
          </h1>
        </div>
        <p className="text-sm text-[#8A857D] font-medium -mt-4">
          Connect Instagram or TikTok to manage DMs here.
        </p>
        <ConnectSocialsEmpty />
      </div>
    );
  }

  const syncing = refreshing || isFetching || tiktokFetching;

  return (
    <div className="space-y-4">
      {/* Top toolbar — title, handle, sync */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="font-playfair font-medium text-[28px] sm:text-[32px] leading-none text-[#2C2621] tracking-tight">
            {t('socialInboxTitle', locale)}
          </h1>
          {handleBadge ? (
            <span className="inline-flex items-center h-8 px-2.5 rounded-full bg-[#F0EFEA] text-[#8A857D] text-xs font-mono font-medium truncate max-w-[200px]">
              {handleBadge}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 rounded-xl bg-[#F0EFEA]">
            {(
              [
                { key: 'inbox' as const, label: t('socialInboxTitle', locale), icon: Inbox },
                { key: 'automations' as const, label: t('inboxTabAutomations', locale), icon: Zap },
              ] as const
            ).map(({ key, label, icon: Icon }) => {
              const on = mainTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setMainTab(key);
                    if (typeof window !== 'undefined') {
                      const params = new URLSearchParams(window.location.search);
                      params.set('tab', 'inbox');
                      if (key === 'automations') params.set('sub', 'automations');
                      else params.delete('sub');
                      window.history.replaceState(
                        {},
                        '',
                        `${window.location.pathname}?${params.toString()}`
                      );
                    }
                  }}
                  className={`h-9 min-h-[36px] px-3 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                    on
                      ? 'bg-[#FFFFFF] text-[#2C2621] shadow-none'
                      : 'text-[#8A857D] hover:text-[#2C2621]'
                  }`}
                >
                  <Icon size={13} />
                  {label}
                </button>
              );
            })}
          </div>
          {mainTab === 'inbox' ? (
            <button
              type="button"
              onClick={() => void onRefresh()}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 h-9 min-h-[36px] px-3 rounded-xl border border-[#E6E3DB] bg-[#FFFFFF] text-xs font-medium text-[#2C2621] hover:bg-[#F0EFEA] disabled:opacity-50"
            >
              {syncing ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <RefreshCw size={13} />
              )}
              {t('inboxSync', locale)}
            </button>
          ) : null}
        </div>
      </div>

      {mainTab === 'automations' ? <DMAutomationPanel /> : null}

      {mainTab === 'inbox' && syncError && hasInstagram ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900">
          {tf('inboxSyncIssue', locale, { error: syncError })}
        </div>
      ) : null}

      {mainTab === 'inbox' && dmPermissionIssue ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-950 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <p className="min-w-0">
            {t('inboxDmNeedPerms', locale)}
            {inboxStatus?.missing_scopes?.length
              ? ` (${inboxStatus.missing_scopes.join(', ')})`
              : ''}
            .
          </p>
          <a
            href={reconnectHref}
            className="inline-flex items-center justify-center h-10 min-h-[40px] px-4 rounded-xl bg-[#2C3B2E] text-[#F9F8F6] text-xs font-medium whitespace-nowrap"
          >
            {t('inboxReconnectIg', locale)}
          </a>
        </div>
      ) : null}

      {mainTab === 'inbox' ? (
        <>
          {/* Single horizontal filter bar */}
          <div className="flex flex-col xl:flex-row xl:items-center gap-2.5 xl:gap-3">
            {showPlatformSwitcher || hasInstagram || hasTikTokInbox ? (
              <div
                className="inline-flex items-center p-1 rounded-xl bg-[#F0EFEA] border border-[#E6E3DB] self-start"
                role="tablist"
                aria-label={t('socialInboxTitle', locale)}
              >
                {(
                  [
                    {
                      key: 'all' as const,
                      label: t('inboxAll', locale),
                      show: showPlatformSwitcher,
                      icon: null,
                    },
                    {
                      key: 'instagram' as const,
                      label: 'Instagram',
                      show: hasInstagram,
                      icon: InstagramIcon,
                    },
                    {
                      key: 'tiktok' as const,
                      label: tiktokMock ? t('inboxTikTokDemo', locale) : 'TikTok',
                      show: hasTikTokInbox,
                      icon: TikTokIcon,
                    },
                  ] as const
                )
                  .filter((tab) => tab.show)
                  .map((tab) => {
                    const on = platformFilter === tab.key;
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        role="tab"
                        aria-selected={on}
                        onClick={() => setPlatformFilter(tab.key)}
                        className={`h-9 min-h-[36px] px-3 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-all ${
                          on
                            ? 'bg-[#FFFFFF] text-[#2C2621] shadow-none'
                            : 'text-[#8A857D] hover:text-[#2C2621]'
                        }`}
                      >
                        {Icon ? <Icon size={12} /> : null}
                        {tab.label}
                      </button>
                    );
                  })}
              </div>
            ) : null}

            <div className="inline-flex flex-wrap items-center gap-1.5 self-start">
              {(
                [
                  { key: 'all' as const, label: t('inboxAllMessages', locale), show: true },
                  { key: 'dm' as const, label: t('inboxDms', locale), show: true },
                  {
                    key: 'comment' as const,
                    label: t('inboxComments', locale),
                    show: showCommentFilter,
                  },
                ] as const
              )
                .filter((tab) => tab.show)
                .map((tab) => {
                  const on = channelFilter === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setChannelFilter(tab.key)}
                      className={`h-9 min-h-[36px] px-3 rounded-full text-xs font-medium border transition-colors ${
                        on
                          ? 'bg-[#2C3B2E] text-[#F9F8F6] border-[#2C3B2E]'
                          : 'bg-[#FFFFFF] text-[#8A857D] border-[#E6E3DB] hover:border-[#E6E3DB]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
            </div>

            <div className="relative flex-1 min-w-[180px] xl:max-w-xs xl:ml-auto">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A857D] pointer-events-none"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('inboxSearchConversations', locale)}
                className="w-full h-9 min-h-[36px] pl-9 pr-3 rounded-xl border border-[#E6E3DB] bg-[#FFFFFF] text-sm font-medium text-[#2C2621] placeholder:text-[#8A857D] focus:outline-none focus:ring-0 focus:border-[#E6E3DB]"
              />
            </div>
          </div>

          {/* Split pane — fixed height so thread list + chat scroll inside */}
          <div
            className={`${adminCardClass} overflow-hidden grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] h-[min(72vh,720px)] min-h-[480px]`}
          >
            <aside className="border-b lg:border-b-0 lg:border-r border-[#E6E3DB] flex flex-col min-h-0 max-h-[40vh] lg:max-h-none bg-[#FFFFFF] overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                {syncing && threads.length === 0 ? (
                  <div className="py-20 text-center text-[#8A857D] px-4">
                    <Loader2
                      size={20}
                      className="mx-auto mb-2 animate-spin opacity-50"
                    />
                    <p className="text-sm font-medium">{t('inboxSyncing', locale)}</p>
                  </div>
                ) : threads.length === 0 ? (
                  <div className="py-20 text-center text-[#8A857D] px-6 space-y-1.5">
                    <Inbox size={24} className="mx-auto mb-2 opacity-35" />
                    <p className="text-sm font-medium text-[#8A857D]">
                      {searchQuery.trim()
                        ? t('inboxNoMatches', locale)
                        : channelFilter === 'dm'
                          ? t('inboxNoDms', locale)
                          : channelFilter === 'comment'
                            ? t('inboxNoComments', locale)
                            : t('inboxEmpty', locale)}
                    </p>
                    <p className="text-[11px] text-[#8A857D] leading-relaxed">
                      {searchQuery.trim()
                        ? t('inboxTryAnotherSearch', locale)
                        : t('inboxTapSync', locale)}
                    </p>
                  </div>
                ) : (
                  threads.map((thread) => {
                    const selected = thread.id === activeId;
                    const tt = isTikTokThread(thread);
                    return (
                      <button
                        key={thread.id}
                        type="button"
                        onClick={() => setActiveId(thread.id)}
                        className={`relative w-full flex items-start gap-3 px-3.5 py-3 text-left min-h-[64px] transition-colors border-l-2 ${
                          selected
                            ? 'bg-[rgba(44,59,46,0.06)] border-l-[#2C3B2E]'
                            : 'border-l-transparent hover:bg-[#F0EFEA]/90'
                        }`}
                      >
                        <div className="relative flex-shrink-0">
                          <Avatar
                            name={thread.name}
                            url={thread.avatar_url}
                            size={40}
                          />
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full flex items-center justify-center ring-2 ring-[#FFFFFF] ${
                              tt
                                ? 'bg-[#2C3B2E] text-[#F9F8F6]'
                                : 'bg-gradient-to-br from-[#F58529] to-[#DD2A7B] text-[#F9F8F6]'
                            }`}
                            title={tt ? 'TikTok' : 'Instagram'}
                          >
                            {tt ? (
                              <TikTokIcon size={9} />
                            ) : (
                              <InstagramIcon size={9} />
                            )}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-baseline justify-between gap-2">
                            <p
                              className={`text-[13px] truncate ${
                                thread.unread
                                  ? 'font-medium text-[#2C2621]'
                                  : 'font-medium text-[#2C2621]'
                              }`}
                            >
                              {thread.name}
                            </p>
                            <span className="text-[11px] font-medium text-[#8A857D] flex-shrink-0 tabular-nums">
                              {thread.time}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#8A857D] truncate font-mono mt-0.5">
                            {formatHandle(thread.handle) || thread.handle}
                          </p>
                          <p
                            className={`text-[13px] truncate mt-1 ${
                              thread.unread
                                ? 'text-[#2C2621]'
                                : 'text-[#8A857D]'
                            }`}
                          >
                            {thread.preview}
                          </p>
                        </div>
                        {thread.unread ? (
                          <span className="mt-2 h-2 w-2 rounded-full bg-[#2C3B2E] flex-shrink-0" />
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            <section className="flex flex-col min-h-0 h-full overflow-hidden bg-[#F9F8F6]">
              {active ? (
                <>
                  <div className="px-4 sm:px-5 py-3.5 border-b border-[#E6E3DB] bg-[#FFFFFF] flex items-center gap-3 flex-shrink-0">
                    <Avatar
                      name={active.name}
                      url={active.avatar_url}
                      size={40}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-[#2C2621] truncate">
                          {active.name}
                        </p>
                        <span
                          className={`inline-flex items-center gap-1 h-5 px-1.5 rounded-md text-[10px] font-medium ${
                            isTikTokThread(active)
                              ? 'bg-[#2C3B2E] text-[#F9F8F6]'
                              : 'bg-gradient-to-r from-[#F58529] to-[#DD2A7B] text-[#F9F8F6]'
                          }`}
                        >
                          {isTikTokThread(active) ? (
                            <TikTokIcon size={10} />
                          ) : (
                            <InstagramIcon size={10} />
                          )}
                          {isTikTokThread(active) ? 'TikTok' : 'Instagram'}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#8A857D] font-mono truncate mt-0.5">
                        {formatHandle(active.handle) || active.handle}
                        <span className="text-[#8A857D] mx-1.5">·</span>
                        {active.channel === 'dm' ? t('inboxDms', locale) : t('inboxComment', locale)}
                      </p>
                    </div>
                    <a
                      href={profileUrl(active)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 h-9 min-h-[36px] px-3 rounded-xl border border-[#E6E3DB] bg-[#FFFFFF] text-xs font-medium text-[#8A857D] hover:bg-[#F0EFEA] flex-shrink-0"
                    >
                      {t('inboxProfile', locale)}
                      <ExternalLink size={12} />
                    </a>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-5 py-5 space-y-3">
                    {active.messages.length === 0 ? (
                      <p className="text-sm text-[#8A857D] text-center py-12">
                        {t('inboxNoMessagesInThread', locale)}
                      </p>
                    ) : (
                      active.messages.map((msg) => {
                        const outgoing = msg.from === 'you';
                        const canModerate =
                          !isTikTokThread(active) &&
                          !msg.id.startsWith('local-') &&
                          (active.channel === 'comment' ||
                            active.channel === 'dm');
                        const busy = commentBusyId === msg.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${outgoing ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`group relative min-w-[96px] max-w-[78%] px-3.5 py-2.5 text-[13.5px] leading-relaxed shadow-none ${
                                outgoing
                                  ? 'bg-[#243228] text-[#F9F8F6] rounded-xl rounded-br-md'
                                  : 'bg-[#F0EFEA] text-[#2C2621] rounded-xl rounded-tl-md'
                              }`}
                            >
                              <p>{msg.text}</p>
                              <div className="mt-1.5 flex items-center justify-between gap-2">
                                <p
                                  className={`text-[10px] tabular-nums ${
                                    outgoing
                                      ? 'text-[#F9F8F6]/50'
                                      : 'text-[#8A857D]'
                                  }`}
                                >
                                  {msg.time}
                                  {msg.liked ? (
                                    <span className="ml-1.5 inline-flex items-center gap-0.5 text-[#E11D48]">
                                      <Heart size={10} fill="currentColor" />
                                    </span>
                                  ) : null}
                                </p>
                                {canModerate ? (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        type="button"
                                        disabled={busy}
                                        className={`inline-flex h-8 w-8 min-h-[32px] min-w-[32px] items-center justify-center rounded-lg transition-opacity ${
                                          outgoing
                                            ? 'text-[#F9F8F6]/80 hover:bg-white/10 hover:text-[#F9F8F6]'
                                            : 'text-[#8A857D] hover:bg-[#FFFFFF] hover:text-[#2C2621]'
                                        } ${busy ? 'opacity-50' : 'opacity-100'}`}
                                        aria-label={
                                          active.channel === 'dm'
                                            ? 'Message actions'
                                            : 'Comment actions'
                                        }
                                      >
                                        {busy ? (
                                          <Loader2
                                            size={14}
                                            className="animate-spin"
                                          />
                                        ) : (
                                          <MoreHorizontal size={14} />
                                        )}
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align={outgoing ? 'end' : 'start'}
                                      className="w-48 z-[80]"
                                    >
                                      <DropdownMenuItem
                                        className="gap-2 min-h-[40px] cursor-pointer"
                                        onClick={() =>
                                          void runCommentAction({
                                            action: msg.liked
                                              ? 'unlike'
                                              : 'like',
                                            msg,
                                          })
                                        }
                                      >
                                        <Heart
                                          size={14}
                                          className={
                                            msg.liked
                                              ? 'text-[#E11D48]'
                                              : undefined
                                          }
                                          fill={
                                            msg.liked ? 'currentColor' : 'none'
                                          }
                                        />
                                        {msg.liked ? 'Unlike' : 'Like'}
                                      </DropdownMenuItem>
                                      {outgoing ? (
                                        <DropdownMenuItem
                                          className="gap-2 min-h-[40px] cursor-pointer"
                                          onClick={() => onEditComment(msg)}
                                        >
                                          <Pencil size={14} />
                                          Edit
                                        </DropdownMenuItem>
                                      ) : null}
                                      {outgoing ||
                                      active.channel === 'comment' ? (
                                        <>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            variant="destructive"
                                            className="gap-2 min-h-[40px] cursor-pointer"
                                            onClick={() => {
                                              if (
                                                !window.confirm(
                                                  active.channel === 'dm'
                                                    ? 'Remove this message from Inbox? (Instagram can’t unsend DMs from apps.)'
                                                    : outgoing
                                                      ? 'Delete this reply on Instagram?'
                                                      : 'Delete this comment on Instagram?'
                                                )
                                              ) {
                                                return;
                                              }
                                              void runCommentAction({
                                                action: 'delete',
                                                msg,
                                              });
                                            }}
                                          >
                                            <Trash2 size={14} />
                                            Delete
                                          </DropdownMenuItem>
                                        </>
                                      ) : null}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <form
                    className="border-t border-[#E6E3DB] bg-[#FFFFFF] p-3 flex-shrink-0"
                    onSubmit={(e) => void onSend(e)}
                  >
                    <div className="flex items-center gap-1 rounded-xl border border-[#E6E3DB] bg-[#F0EFEA]/80 pl-1.5 pr-1.5 py-1 focus-within:ring-0 focus-within:border-[#E6E3DB] focus-within:bg-[#FFFFFF] transition-shadow">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={() => {
                          toast.message(t('inboxMediaSoon', locale));
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-10 w-10 min-h-[40px] rounded-xl text-[#8A857D] hover:text-[#2C2621] hover:bg-[#FFFFFF] inline-flex items-center justify-center flex-shrink-0"
                        aria-label={t('inboxAttachMedia', locale)}
                        title={t('inboxAttachMedia', locale)}
                      >
                        <Paperclip size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void onAiQuickReply()}
                        disabled={aiLoading || !active}
                        className="h-10 w-10 min-h-[40px] rounded-xl text-[#8A857D] hover:text-[#2C3B2E] hover:bg-[#FFFFFF] inline-flex items-center justify-center flex-shrink-0 disabled:opacity-40"
                        aria-label={t('inboxAiQuickReply', locale)}
                        title={t('inboxAiQuickReply', locale)}
                      >
                        {aiLoading ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Sparkles size={16} />
                        )}
                      </button>
                      <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder={
                          isTikTokThread(active)
                            ? t('inboxReplyTikTok', locale)
                            : active.channel === 'dm'
                              ? t('inboxWriteReply', locale)
                              : t('inboxReplyComment', locale)
                        }
                        className="flex-1 min-w-0 h-10 bg-transparent px-2 text-sm font-medium text-[#2C2621] placeholder:text-[#8A857D] focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!draft.trim() || sending}
                        className="h-10 min-h-[40px] w-10 rounded-xl bg-[#243228] text-[#F9F8F6] inline-flex items-center justify-center hover:bg-[#2C3B2E] disabled:opacity-35 flex-shrink-0"
                        aria-label={t('send', locale)}
                      >
                        {sending ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Send size={15} />
                        )}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-[#8A857D] px-6 text-center">
                  <div>
                    <Inbox size={26} className="mx-auto mb-2 opacity-35" />
                    <p className="text-sm font-medium text-[#8A857D]">
                      {t('inboxSelectConversation', locale)}
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}

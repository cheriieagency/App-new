'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  FileText,
  MessageCircle,
  LayoutDashboard,
  Trash2,
  Search,
  ShieldCheck,
  Crown,
  Heart,
  ChevronDown,
  ChevronUp,
  UserMinus,
  Sparkles,
  Reply,
  Send,
  ImageIcon,
  X,
  Loader2,
  Shield,
  ShieldOff,
  Check,
  GraduationCap,
  Pin,
  ShoppingBag,
  Calendar,
  Radio,
  Link2,
} from 'lucide-react';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import useUpload from '@/utils/useUpload';
import ClassroomAdminSection from '@/components/admin/ClassroomAdminSection';
import StoreAdminSection from '@/components/admin/StoreAdminSection';
import { AdminPageHeader, adminCardClass, adminKpiClass } from '@/components/admin/AdminUi';
import { communityPublicUrl } from '@/lib/site';
import type {
  CommunityAdminComment,
  CommunityAdminMember,
  CommunityAdminPost,
  ManagedCommunity,
} from '@/lib/mock-community-admin';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useSubscription } from '@/components/common/useSubscription';
import UpgradeModal from '@/components/common/UpgradeModal';

export type CommunitySubTab =
  | 'overview'
  | 'members'
  | 'classroom'
  | 'store'
  | 'feed'
  | 'event'
  | 'broadcast';

type CommunityAdminResponse = {
  communities: ManagedCommunity[];
  community: ManagedCommunity | null;
  overview: {
    member_count: number;
    post_count: number;
    comment_count: number;
    joined_this_week: number;
    moderator_count: number;
    like_count: number;
  };
  members: CommunityAdminMember[];
  posts: CommunityAdminPost[];
  demo?: boolean;
};

function roleLabel(role: string, locale: Parameters<typeof t>[1]) {
  if (role === 'owner') return t('roleOwner', locale);
  if (role === 'moderator') return t('roleModerator', locale);
  return t('roleMember', locale);
}

function roleBadgeClass(role: string) {
  if (role === 'owner') return 'bg-amber-50 text-amber-700 border border-amber-100';
  if (role === 'moderator') return 'bg-[#E9D5FF]/70 text-[#1a1848] border border-[#E9D5FF]';
  return 'bg-slate-100 text-slate-500 border border-slate-100';
}

function formatRelative(iso: string, locale: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / (60 * 60 * 1000));
  if (hours < 1) return t('justNow', locale as Parameters<typeof t>[1]);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function CommentPhoto({ url, type }: { url: string; type: string | null }) {
  if (!type || type.startsWith('image/') || url.startsWith('data:image')) {
    return (
      <div className="mt-2 rounded-xl overflow-hidden border border-slate-100 max-w-[220px]">
        <img src={url} alt="" className="w-full max-h-40 object-cover" />
      </div>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 inline-flex items-center gap-2 text-[11px] font-bold text-[#F472B6]"
    >
      <ImageIcon size={12} /> Bilaga
    </a>
  );
}

function AdminPostComments({
  post,
  communityQueryKey,
  onDeleteComment,
  deletePending,
}: {
  post: CommunityAdminPost;
  communityQueryKey: unknown[];
  onDeleteComment: (commentId: number) => void;
  deletePending: boolean;
}) {
  const { locale } = useLocale();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyToName, setReplyToName] = useState('');
  const [pendingPhoto, setPendingPhoto] = useState<{ url: string; type: string } | null>(
    null
  );
  const [upload, { loading: uploading }] = useUpload();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const comments = post.comments ?? [];
  const topLevel = comments
    .filter((c) => !c.parent_id)
    .slice()
    .sort((a, b) => {
      const ap = a.is_pinned ? 1 : 0;
      const bp = b.is_pinned ? 1 : 0;
      if (ap !== bp) return bp - ap;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  const nested = comments.filter((c) => !!c.parent_id);

  const handlePhoto = async (file: File) => {
    const result = await upload({ file });
    if (result.url) {
      setPendingPhoto({ url: result.url, type: result.mimeType ?? file.type });
      return;
    }
    // Fallback so local demo still works if upload is unavailable.
    setPendingPhoto({ url: URL.createObjectURL(file), type: file.type });
  };

  const addComment = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: post.id,
          content: text,
          parent_id: replyTo,
          media_url: pendingPhoto?.url ?? null,
          media_type: pendingPhoto?.type ?? null,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json() as Promise<CommunityAdminComment>;
    },
    onSuccess: (created) => {
      queryClient.setQueryData<CommunityAdminResponse>(communityQueryKey, (prev) => {
        if (!prev) return prev;
        const posts = prev.posts.map((p) => {
          if (p.id !== post.id) return p;
          const nextComments = [...(p.comments ?? []), created];
          return {
            ...p,
            comments: nextComments,
            comment_count: nextComments.length,
          };
        });
        return {
          ...prev,
          posts,
          overview: {
            ...prev.overview,
            comment_count: posts.reduce((n, p) => n + (p.comments?.length ?? 0), 0),
          },
        };
      });
      setText('');
      setReplyTo(null);
      setReplyToName('');
      setPendingPhoto(null);
    },
  });

  const pinComment = useMutation({
    mutationFn: async ({
      comment_id,
      action,
    }: {
      comment_id: number;
      action: 'pin' | 'unpin';
    }) => {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, comment_id }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: (_res, vars) => {
      queryClient.setQueryData<CommunityAdminResponse>(communityQueryKey, (prev) => {
        if (!prev) return prev;
        const posts = prev.posts.map((p) => {
          if (p.id !== post.id) return p;
          const nextComments = (p.comments ?? [])
            .map((c) =>
              c.id === vars.comment_id
                ? {
                    ...c,
                    is_pinned: vars.action === 'pin',
                    pinned_at:
                      vars.action === 'pin' ? new Date().toISOString() : null,
                  }
                : c
            )
            .slice()
            .sort((a, b) => {
              const ap = a.is_pinned ? 1 : 0;
              const bp = b.is_pinned ? 1 : 0;
              if (ap !== bp) return bp - ap;
              return (
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
            });
          return { ...p, comments: nextComments };
        });
        return { ...prev, posts };
      });
    },
  });

  const startReply = (c: CommunityAdminComment) => {
    setReplyTo(c.id);
    setReplyToName(c.user_name);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const canSend = Boolean(text.trim() || pendingPhoto) && !addComment.isPending && !uploading;

  return (
    <div className="border-t border-slate-100 bg-slate-50/60">
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handlePhoto(f);
          e.target.value = '';
        }}
      />

      {comments.length === 0 ? (
        <p className="px-5 py-4 text-xs text-slate-400 font-medium">
          {t('noCommentsYet', locale)}
        </p>
      ) : (
        <div className="px-4 sm:px-5 py-3 space-y-3">
          {topLevel.map((c) => (
            <div key={c.id}>
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-[11px] font-extrabold text-slate-500 flex-shrink-0">
                  {c.user_name?.[0] ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={`rounded-xl rounded-tl-none px-3 py-2 border ${
                      c.is_pinned
                        ? 'bg-[#E9D5FF]/70 border-[#ffe0d4]'
                        : 'bg-white border-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="text-xs font-extrabold text-slate-900">{c.user_name}</p>
                      {c.is_pinned && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-wide text-[#F472B6] bg-white/80 px-1.5 py-0.5 rounded-full">
                          <Pin size={9} /> {t('pinned', locale)}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-300 font-bold">
                        {formatRelative(c.created_at, locale)}
                      </span>
                    </div>
                    {c.content?.trim() && (
                      <p className="text-xs text-slate-600 leading-relaxed">{c.content}</p>
                    )}
                    {c.media_url && <CommentPhoto url={c.media_url} type={c.media_type} />}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => startReply(c)}
                      className="inline-flex items-center gap-1 h-10 min-h-[44px] px-2 text-[11px] font-extrabold text-slate-400 hover:text-[#F472B6] transition-colors"
                    >
                      <Reply size={11} /> {t('reply', locale)}
                    </button>
                    <button
                      type="button"
                      disabled={pinComment.isPending}
                      onClick={() =>
                        pinComment.mutate({
                          comment_id: c.id,
                          action: c.is_pinned ? 'unpin' : 'pin',
                        })
                      }
                      className={`inline-flex items-center gap-1 h-10 min-h-[44px] px-2 text-[11px] font-extrabold transition-colors disabled:opacity-50 ${
                        c.is_pinned
                          ? 'text-[#F472B6] hover:text-[#1a1848]'
                          : 'text-slate-400 hover:text-[#F472B6]'
                      }`}
                    >
                      <Pin size={11} />
                      {c.is_pinned ? t('unpinComment', locale) : t('pinComment', locale)}
                    </button>
                    <button
                      type="button"
                      disabled={deletePending}
                      onClick={() => {
                        if (!window.confirm(t('confirmDeleteComment', locale))) return;
                        onDeleteComment(c.id);
                      }}
                      className="inline-flex items-center gap-1 h-10 min-h-[44px] px-2 text-[11px] font-extrabold text-slate-300 hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={11} /> {t('remove', locale)}
                    </button>
                  </div>
                </div>
              </div>

              {nested
                .filter((n) => n.parent_id === c.id)
                .map((n) => (
                  <div key={n.id} className="flex items-start gap-2 mt-2 ml-8">
                    <div className="w-6 h-6 rounded-lg bg-[#E9D5FF]/70 flex items-center justify-center text-[10px] font-extrabold text-[#6b5bb8] flex-shrink-0">
                      {n.user_name?.[0] ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="bg-[#E9D5FF]/70 rounded-xl rounded-tl-none px-3 py-2 border border-[#f2eeff]">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <p className="text-xs font-extrabold text-[#6b5bb8]">{n.user_name}</p>
                          <span className="text-[10px] text-slate-300 font-bold">
                            {formatRelative(n.created_at, locale)}
                          </span>
                        </div>
                        {n.content?.trim() && (
                          <p className="text-xs text-slate-600 leading-relaxed">{n.content}</p>
                        )}
                        {n.media_url && <CommentPhoto url={n.media_url} type={n.media_type} />}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startReply(c)}
                          className="inline-flex items-center gap-1 h-10 min-h-[44px] px-2 text-[11px] font-extrabold text-slate-400 hover:text-[#F472B6] transition-colors"
                        >
                          <Reply size={11} /> {t('reply', locale)}
                        </button>
                        <button
                          type="button"
                          disabled={deletePending}
                          onClick={() => {
                            if (!window.confirm(t('confirmDeleteComment', locale))) return;
                            onDeleteComment(n.id);
                          }}
                          className="inline-flex items-center gap-1 h-10 min-h-[44px] px-2 text-[11px] font-extrabold text-slate-300 hover:text-red-500 transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={11} /> {t('remove', locale)}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}

      {/* Composer: new comment or reply + optional photo */}
      <div className="px-4 sm:px-5 pb-4 pt-1 border-t border-slate-100">
        {replyTo && (
          <div className="flex items-center gap-1.5 mb-2 px-2.5 py-1.5 bg-[#E9D5FF]/70 rounded-xl w-fit max-w-full">
            <Reply size={11} className="text-[#6b5bb8] flex-shrink-0" />
            <span className="text-[11px] font-bold text-[#6b5bb8] truncate">
              {t('reply', locale)} {replyToName}
            </span>
            <button
              type="button"
              onClick={() => {
                setReplyTo(null);
                setReplyToName('');
              }}
              className="h-8 w-8 min-h-[44px] min-w-[44px] -my-1 -mr-1 flex items-center justify-center text-[#6b5bb8]/70 hover:text-[#1a1848]"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {pendingPhoto && (
          <div className="flex items-center gap-2 mb-2 p-2 bg-white rounded-xl border border-slate-100">
            <img
              src={pendingPhoto.url}
              alt=""
              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
            />
            <span className="text-xs font-bold text-slate-600 flex-1 truncate">
              {t('attachmentSelected', locale)}
            </span>
            <button
              type="button"
              onClick={() => setPendingPhoto(null)}
              className="h-11 w-11 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-red-500"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {uploading && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-white rounded-xl border border-slate-100">
            <Loader2
              size={12}
              className="text-slate-400"
              style={{ animation: 'spin 1s linear infinite' }}
            />
            <span className="text-xs text-slate-500 font-medium">{t('uploading', locale)}</span>
          </div>
        )}

        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            placeholder={
              replyTo
                ? `${t('reply', locale)} ${replyToName}...`
                : t('writeComment', locale)
            }
            className="flex-1 text-xs bg-white border border-slate-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 min-h-[44px] max-h-[96px]"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && canSend) {
                e.preventDefault();
                addComment.mutate();
              }
            }}
            rows={1}
          />
          <button
            type="button"
            onClick={() => addComment.mutate()}
            disabled={!canSend}
            className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-full bg-[#1a1848] flex items-center justify-center disabled:opacity-40 transition-opacity flex-shrink-0"
            title={t('comment', locale)}
          >
            <Send size={14} className="text-white" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => photoRef.current?.click()}
          disabled={uploading}
          className="mt-1.5 inline-flex items-center gap-1.5 h-10 min-h-[44px] px-2 rounded-lg text-[11px] font-extrabold text-slate-400 hover:text-[#F472B6] hover:bg-[#E9D5FF]/50 transition-all disabled:opacity-50"
        >
          <ImageIcon size={13} /> {t('uploadImage', locale)}
        </button>
      </div>
    </div>
  );
}

export default function CommunityAdminPanel({
  eventPanel,
  broadcastPanel,
  initialSubTab = 'overview',
  isLive = false,
}: {
  eventPanel?: ReactNode;
  broadcastPanel?: ReactNode;
  initialSubTab?: CommunitySubTab;
  isLive?: boolean;
}) {
  const { locale } = useLocale();
  const queryClient = useQueryClient();
  const { activeWorkspace, setActiveWorkspaceId } = useWorkspace();
  const {
    checkLimit,
    requestUpgrade,
    upgradeOpen,
    setUpgradeOpen,
    upgradeTarget,
    limits,
  } = useSubscription();
  const [subTab, setSubTab] = useState<CommunitySubTab>(initialSubTab);
  const [linkCopied, setLinkCopied] = useState(false);
  // Community scope follows the global Team Workspace / Brand Profile.
  const communityId = activeWorkspace.community.community_id;
  const [memberSearch, setMemberSearch] = useState('');
  const [expandedPostId, setExpandedPostId] = useState<number | null>(null);

  // Honor deep-links / parent tab remaps (e.g. ?tab=event → community/event).
  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  const { data, isLoading, isError } = useQuery<CommunityAdminResponse>({
    queryKey: ['admin-community', communityId],
    queryFn: async () => {
      const qs = `?community_id=${communityId}`;
      const r = await fetch(`/api/admin/community${qs}`);
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
  });

  const selectedId = communityId;

  const mutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const r = await fetch('/api/admin/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    onSuccess: (_res, variables) => {
      // Optimistic cache update so demo mode feels instant.
      queryClient.setQueryData<CommunityAdminResponse>(
        ['admin-community', communityId],
        (prev) => {
          if (!prev) return prev;
          const action = String(variables.action);
          if (action === 'remove_member') {
            const uid = String(variables.user_id);
            const members = prev.members.filter((m) => m.id !== uid);
            return {
              ...prev,
              members,
              overview: {
                ...prev.overview,
                member_count: members.length,
                moderator_count: members.filter((m) => m.role === 'moderator').length,
              },
            };
          }
          if (action === 'set_role') {
            const uid = String(variables.user_id);
            const role = variables.role as CommunityAdminMember['role'];
            const members = prev.members.map((m) =>
              m.id === uid && m.role !== 'owner' ? { ...m, role } : m
            );
            return {
              ...prev,
              members,
              overview: {
                ...prev.overview,
                moderator_count: members.filter((m) => m.role === 'moderator').length,
              },
            };
          }
          if (action === 'delete_post') {
            const pid = Number(variables.post_id);
            const posts = prev.posts.filter((p) => p.id !== pid);
            const comment_count = posts.reduce((n, p) => n + p.comments.length, 0);
            return {
              ...prev,
              posts,
              overview: {
                ...prev.overview,
                post_count: posts.length,
                comment_count,
                like_count: posts.reduce((n, p) => n + p.like_count, 0),
              },
            };
          }
          if (action === 'pin_post' || action === 'unpin_post') {
            const pid = Number(variables.post_id);
            const pinned = action === 'pin_post';
            const posts = prev.posts
              .map((p) =>
                p.id === pid
                  ? {
                      ...p,
                      is_pinned: pinned,
                      pinned_at: pinned ? new Date().toISOString() : null,
                    }
                  : p
              )
              .slice()
              .sort((a, b) => {
                const ap = a.is_pinned ? 1 : 0;
                const bp = b.is_pinned ? 1 : 0;
                if (ap !== bp) return bp - ap;
                return (
                  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
              });
            return { ...prev, posts };
          }
          if (action === 'delete_comment') {
            const cid = Number(variables.comment_id);
            const posts = prev.posts.map((p) => {
              const comments = p.comments.filter(
                (c) => c.id !== cid && c.parent_id !== cid
              );
              return { ...p, comments, comment_count: comments.length };
            });
            return {
              ...prev,
              posts,
              overview: {
                ...prev.overview,
                comment_count: posts.reduce((n, p) => n + p.comments.length, 0),
              },
            };
          }
          return prev;
        }
      );
      queryClient.invalidateQueries({ queryKey: ['admin-community'] });
      if (
        variables.action === 'pin_post' ||
        variables.action === 'unpin_post'
      ) {
        queryClient.invalidateQueries({ queryKey: ['feed'] });
      }
    },
  });

  const members = useMemo(() => {
    const list = data?.members ?? [];
    const q = memberSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (m) =>
        m.name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.role?.toLowerCase().includes(q)
    );
  }, [data?.members, memberSearch]);

  const activeModerators = useMemo(
    () => (data?.members ?? []).filter((m) => m.role === 'moderator'),
    [data?.members]
  );

  const posts = useMemo(
    () =>
      [...(data?.posts ?? [])].sort((a, b) => {
        const ap = a.is_pinned ? 1 : 0;
        const bp = b.is_pinned ? 1 : 0;
        if (ap !== bp) return bp - ap;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }),
    [data?.posts]
  );

  const SUB_TABS: { key: CommunitySubTab; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: t('communityOverview', locale), icon: LayoutDashboard },
    { key: 'members', label: t('members', locale), icon: Users },
    { key: 'classroom', label: t('classroom', locale), icon: GraduationCap },
    { key: 'store', label: t('store', locale), icon: ShoppingBag },
    { key: 'feed', label: t('postsAndComments', locale), icon: MessageCircle },
    { key: 'event', label: t('events', locale), icon: Calendar },
    { key: 'broadcast', label: t('goLive', locale), icon: Radio },
  ];

  const communitySubNav = (
    <div className="flex gap-0.5 overflow-x-auto scrollbar-none p-1 rounded-xl bg-slate-100/80 border border-slate-200/80 w-fit max-w-full">
      {SUB_TABS.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => setSubTab(key)}
          className={`inline-flex items-center gap-1.5 h-9 min-h-[36px] px-3 rounded-lg text-xs whitespace-nowrap transition-all flex-shrink-0 ${
            subTab === key
              ? 'bg-white text-slate-900 shadow-sm font-semibold'
              : 'text-slate-500 font-medium hover:text-slate-800'
          }`}
        >
          <Icon size={13} /> {label}
          {key === 'broadcast' && isLive && (
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                subTab === key ? 'bg-[#F472B6]' : 'bg-red-500'
              }`}
              style={{ animation: 'livePulse 1s ease-in-out infinite' }}
            />
          )}
        </button>
      ))}
    </div>
  );

  // Event / Live don't depend on community API — keep them reachable while loading.
  if ((isLoading || isError || !data) && (subTab === 'event' || subTab === 'broadcast')) {
    return (
      <div className="space-y-5">
        <AdminPageHeader
          eyebrow={t('adminNavCommunity', locale)}
          title={t('adminNavCommunity', locale)}
        />
        {communitySubNav}
        {subTab === 'event' && (eventPanel ?? null)}
        {subTab === 'broadcast' && (broadcastPanel ?? null)}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`${adminCardClass} p-12 text-center text-sm font-medium text-slate-400`}>
        {t('loading', locale)}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className={`${adminCardClass} p-12 text-center text-sm font-medium text-rose-500`}>
        {t('communityLoadError', locale)}
      </div>
    );
  }

  const { community, overview, communities } = data;

  if (!community) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow={t('adminNavCommunity', locale)}
          title={t('adminNavCommunity', locale)}
          description="No community yet — create one when you're ready."
        />
        <div className={`${adminCardClass} p-12 text-center`}>
          <p className="text-sm font-semibold text-slate-500">
            Your community space is empty.
          </p>
        </div>
      </div>
    );
  }

  const recentMembers = [...data.members]
    .sort((a, b) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t('adminNavCommunity', locale)}
        title={community.name}
        description={community.description || undefined}
        actions={
          data.demo ? (
            <span className="inline-flex items-center gap-1.5 h-9 min-h-[36px] px-3 rounded-xl text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-100">
              <Sparkles size={11} /> Demo
            </span>
          ) : undefined
        }
      />

      {/* Community picker + sub-nav */}
      <div className={`${adminCardClass} p-4 sm:p-5`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4">
          <div
            className="w-12 h-12 min-h-[48px] min-w-[48px] rounded-2xl flex-shrink-0 flex items-center justify-center text-white font-extrabold text-base shadow-sm"
            style={{ background: community.cover_color || '#1a1848' }}
          >
            {community.name?.[0] ?? 'C'}
          </div>
          <div className="flex-1 min-w-0">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-[0.12em] block mb-1">
              {t('chooseCommunity', locale)}
            </label>
            <select
              value={selectedId ?? ''}
              onChange={(e) => setActiveWorkspaceId(String(e.target.value))}
              className="w-full sm:max-w-xs h-11 min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
              aria-label={t('chooseCommunity', locale)}
            >
              {communities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={() => {
                const url = communityPublicUrl(community.id);
                void navigator.clipboard.writeText(url).then(() => {
                  setLinkCopied(true);
                  window.setTimeout(() => setLinkCopied(false), 1800);
                });
              }}
              className="inline-flex items-center gap-1.5 h-11 min-h-[44px] px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              title={`/communities/${community.id}`}
            >
              {linkCopied ? (
                <Check size={13} className="text-emerald-600" />
              ) : (
                <Link2 size={13} className="text-[#9089F0]" />
              )}
              {linkCopied ? t('communityLinkCopied', locale) : t('copyCommunityLink', locale)}
            </button>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wide bg-slate-100 text-slate-600 px-2.5 py-1.5 rounded-lg">
              {community.category}
            </span>
            {community.is_published && (
              <span className="text-[10px] font-mono font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-lg">
                {t('published', locale)}
              </span>
            )}
          </div>
        </div>
        {communitySubNav}
      </div>

      {/* Overview */}
      {subTab === 'overview' && (
        <div className="space-y-4 sm:space-y-5">
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {[
              {
                label: t('members', locale),
                value: overview.member_count,
                icon: Users,
                tint: 'text-[#1a1848]',
                bg: 'bg-[#E9D5FF]/50',
              },
              {
                label: t('posts', locale),
                value: overview.post_count,
                icon: FileText,
                tint: 'text-[#F472B6]',
                bg: 'bg-pink-50',
              },
              {
                label: t('comments', locale),
                value: overview.comment_count,
                icon: MessageCircle,
                tint: 'text-slate-600',
                bg: 'bg-slate-100',
              },
              {
                label: t('joinedThisWeek', locale),
                value: overview.joined_this_week,
                icon: Sparkles,
                tint: 'text-emerald-600',
                bg: 'bg-emerald-50',
              },
              {
                label: t('activeModerators', locale),
                value: overview.moderator_count,
                icon: ShieldCheck,
                tint: 'text-[#1a1848]',
                bg: 'bg-[#E9D5FF]/50',
              },
              {
                label: t('totalLikes', locale),
                value: overview.like_count,
                icon: Heart,
                tint: 'text-[#F472B6]',
                bg: 'bg-pink-50',
              },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className={adminKpiClass}>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
                      {stat.label}
                    </p>
                    <span
                      className={`w-8 h-8 min-h-[32px] min-w-[32px] rounded-xl inline-flex items-center justify-center ${stat.bg} ${stat.tint}`}
                    >
                      <Icon size={14} />
                    </span>
                  </div>
                  <p className="font-clikd-wordmark font-extrabold text-[26px] sm:text-[28px] leading-none text-slate-900 tracking-tight tabular-nums">
                    {stat.value}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className={`${adminCardClass} p-5 sm:p-6 lg:col-span-2 relative overflow-hidden`}>
              <div
                className="absolute inset-x-0 top-0 h-1.5"
                style={{ background: community.cover_color || '#1a1848' }}
              />
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400 mt-1">
                {t('adminNavCommunity', locale)}
              </p>
              <h3 className="font-clikd-wordmark font-extrabold text-xl text-slate-900 tracking-tight mt-2">
                {community.name}
              </h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed mt-2">
                {community.description || t('noDescription', locale)}
              </p>
              <div className="flex flex-wrap gap-2 mt-5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wide bg-slate-100 text-slate-600 px-2.5 py-1.5 rounded-lg">
                  {community.category}
                </span>
                {community.is_published ? (
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-lg">
                    {t('published', locale)}
                  </span>
                ) : null}
              </div>
            </div>

            <div className={`${adminCardClass} overflow-hidden lg:col-span-3`}>
              <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {t('recentMembers', locale)}
                  </h3>
                  <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                    {overview.joined_this_week} {t('joinedThisWeek', locale).toLowerCase()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSubTab('members')}
                  className="h-9 min-h-[36px] px-3 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  {t('seeAll', locale)}
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {recentMembers.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-slate-50/70 transition-colors"
                  >
                    <div
                      className="w-9 h-9 min-h-[36px] min-w-[36px] rounded-xl flex items-center justify-center text-sm font-extrabold text-white flex-shrink-0"
                      style={{ background: community.cover_color || '#1a1848' }}
                    >
                      {m.name?.[0] ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{m.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{m.email}</p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg flex-shrink-0 ${roleBadgeClass(m.role)}`}
                    >
                      {roleLabel(m.role, locale)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Members + moderator management */}
      {subTab === 'members' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {(() => {
            const memberCount = data?.members.length ?? 0;
            const memberLimit = checkLimit('maxCommunityMembers', memberCount);
            if (memberLimit.allowed && memberCount < memberLimit.limit) return null;
            if (memberLimit.unlimited) return null;
            const atCap = memberCount >= memberLimit.limit;
            if (!atCap) return null;
            return (
              <div className="lg:col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm font-semibold text-amber-900">
                  Member limit reached ({memberCount}/{memberLimit.limit}). Upgrade to
                  Creator for Unlimited Members.
                </p>
                <button
                  type="button"
                  onClick={() => requestUpgrade('creator')}
                  className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl bg-[#F472B6] text-white text-xs font-bold"
                >
                  Upgrade to Creator
                </button>
              </div>
            );
          })()}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center justify-between gap-3 mb-1">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Users size={14} className="text-blue-500" />
                  {t('members', locale)}
                  <span className="text-slate-400 font-bold">({data.members.length})</span>
                  {limits.maxCommunityMembers < 999999 && (
                    <span className="text-[10px] font-bold text-slate-400">
                      / {limits.maxCommunityMembers}
                    </span>
                  )}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mb-3 flex items-center gap-1.5">
                <Shield size={11} className="text-violet-500" />
                {t('chooseModerators', locale)}
              </p>
              <div className="relative">
                <input
                  type="search"
                  placeholder={t('searchMembers', locale)}
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="w-full h-11 min-h-[44px] pl-10 pr-3 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5"
                />
                <Search
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto">
              {members.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm font-medium">
                  {t('noMembersYet', locale)}
                </div>
              ) : (
                members.map((m) => {
                  const isMod = m.role === 'moderator';
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3.5 hover:bg-slate-50/80 transition-colors ${isMod ? 'bg-[#E9D5FF]/40' : ''}`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-sm font-extrabold text-[#F472B6] flex-shrink-0">
                          {m.role === 'owner' ? (
                            <Crown size={16} className="text-amber-500" />
                          ) : (
                            m.name?.[0] ?? '?'
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-extrabold text-slate-900 truncate">{m.name}</p>
                            <span
                              className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${roleBadgeClass(m.role)}`}
                            >
                              {roleLabel(m.role, locale)}
                            </span>
                            {isMod && (
                              <span className="flex items-center gap-0.5 text-[9px] font-extrabold text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded-full">
                                <ShieldCheck size={8} /> MOD
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 truncate">{m.email}</p>
                          <p className="text-[10px] text-slate-300 mt-0.5">
                            {t('joined', locale)} {formatRelative(m.joined_at, locale)}
                          </p>
                        </div>
                      </div>

                      {m.role !== 'owner' && (
                        <div className="flex items-center gap-2 flex-shrink-0 pl-[52px] sm:pl-0">
                          <button
                            type="button"
                            disabled={mutation.isPending}
                            onClick={() =>
                              mutation.mutate({
                                action: 'set_role',
                                community_id: selectedId,
                                user_id: m.id,
                                role: isMod ? 'member' : 'moderator',
                              })
                            }
                            className={`flex items-center gap-1 h-11 min-h-[44px] px-3 rounded-xl text-xs font-extrabold transition-all disabled:opacity-60 ${isMod ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-violet-100 text-violet-600 hover:bg-violet-200'}`}
                          >
                            {isMod ? (
                              <>
                                <ShieldOff size={11} /> {t('remove', locale)}
                              </>
                            ) : (
                              <>
                                <ShieldCheck size={11} /> {t('assign', locale)}
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            disabled={mutation.isPending}
                            onClick={() => {
                              if (!window.confirm(t('confirmRemoveMember', locale))) return;
                              mutation.mutate({
                                action: 'remove_member',
                                community_id: selectedId,
                                user_id: m.id,
                              });
                            }}
                            className="h-11 min-h-[44px] min-w-[44px] px-3 rounded-xl bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-500 flex items-center justify-center gap-1.5 text-xs font-extrabold transition-colors disabled:opacity-50"
                            title={t('removeMember', locale)}
                          >
                            <UserMinus size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <ShieldCheck size={14} className="text-violet-500" />
                  {t('activeModerators', locale)}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {activeModerators.length} {t('moderatorsAssigned', locale)}
                </p>
              </div>
              {activeModerators.length === 0 ? (
                <div className="py-10 text-center">
                  <Shield size={28} className="text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">{t('noModeratorsYet', locale)}</p>
                  <p className="text-xs text-slate-300 mt-1">{t('chooseFromList', locale)}</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {activeModerators.map((mod) => (
                    <div key={mod.id} className="flex items-center gap-3 px-5 py-3.5">
                      <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center text-sm font-extrabold text-violet-600 flex-shrink-0">
                        {mod.name?.[0] ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-extrabold text-slate-900 truncate">{mod.name}</p>
                          <span className="text-[9px] font-extrabold text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded-full">
                            MOD
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate">{mod.email}</p>
                      </div>
                      <button
                        type="button"
                        disabled={mutation.isPending}
                        onClick={() =>
                          mutation.mutate({
                            action: 'set_role',
                            community_id: selectedId,
                            user_id: mod.id,
                            role: 'member',
                          })
                        }
                        className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-400 transition-colors disabled:opacity-50"
                        title={t('remove', locale)}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[#E9D5FF]/70 border border-violet-100 rounded-2xl p-5">
              <h4 className="text-xs font-extrabold text-violet-800 mb-3 flex items-center gap-2">
                <Shield size={11} /> {t('moderatorPerms', locale)}
              </h4>
              {[
                t('pinPosts', locale),
                t('deleteComments', locale),
                t('hideInappropriate', locale),
                t('seeReported', locale),
                t('moderateLiveChat', locale),
              ].map((p) => (
                <div key={p} className="flex items-center gap-2 text-xs text-[#6b5bb8] mb-1.5">
                  <Check size={10} className="text-violet-500 flex-shrink-0" /> {p}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Classroom */}
      {subTab === 'classroom' && (
        <ClassroomAdminSection communityId={selectedId} />
      )}

      {/* Store — products & services */}
      {subTab === 'store' && <StoreAdminSection communityId={selectedId} />}

      {/* Event (moved from top-level admin tab) */}
      {subTab === 'event' && (eventPanel ?? null)}

      {/* Go Live (moved from top-level admin tab) */}
      {subTab === 'broadcast' && (broadcastPanel ?? null)}

      {/* Posts & comments */}
      {subTab === 'feed' && (
        <div className="space-y-3">
          {posts.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] py-14 text-center">
              <FileText size={28} className="text-slate-200 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-400">{t('noPostsYet', locale)}</p>
            </div>
          ) : (
            posts.map((post) => {
              const open = expandedPostId === post.id;
              return (
                <div
                  key={post.id}
                  className={`bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden ${
                    post.is_pinned ? 'ring-1 ring-[#ffe0d4]' : ''
                  }`}
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-sm font-extrabold text-slate-600 flex-shrink-0">
                        {post.user_name?.[0] ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-sm font-extrabold text-slate-900">{post.user_name}</p>
                          {post.is_pinned && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-wide text-[#F472B6] bg-[#E9D5FF]/70 px-1.5 py-0.5 rounded-full">
                              <Pin size={9} /> {t('pinned', locale)}
                            </span>
                          )}
                          {post.tag && (
                            <span className="text-[9px] font-extrabold uppercase tracking-wide bg-[#E9D5FF]/70 text-[#6b5bb8] px-1.5 py-0.5 rounded-full">
                              {post.tag}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-300 font-bold">
                            {formatRelative(post.created_at, locale)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-900 leading-relaxed whitespace-pre-wrap">
                          {post.content}
                        </p>
                        <div className="flex items-center gap-3 mt-3 text-[11px] font-bold text-slate-400 flex-wrap">
                          <span className="inline-flex items-center gap-1">
                            <Heart size={12} /> {post.like_count}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MessageCircle size={12} /> {post.comments?.length ?? post.comment_count}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <button
                          type="button"
                          disabled={mutation.isPending}
                          onClick={() =>
                            mutation.mutate({
                              action: post.is_pinned ? 'unpin_post' : 'pin_post',
                              post_id: post.id,
                            })
                          }
                          className={`h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 ${
                            post.is_pinned
                              ? 'bg-[#E9D5FF]/70 text-[#F472B6] hover:bg-[#E9D5FF]/70'
                              : 'bg-slate-50 text-slate-400 hover:bg-[#E9D5FF]/70 hover:text-[#F472B6]'
                          }`}
                          title={
                            post.is_pinned
                              ? t('unpinComment', locale)
                              : t('pinComment', locale)
                          }
                        >
                          <Pin size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={mutation.isPending}
                          onClick={() => {
                            if (!window.confirm(t('confirmDeletePost', locale))) return;
                            mutation.mutate({ action: 'delete_post', post_id: post.id });
                          }}
                          className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors disabled:opacity-50"
                          title={t('deletePost', locale)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedPostId(open ? null : post.id)}
                      className="mt-3 flex items-center gap-1.5 h-11 min-h-[44px] px-2 text-xs font-extrabold text-[#F472B6]"
                    >
                      {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {t('comments', locale)} ({post.comments?.length ?? 0})
                    </button>
                  </div>

                  {open && (
                    <AdminPostComments
                      post={post}
                      communityQueryKey={['admin-community', communityId]}
                      deletePending={mutation.isPending}
                      onDeleteComment={(commentId) =>
                        mutation.mutate({
                          action: 'delete_comment',
                          comment_id: commentId,
                        })
                      }
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        minPlan={upgradeTarget}
      />
    </div>
  );
}

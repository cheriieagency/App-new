'use client';

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Heart,
  MessageCircle,
  Pin,
  Plus,
  Trash2,
  ImageIcon,
  Loader2,
  MoreHorizontal,
  Crown,
  X,
  Send,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import useUpload from '@/utils/useUpload';
import { useSession } from '@/lib/auth-client';
import { useWorkspaceOptional } from '@/context/WorkspaceContext';
import {
  POST_CATEGORIES,
  type FeedComment,
  type FeedPost,
  type PostCategoryId,
} from '@/lib/community-posts';

type PostsResponse = { posts: FeedPost[]; demo?: boolean };

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function RoleBadge({ role }: { role?: string | null }) {
  const r = (role || 'member').toLowerCase();
  if (r === 'owner' || r === 'admin' || r === 'moderator') {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-wide text-[#2B2568] bg-[#E9D5FF]/80 px-1.5 py-0.5 rounded-full">
        <Crown size={9} /> {r === 'moderator' ? 'Admin' : 'Owner'}
      </span>
    );
  }
  return (
    <span className="text-[9px] font-extrabold uppercase tracking-wide text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
      Member
    </span>
  );
}

function categoryLabel(id: string | null | undefined) {
  return POST_CATEGORIES.find((c) => c.id === id)?.label ?? id ?? 'General';
}

export default function CommunityPostsTab({
  communityId,
}: {
  communityId: number;
}) {
  const { locale } = useLocale();
  const { data: session } = useSession();
  const workspaceCtx = useWorkspaceOptional();
  const queryClient = useQueryClient();
  const [upload, { loading: uploading }] = useUpload();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<PostCategoryId>('announcement');
  const [isPinned, setIsPinned] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | PostCategoryId>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const titleInputRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<HTMLInputElement>(null);

  const queryKey = ['admin-community-posts', communityId] as const;

  const { data, isLoading } = useQuery<PostsResponse>({
    queryKey,
    enabled: Boolean(communityId),
    queryFn: async () => {
      const r = await fetch(
        `/api/admin/community/posts?communityId=${communityId}`
      );
      if (!r.ok) throw new Error('Failed to load posts');
      return r.json();
    },
    refetchOnWindowFocus: true,
  });

  const posts = useMemo(() => {
    const list = data?.posts ?? [];
    if (filter === 'all') return list;
    return list.filter((p) => (p.category || p.tag) === filter);
  }, [data?.posts, filter]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-community-posts'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-community'] });
  };

  const createPost = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/admin/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communityId,
          workspaceId: workspaceCtx?.activeWorkspaceId ?? null,
          title: title.trim() || null,
          content: content.trim(),
          category,
          mediaUrls,
          isPinned,
        }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(json.message || json.error || 'Failed to post');
      }
      return json as { post: FeedPost };
    },
    onSuccess: (res) => {
      queryClient.setQueryData<PostsResponse>(queryKey, (prev) => ({
        posts: [res.post, ...(prev?.posts ?? []).filter((p) => p.id !== res.post.id)],
        demo: prev?.demo,
      }));
      setTitle('');
      setContent('');
      setCategory('announcement');
      setIsPinned(false);
      setMediaUrls([]);
      toast.success(t('toastPostedToCommunity', locale));
      invalidate();
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : t('toastCouldNotPost', locale)
      );
    },
  });

  const toggleLike = useMutation({
    mutationFn: async (postId: number) => {
      const r = await fetch(`/api/admin/community/posts/${postId}/like`, {
        method: 'POST',
      });
      if (!r.ok) throw new Error('Failed');
      return r.json() as Promise<{ liked: boolean; like_count: number }>;
    },
    onSuccess: (res, postId) => {
      queryClient.setQueryData<PostsResponse>(queryKey, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          posts: prev.posts.map((p) =>
            p.id === postId
              ? { ...p, liked_by_me: res.liked, like_count: res.like_count }
              : p
          ),
        };
      });
    },
  });

  const addComment = useMutation({
    mutationFn: async ({ postId, text }: { postId: number; text: string }) => {
      const r = await fetch(`/api/admin/community/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(json.error || 'Failed');
      return { postId, comment: json.comment as FeedComment };
    },
    onSuccess: ({ postId, comment }) => {
      queryClient.setQueryData<PostsResponse>(queryKey, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          posts: prev.posts.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  comments: [...(p.comments ?? []), comment],
                  comment_count: (p.comment_count ?? 0) + 1,
                }
              : p
          ),
        };
      });
      setReplyDrafts((d) => ({ ...d, [postId]: '' }));
      invalidate();
    },
    onError: () => toast.error(t('toastCommentFailed', locale)),
  });

  const pinPost = useMutation({
    mutationFn: async ({
      postId,
      pin,
    }: {
      postId: number;
      pin: boolean;
    }) => {
      const r = await fetch(`/api/admin/community/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: pin ? 'pin' : 'unpin' }),
      });
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    onSuccess: (_res, vars) => {
      queryClient.setQueryData<PostsResponse>(queryKey, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          posts: prev.posts
            .map((p) =>
              p.id === vars.postId
                ? {
                    ...p,
                    is_pinned: vars.pin,
                    pinned_at: vars.pin ? new Date().toISOString() : null,
                  }
                : p
            )
            .sort((a, b) => {
              const ap = a.is_pinned ? 1 : 0;
              const bp = b.is_pinned ? 1 : 0;
              if (ap !== bp) return bp - ap;
              return (
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );
            }),
        };
      });
      setMenuOpenId(null);
      invalidate();
    },
  });

  const deletePost = useMutation({
    mutationFn: async (postId: number) => {
      const r = await fetch(`/api/admin/community/posts/${postId}`, {
        method: 'DELETE',
      });
      if (!r.ok) throw new Error('Failed');
      return postId;
    },
    onSuccess: (postId) => {
      queryClient.setQueryData<PostsResponse>(queryKey, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          posts: prev.posts.filter((p) => p.id !== postId),
        };
      });
      setMenuOpenId(null);
      toast.success(t('toastPostDeleted', locale));
      invalidate();
    },
  });

  const saveEdit = useMutation({
    mutationFn: async () => {
      if (editingId == null) return;
      const r = await fetch(`/api/admin/community/posts/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          title: editTitle.trim(),
          content: editContent.trim(),
        }),
      });
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    onSuccess: () => {
      if (editingId != null) {
        queryClient.setQueryData<PostsResponse>(queryKey, (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            posts: prev.posts.map((p) =>
              p.id === editingId
                ? {
                    ...p,
                    title: editTitle.trim() || null,
                    content: editContent.trim() || p.content,
                  }
                : p
            ),
          };
        });
      }
      setEditingId(null);
      setMenuOpenId(null);
      toast.success(t('toastPostUpdated', locale));
      invalidate();
    },
  });

  const handleMedia = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error(t('toastChooseImage', locale));
      return;
    }
    const local = URL.createObjectURL(file);
    setMediaUrls((m) => [...m, local]);
    const result = await upload({ file });
    if (result.url) {
      setMediaUrls((m) => m.map((u) => (u === local ? result.url! : u)));
    }
  };

  const canPublish =
    Boolean(title.trim() || content.trim()) && !createPost.isPending;

  const avatar =
    session?.user?.image ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
      session?.user?.name || 'You'
    )}`;

  return (
    <div className="space-y-4">
      {/* Composer */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-4 sm:p-5 space-y-4">
        <div className="flex gap-3 items-start">
          <img
            src={avatar}
            alt=""
            className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-2xl object-cover bg-slate-100 flex-shrink-0"
          />
          <div className="flex-1 min-w-0 space-y-3">
            <p className="text-sm font-semibold text-slate-500">
              Write a post to your community…
            </p>
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title (optional)"
              className="w-full h-11 min-h-[44px] rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#F472B6]/20 focus:border-[#F472B6]"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder="Share an announcement, ask a question, or start a discussion…"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F472B6]/20 focus:border-[#F472B6] resize-y min-h-[100px]"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {POST_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`h-10 min-h-[40px] px-3 rounded-full text-xs font-extrabold border transition-colors ${
                category === c.id
                  ? 'bg-[#E9D5FF]/80 border-[#E9D5FF] text-[#1a1848]'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 h-11 min-h-[44px] text-sm font-semibold text-slate-700 cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
            className="rounded border-slate-300"
          />
          <Pin size={14} className="text-[#F472B6]" />
          Pin post to top of community feed
        </label>

        <input
          ref={mediaRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleMedia(f);
            e.target.value = '';
          }}
        />

        {mediaUrls.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {mediaUrls.map((url) => (
              <div
                key={url}
                className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200"
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() =>
                    setMediaUrls((m) => m.filter((u) => u !== url))
                  }
                  className="absolute top-1 right-1 h-7 w-7 rounded-lg bg-black/50 text-white flex items-center justify-center"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between pt-1">
          <button
            type="button"
            onClick={() => mediaRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center justify-center gap-1.5 h-11 min-h-[44px] px-4 rounded-xl border border-slate-200 bg-white text-xs font-extrabold text-slate-600 hover:border-[#F472B6] hover:text-[#F472B6] disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ImageIcon size={14} />
            )}
            Add image
          </button>
          <button
            type="button"
            disabled={!canPublish}
            onClick={() => createPost.mutate()}
            className="inline-flex items-center justify-center gap-2 h-11 min-h-[44px] px-5 rounded-xl bg-[#F472B6] hover:bg-[#ec4899] text-white text-sm font-black transition-colors disabled:opacity-50"
          >
            {createPost.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            Post to Community
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`h-10 min-h-[40px] px-3 rounded-full text-xs font-bold border ${
            filter === 'all'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-600 border-slate-200'
          }`}
        >
          All
        </button>
        {POST_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setFilter(c.id)}
            className={`h-10 min-h-[40px] px-3 rounded-full text-xs font-bold border ${
              filter === c.id
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            {c.short}
          </button>
        ))}
      </div>

      {/* Feed */}
      {isLoading ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl py-14 text-center text-sm text-slate-400">
          Loading feed…
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-8 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-[#E9D5FF]/50 text-[#2B2568] flex items-center justify-center mb-4">
            <MessageCircle size={22} />
          </div>
          <h3 className="font-clikd-wordmark font-extrabold text-lg text-slate-900 tracking-tight">
            No posts yet
          </h3>
          <p className="text-sm text-slate-500 font-medium mt-2 max-w-md mx-auto">
            Start the discussion or share an announcement with your members.
          </p>
          <button
            type="button"
            onClick={() => {
              titleInputRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
              });
              titleInputRef.current?.focus();
            }}
            className="mt-5 inline-flex items-center justify-center h-11 min-h-[44px] px-5 rounded-xl bg-[#2B2568] text-white text-xs font-extrabold"
          >
            + Create First Post
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const open = expandedId === post.id;
            const comments = post.comments ?? [];
            return (
              <article
                key={post.id}
                className={`bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden ${
                  post.is_pinned ? 'ring-1 ring-[#F472B6]/30' : ''
                }`}
              >
                <div className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 min-h-[40px] min-w-[40px] rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0 flex items-center justify-center text-sm font-extrabold text-slate-600">
                      {post.user_image ? (
                        <img
                          src={post.user_image}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        post.user_name?.[0] ?? '?'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-extrabold text-slate-900">
                          {post.user_name}
                        </p>
                        <RoleBadge role={post.author_role} />
                        <span className="text-[9px] font-extrabold uppercase tracking-wide bg-[#E9D5FF]/70 text-[#6b5bb8] px-1.5 py-0.5 rounded-full">
                          {categoryLabel(String(post.category || post.tag))}
                        </span>
                        <span className="text-[10px] text-slate-300 font-bold">
                          {formatRelative(post.created_at)}
                        </span>
                        {post.is_pinned ? (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-wide text-[#F472B6] bg-pink-50 px-1.5 py-0.5 rounded-full">
                            <Pin size={9} /> Pinned
                          </span>
                        ) : null}
                      </div>

                      {editingId === post.id ? (
                        <div className="space-y-2 mt-2">
                          <input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold"
                            placeholder="Title"
                          />
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={3}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm resize-y"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => saveEdit.mutate()}
                              className="h-10 px-3 rounded-xl bg-[#F472B6] text-white text-xs font-bold"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="h-10 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {post.title ? (
                            <h4 className="text-base font-extrabold text-slate-900 mb-1">
                              {post.title}
                            </h4>
                          ) : null}
                          <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                            {post.content}
                          </p>
                          {(post.media_urls?.length || post.image_url) ? (
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              {(post.media_urls?.length
                                ? post.media_urls
                                : [post.image_url!]
                              ).map((url) => (
                                <div
                                  key={url}
                                  className="rounded-xl overflow-hidden border border-slate-100 aspect-video bg-slate-50"
                                >
                                  <img
                                    src={url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </>
                      )}

                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <button
                          type="button"
                          onClick={() => toggleLike.mutate(post.id)}
                          className={`inline-flex items-center gap-1.5 h-10 min-h-[40px] px-3 rounded-xl text-xs font-bold transition-colors ${
                            post.liked_by_me
                              ? 'bg-rose-50 text-rose-600'
                              : 'bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-600'
                          }`}
                        >
                          <Heart
                            size={13}
                            className={post.liked_by_me ? 'fill-current' : ''}
                          />
                          {post.like_count}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId(open ? null : post.id)
                          }
                          className="inline-flex items-center gap-1.5 h-10 min-h-[40px] px-3 rounded-xl bg-slate-50 text-slate-500 hover:bg-[#E9D5FF]/50 hover:text-[#2B2568] text-xs font-bold"
                        >
                          <MessageCircle size={13} />
                          {post.comment_count ?? comments.length}
                        </button>
                      </div>
                    </div>

                    <div className="relative flex-shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setMenuOpenId(menuOpenId === post.id ? null : post.id)
                        }
                        className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 flex items-center justify-center"
                        aria-label="Post actions"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {menuOpenId === post.id ? (
                        <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-xl border border-slate-100 bg-white shadow-lg overflow-hidden">
                          <button
                            type="button"
                            onClick={() =>
                              pinPost.mutate({
                                postId: post.id,
                                pin: !post.is_pinned,
                              })
                            }
                            className="w-full text-left px-3 h-11 min-h-[44px] text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2"
                          >
                            <Pin size={13} />{' '}
                            {post.is_pinned ? 'Unpin post' : 'Pin post'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(post.id);
                              setEditTitle(post.title || '');
                              setEditContent(post.content);
                              setMenuOpenId(null);
                            }}
                            className="w-full text-left px-3 h-11 min-h-[44px] text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2"
                          >
                            <Pencil size={13} /> Edit post
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!window.confirm('Delete this post?')) return;
                              deletePost.mutate(post.id);
                            }}
                            className="w-full text-left px-3 h-11 min-h-[44px] text-xs font-bold text-rose-600 hover:bg-rose-50 inline-flex items-center gap-2"
                          >
                            <Trash2 size={13} /> Delete post
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                {open ? (
                  <div className="border-t border-slate-100 bg-slate-50/60 px-4 sm:px-5 py-4 space-y-3">
                    {comments.length === 0 ? (
                      <p className="text-xs font-medium text-slate-400">
                        No comments yet — be the first to reply.
                      </p>
                    ) : (
                      comments.map((c) => (
                        <div key={c.id} className="flex gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-[11px] font-extrabold text-slate-500 flex-shrink-0 overflow-hidden">
                            {c.user_image ? (
                              <img
                                src={c.user_image}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              c.user_name?.[0] ?? '?'
                            )}
                          </div>
                          <div className="flex-1 min-w-0 rounded-xl bg-white border border-slate-100 px-3 py-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-extrabold text-slate-800">
                                {c.user_name}
                              </span>
                              <RoleBadge role={c.author_role} />
                              <span className="text-[10px] text-slate-300 font-bold">
                                {formatRelative(c.created_at)}
                              </span>
                            </div>
                            <p className="text-sm text-slate-700 mt-0.5 whitespace-pre-wrap">
                              {c.content}
                            </p>
                          </div>
                        </div>
                      ))
                    )}

                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        value={replyDrafts[post.id] ?? ''}
                        onChange={(e) =>
                          setReplyDrafts((d) => ({
                            ...d,
                            [post.id]: e.target.value,
                          }))
                        }
                        placeholder="Add a reply…"
                        className="flex-1 h-11 min-h-[44px] rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F472B6]/20"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const text = (replyDrafts[post.id] ?? '').trim();
                            if (text) addComment.mutate({ postId: post.id, text });
                          }
                        }}
                      />
                      <button
                        type="button"
                        disabled={
                          !(replyDrafts[post.id] ?? '').trim() ||
                          addComment.isPending
                        }
                        onClick={() => {
                          const text = (replyDrafts[post.id] ?? '').trim();
                          if (text) addComment.mutate({ postId: post.id, text });
                        }}
                        className="h-11 min-h-[44px] w-11 min-w-[44px] rounded-xl bg-[#F472B6] text-white flex items-center justify-center disabled:opacity-40"
                      >
                        <Send size={15} />
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

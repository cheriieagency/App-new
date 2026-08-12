/** Community feed types, categories, and in-memory demo store. */

export const POST_CATEGORIES = [
  { id: 'announcement', label: '📣 Announcement', short: 'Announcements' },
  { id: 'general', label: '💬 General', short: 'General' },
  { id: 'qa', label: '❓ Q&A', short: 'Q&A' },
  { id: 'wins', label: '🎉 Wins', short: 'Wins' },
  { id: 'discussion', label: '💡 Discussion', short: 'Discussion' },
] as const;

export type PostCategoryId = (typeof POST_CATEGORIES)[number]['id'];

export type FeedComment = {
  id: number;
  post_id: number;
  user_id: string;
  user_name: string;
  user_image?: string | null;
  content: string;
  parent_id: number | null;
  created_at: string;
  author_role?: string | null;
};

export type FeedPost = {
  id: number;
  community_id: number;
  user_id: string;
  user_name: string;
  user_image: string | null;
  author_role: string;
  title: string | null;
  content: string;
  category: PostCategoryId | string | null;
  tag: string | null;
  image_url: string | null;
  media_urls: string[];
  is_pinned: boolean;
  pinned_at: string | null;
  created_at: string;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  comments: FeedComment[];
};

let postSeq = 50_000;
let commentSeq = 80_000;
const managedPosts = new Map<number, FeedPost[]>(); // communityId -> posts
const managedLikes = new Map<string, Set<string>>(); // `${postId}` -> userIds

function likeKey(postId: number) {
  return String(postId);
}

export function listManagedFeedPosts(
  communityId: number,
  userId?: string | null
): FeedPost[] {
  const list = managedPosts.get(communityId) ?? [];
  return list
    .map((p) => ({
      ...p,
      comments: [...(p.comments ?? [])],
      media_urls: [...(p.media_urls ?? [])],
      liked_by_me: userId
        ? Boolean(managedLikes.get(likeKey(p.id))?.has(userId))
        : false,
    }))
    .sort((a, b) => {
      const ap = a.is_pinned ? 1 : 0;
      const bp = b.is_pinned ? 1 : 0;
      if (ap !== bp) return bp - ap;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
}

export function createManagedFeedPost(input: {
  community_id: number;
  user_id: string;
  user_name: string;
  user_image?: string | null;
  author_role?: string;
  title?: string | null;
  content: string;
  category?: string | null;
  media_urls?: string[];
  is_pinned?: boolean;
}): FeedPost {
  const id = ++postSeq;
  const media = (input.media_urls ?? []).filter(Boolean);
  const post: FeedPost = {
    id,
    community_id: input.community_id,
    user_id: input.user_id,
    user_name: input.user_name,
    user_image: input.user_image ?? null,
    author_role: input.author_role ?? 'owner',
    title: input.title?.trim() || null,
    content: input.content.trim(),
    category: input.category ?? 'general',
    tag: input.category ?? 'general',
    image_url: media[0] ?? null,
    media_urls: media,
    is_pinned: Boolean(input.is_pinned),
    pinned_at: input.is_pinned ? new Date().toISOString() : null,
    created_at: new Date().toISOString(),
    like_count: 0,
    comment_count: 0,
    liked_by_me: false,
    comments: [],
  };
  const prev = managedPosts.get(input.community_id) ?? [];
  managedPosts.set(input.community_id, [post, ...prev]);
  return { ...post, comments: [], media_urls: [...media] };
}

export function updateManagedFeedPost(
  communityId: number,
  postId: number,
  patch: Partial<FeedPost>
): FeedPost | null {
  const list = managedPosts.get(communityId) ?? [];
  const idx = list.findIndex((p) => p.id === postId);
  if (idx < 0) return null;
  const next = { ...list[idx], ...patch, id: postId };
  list[idx] = next;
  managedPosts.set(communityId, list);
  return { ...next, comments: [...(next.comments ?? [])] };
}

export function deleteManagedFeedPost(
  communityId: number,
  postId: number
): boolean {
  const list = managedPosts.get(communityId) ?? [];
  const next = list.filter((p) => p.id !== postId);
  if (next.length === list.length) {
    // Search all communities (delete by id).
    for (const [cid, posts] of managedPosts.entries()) {
      const filtered = posts.filter((p) => p.id !== postId);
      if (filtered.length !== posts.length) {
        managedPosts.set(cid, filtered);
        managedLikes.delete(likeKey(postId));
        return true;
      }
    }
    return false;
  }
  managedPosts.set(communityId, next);
  managedLikes.delete(likeKey(postId));
  return true;
}

export function findManagedFeedPost(postId: number): FeedPost | null {
  for (const posts of managedPosts.values()) {
    const found = posts.find((p) => p.id === postId);
    if (found) return found;
  }
  return null;
}

export function addManagedFeedComment(input: {
  post_id: number;
  user_id: string;
  user_name: string;
  user_image?: string | null;
  content: string;
  parent_id?: number | null;
  author_role?: string | null;
}): FeedComment | null {
  const post = findManagedFeedPost(input.post_id);
  if (!post) return null;
  const comment: FeedComment = {
    id: ++commentSeq,
    post_id: input.post_id,
    user_id: input.user_id,
    user_name: input.user_name,
    user_image: input.user_image ?? null,
    content: input.content.trim(),
    parent_id: input.parent_id ?? null,
    created_at: new Date().toISOString(),
    author_role: input.author_role ?? null,
  };
  post.comments = [...(post.comments ?? []), comment];
  post.comment_count = post.comments.length;
  return { ...comment };
}

export function toggleManagedFeedLike(
  postId: number,
  userId: string
): { liked: boolean; like_count: number } | null {
  const post = findManagedFeedPost(postId);
  if (!post) return null;
  const set = managedLikes.get(likeKey(postId)) ?? new Set<string>();
  let liked: boolean;
  if (set.has(userId)) {
    set.delete(userId);
    liked = false;
  } else {
    set.add(userId);
    liked = true;
  }
  managedLikes.set(likeKey(postId), set);
  post.like_count = set.size;
  post.liked_by_me = liked;
  return { liked, like_count: set.size };
}

export function normalizeCategory(raw: unknown): PostCategoryId {
  const v = String(raw ?? 'general').toLowerCase();
  if (POST_CATEGORIES.some((c) => c.id === v)) return v as PostCategoryId;
  if (v.includes('announce')) return 'announcement';
  if (v.includes('q')) return 'qa';
  if (v.includes('win')) return 'wins';
  if (v.includes('discuss')) return 'discussion';
  return 'general';
}

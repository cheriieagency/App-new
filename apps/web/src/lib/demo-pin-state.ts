/**
 * Shared in-memory pin overrides for demo mode (no DATABASE_URL).
 * Used by feed/comments APIs and admin mock payloads so pin toggles persist
 * across routes for the lifetime of the Node process.
 */

export const demoPostPinOverrides = new Map<number, boolean>();
export const demoCommentPinOverrides = new Map<number, boolean>();

export function applyPostPinOverride<T extends { id: number; is_pinned?: boolean; pinned_at?: string | null }>(
  post: T
): T {
  if (!demoPostPinOverrides.has(post.id)) return post;
  const is_pinned = Boolean(demoPostPinOverrides.get(post.id));
  return {
    ...post,
    is_pinned,
    pinned_at: is_pinned ? (post.pinned_at ?? new Date().toISOString()) : null,
  };
}

export function applyCommentPinOverride<
  T extends { id: number; is_pinned?: boolean; pinned_at?: string | null },
>(comment: T): T {
  if (!demoCommentPinOverrides.has(comment.id)) return comment;
  const is_pinned = Boolean(demoCommentPinOverrides.get(comment.id));
  return {
    ...comment,
    is_pinned,
    pinned_at: is_pinned ? (comment.pinned_at ?? new Date().toISOString()) : null,
  };
}

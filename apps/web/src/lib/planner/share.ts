/**
 * Planner post client-share links.
 * Guests following the link see the post + public chat only (never private).
 */

import { randomBytes } from 'crypto';
import sql from '@/app/api/utils/sql';
import {
  addPlannerComment,
  getPlannerPost,
  upsertPlannerPost,
  type PlannerComment,
  type PlannerMediaItem,
  type PlannerPost,
  type SocialPlatform,
} from '@/lib/mock-content-planner';
import {
  addDurablePlannerComment,
  ensurePlannerPostsSchema,
  getDurablePlannerPost,
  upsertDurablePlannerPost,
} from '@/lib/planner/posts';

export type PublicSharedPostPayload = {
  title: string;
  caption: string;
  hashtags: string;
  platforms: SocialPlatform[];
  media_items: PlannerMediaItem[];
  project: string;
  comments: PlannerComment[];
};

/** In-memory share map for demo mode (no DATABASE_URL). */
const demoShareByToken = new Map<
  string,
  { postId: string; userId: string; enabled: boolean }
>();

function useDb() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function newShareToken(): string {
  return randomBytes(24).toString('hex');
}

async function healShareColumns(): Promise<void> {
  if (!useDb()) return;
  await ensurePlannerPostsSchema();
  try {
    await sql`
      ALTER TABLE public.planner_posts
        ADD COLUMN IF NOT EXISTS share_token text
    `;
    await sql`
      ALTER TABLE public.planner_posts
        ADD COLUMN IF NOT EXISTS share_enabled boolean NOT NULL DEFAULT false
    `;
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS planner_posts_share_token_uidx
        ON public.planner_posts (share_token)
        WHERE share_token IS NOT NULL AND share_token <> ''
    `;
  } catch (error) {
    console.warn('[planner/share] heal skipped', error);
  }
}

function toPublicPayload(post: PlannerPost): PublicSharedPostPayload {
  return {
    title: post.title,
    caption: post.caption,
    hashtags: post.hashtags,
    platforms: post.platforms,
    media_items: post.media_items ?? [],
    project: post.project,
    comments: (post.comments || []).filter((c) => c.visibility === 'public'),
  };
}

/** Enable (or reuse) a share token for a post owned by the session user. */
export async function enablePlannerPostShare(input: {
  postId: string;
  userId: string;
}): Promise<{ token: string; path: string } | null> {
  const postId = input.postId.trim();
  if (!postId) return null;

  if (!useDb()) {
    const post = getPlannerPost(postId, input.userId);
    if (!post) return null;
    // Reuse existing demo token for this post when present.
    for (const [token, meta] of demoShareByToken) {
      if (meta.postId === postId && meta.userId === input.userId) {
        meta.enabled = true;
        return { token, path: `/share/post/${token}` };
      }
    }
    const token = newShareToken();
    demoShareByToken.set(token, {
      postId,
      userId: input.userId,
      enabled: true,
    });
    return { token, path: `/share/post/${token}` };
  }

  await healShareColumns();
  const existing = await getDurablePlannerPost({
    id: postId,
    userId: input.userId,
  });
  if (!existing) return null;

  const rows = await sql`
    SELECT share_token, share_enabled
    FROM public.planner_posts
    WHERE id = ${postId} AND user_id = ${input.userId}
    LIMIT 1
  `;
  const row = rows?.[0] as Record<string, unknown> | undefined;
  let token =
    typeof row?.share_token === 'string' && row.share_token.trim()
      ? row.share_token.trim()
      : '';

  if (!token) {
    token = newShareToken();
  }

  await sql`
    UPDATE public.planner_posts
    SET share_token = ${token},
        share_enabled = true,
        updated_at = now()
    WHERE id = ${postId} AND user_id = ${input.userId}
  `;

  return { token, path: `/share/post/${token}` };
}

/** Load a shared post for guests — public comments only. */
export async function getPublicSharedPost(
  token: string
): Promise<PublicSharedPostPayload | null> {
  const clean = token.trim();
  if (!clean || clean.length < 16) return null;

  if (!useDb()) {
    const meta = demoShareByToken.get(clean);
    if (!meta?.enabled) return null;
    const post = getPlannerPost(meta.postId, meta.userId);
    if (!post) return null;
    return toPublicPayload(post);
  }

  await healShareColumns();
  const rows = await sql`
    SELECT *
    FROM public.planner_posts
    WHERE share_token = ${clean}
      AND share_enabled = true
    LIMIT 1
  `;
  const row = rows?.[0] as Record<string, unknown> | undefined;
  if (!row) return null;

  // Reuse row mapper via owner lookup (same user_id isolation as storage).
  const post = await getDurablePlannerPost({
    id: String(row.id),
    userId: String(row.user_id),
  });
  if (!post) return null;
  return toPublicPayload(post);
}

/** Guest (or anyone with the link) posts into the public chat. */
export async function addPublicSharedComment(input: {
  token: string;
  authorName: string;
  text: string;
  imageUrl?: string | null;
}): Promise<PlannerComment | null> {
  const clean = input.token.trim();
  if (!clean || clean.length < 16) return null;
  const authorName = input.authorName.trim().slice(0, 80) || 'Guest';
  const text = input.text.trim();
  const imageUrl = input.imageUrl?.trim() || null;
  if (!text && !imageUrl) return null;

  if (!useDb()) {
    const meta = demoShareByToken.get(clean);
    if (!meta?.enabled) return null;
    return addPlannerComment(
      meta.postId,
      {
        text,
        author_name: authorName,
        author_id: `guest-${clean.slice(0, 8)}`,
        author_avatar: '',
        image_url: imageUrl,
        visibility: 'public',
      },
      meta.userId
    );
  }

  await healShareColumns();
  const rows = await sql`
    SELECT id, user_id
    FROM public.planner_posts
    WHERE share_token = ${clean}
      AND share_enabled = true
    LIMIT 1
  `;
  const row = rows?.[0] as Record<string, unknown> | undefined;
  if (!row) return null;

  return addDurablePlannerComment({
    id: String(row.id),
    userId: String(row.user_id),
    comment: {
      text,
      author_name: authorName,
      author_id: `guest-${clean.slice(0, 12)}`,
      author_avatar: '',
      image_url: imageUrl,
      visibility: 'public',
    },
  });
}

/**
 * Ensure a post exists (draft upsert) then enable sharing.
 * Used by the Studio Share button when the post may not be saved yet.
 */
export async function saveAndEnablePlannerShare(input: {
  userId: string;
  actor: string;
  postId?: string | null;
  title: string;
  caption: string;
  hashtags: string;
  platforms: SocialPlatform[];
  project: string;
  media_items: PlannerMediaItem[];
  workspaceId?: string | null;
}): Promise<{ postId: string; token: string; path: string } | null> {
  if (!input.platforms.length) return null;

  if (!useDb()) {
    const post = upsertPlannerPost(
      {
        id: input.postId || undefined,
        title: input.title,
        caption: input.caption,
        hashtags: input.hashtags,
        platforms: input.platforms,
        project: input.project,
        media_items: input.media_items,
        workflow: 'IDEA',
        status: 'draft',
      },
      input.actor,
      input.userId
    );
    if (!post) return null;
    const shared = await enablePlannerPostShare({
      postId: post.id,
      userId: input.userId,
    });
    if (!shared) return null;
    return { postId: post.id, token: shared.token, path: shared.path };
  }

  const post = await upsertDurablePlannerPost(
    {
      id: input.postId || undefined,
      title: input.title,
      caption: input.caption,
      hashtags: input.hashtags,
      platforms: input.platforms,
      project: input.project,
      media_items: input.media_items,
      workflow: 'IDEA',
      status: 'draft',
      workspaceId: input.workspaceId,
    },
    input.actor,
    input.userId
  );
  if (!post) return null;
  const shared = await enablePlannerPostShare({
    postId: post.id,
    userId: input.userId,
  });
  if (!shared) return null;
  return { postId: post.id, token: shared.token, path: shared.path };
}

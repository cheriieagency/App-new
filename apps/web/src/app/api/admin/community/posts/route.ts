/**
 * GET  /api/admin/community/posts?communityId=
 * POST /api/admin/community/posts — create post
 */

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';
import {
  createManagedFeedPost,
  listManagedFeedPosts,
  normalizeCategory,
  type FeedComment,
  type FeedPost,
} from '@/lib/community-posts';

async function requireSession() {
  return auth.api.getSession({ headers: await headers() });
}

let schemaReady = false;

async function ensurePostsSchema() {
  if (schemaReady || !process.env.DATABASE_URL?.trim()) {
    schemaReady = true;
    return;
  }
  try {
    await sql`
      ALTER TABLE posts
        ADD COLUMN IF NOT EXISTS title text,
        ADD COLUMN IF NOT EXISTS media_urls jsonb DEFAULT '[]'::jsonb
    `;
    schemaReady = true;
  } catch (error) {
    console.warn('[ensurePostsSchema]', error);
  }
}

async function memberRole(
  userId: string,
  communityId: number
): Promise<string | null> {
  if (!process.env.DATABASE_URL?.trim()) return 'owner';
  try {
    const rows = await sql`
      SELECT role FROM community_memberships
      WHERE user_id = ${userId} AND community_id = ${communityId}
      LIMIT 1
    `;
    if (rows?.[0]?.role) return String(rows[0].role);
    const owned = await sql`
      SELECT id FROM communities
      WHERE id = ${communityId} AND creator_id = ${userId}
      LIMIT 1
    `;
    if (owned?.[0]?.id) return 'owner';
  } catch {
    /* ignore */
  }
  return null;
}

function parseMedia(raw: unknown, fallbackImage?: string | null): string[] {
  if (Array.isArray(raw)) {
    return raw.map(String).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      /* ignore */
    }
  }
  return fallbackImage ? [fallbackImage] : [];
}

function mapDbPost(
  row: Record<string, unknown>,
  comments: FeedComment[],
  likedByMe: boolean,
  authorRole: string
): FeedPost {
  const media = parseMedia(row.media_urls, row.image_url as string | null);
  const category = normalizeCategory(row.tag ?? row.category);
  return {
    id: Number(row.id),
    community_id: Number(row.community_id),
    user_id: String(row.user_id ?? ''),
    user_name: String(row.user_name ?? 'Member'),
    user_image: (row.user_image as string | null) ?? null,
    author_role: authorRole,
    title: (row.title as string | null) ?? null,
    content: String(row.content ?? ''),
    category,
    tag: (row.tag as string | null) ?? category,
    image_url: media[0] ?? null,
    media_urls: media,
    is_pinned: Boolean(row.is_pinned),
    pinned_at: (row.pinned_at as string | null) ?? null,
    created_at: String(row.created_at ?? new Date().toISOString()),
    like_count: Number(row.like_count ?? 0),
    comment_count: Number(row.comment_count ?? comments.length),
    liked_by_me: likedByMe,
    comments,
  };
}

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized', posts: [] }, { status: 401 });
  }

  const url = new URL(request.url);
  const communityId = Number(
    url.searchParams.get('communityId') ||
      url.searchParams.get('community_id') ||
      0
  );
  if (!communityId) {
    return Response.json(
      { error: 'communityId required', posts: [] },
      { status: 400 }
    );
  }

  await ensurePostsSchema();

  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json({
      posts: listManagedFeedPosts(communityId, session.user.id),
      demo: true,
    });
  }

  try {
    const rows = await sql`
      SELECT p.*,
             (SELECT COUNT(*)::int FROM likes l WHERE l.post_id = p.id) AS like_count,
             (SELECT COUNT(*)::int FROM comments c WHERE c.post_id = p.id) AS comment_count,
             EXISTS(
               SELECT 1 FROM likes l2
               WHERE l2.post_id = p.id AND l2.user_id = ${session.user.id}
             ) AS liked_by_me,
             (
               SELECT cm.role FROM community_memberships cm
               WHERE cm.user_id = p.user_id AND cm.community_id = p.community_id
               LIMIT 1
             ) AS author_role
      FROM posts p
      WHERE p.community_id = ${communityId}
      ORDER BY p.is_pinned DESC, p.created_at DESC
      LIMIT 100
    `;

    const list = (Array.isArray(rows) ? rows : []) as Record<string, unknown>[];
    if (list.length === 0) {
      const managed = listManagedFeedPosts(communityId, session.user.id);
      return Response.json({
        posts: managed,
        demo: managed.length > 0,
      });
    }

    const postIds = list.map((r) => Number(r.id));
    const commentRows =
      postIds.length > 0
        ? await sql`
            SELECT c.*,
                   (
                     SELECT cm.role FROM community_memberships cm
                     WHERE cm.user_id = c.user_id
                       AND cm.community_id = ${communityId}
                     LIMIT 1
                   ) AS author_role,
                   u.image AS user_image
            FROM comments c
            LEFT JOIN "user" u ON u.id = c.user_id
            WHERE c.post_id = ANY(${postIds})
            ORDER BY c.created_at ASC
          `
        : [];

    const commentsByPost = new Map<number, FeedComment[]>();
    for (const raw of (Array.isArray(commentRows) ? commentRows : []) as Record<
      string,
      unknown
    >[]) {
      const pid = Number(raw.post_id);
      const listC = commentsByPost.get(pid) ?? [];
      listC.push({
        id: Number(raw.id),
        post_id: pid,
        user_id: String(raw.user_id ?? ''),
        user_name: String(raw.user_name ?? 'Member'),
        user_image: (raw.user_image as string | null) ?? null,
        content: String(raw.content ?? ''),
        parent_id: raw.parent_id != null ? Number(raw.parent_id) : null,
        created_at: String(raw.created_at ?? new Date().toISOString()),
        author_role: (raw.author_role as string | null) ?? null,
      });
      commentsByPost.set(pid, listC);
    }

    const posts = list.map((row) =>
      mapDbPost(
        row,
        commentsByPost.get(Number(row.id)) ?? [],
        Boolean(row.liked_by_me),
        String(row.author_role || 'member')
      )
    );

    // Merge any managed fallback posts for this community.
    const managed = listManagedFeedPosts(communityId, session.user.id).filter(
      (p) => p.id >= 50_000
    );
    const ids = new Set(posts.map((p) => p.id));
    for (const m of managed) {
      if (!ids.has(m.id)) posts.unshift(m);
    }

    return Response.json({ posts, demo: false });
  } catch (error) {
    console.error('[GET /api/admin/community/posts]', error);
    return Response.json({
      posts: listManagedFeedPosts(communityId, session.user.id),
      demo: true,
    });
  }
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const communityId = Number(body.communityId ?? body.community_id ?? 0);
    if (!communityId) {
      return Response.json({ error: 'communityId required' }, { status: 400 });
    }

    const content = String(body.content ?? '').trim();
    const title = String(body.title ?? '').trim();
    if (!content && !title) {
      return Response.json(
        { error: 'content_required', message: 'Write something before posting.' },
        { status: 400 }
      );
    }

    const category = normalizeCategory(body.category ?? body.tag);
    const mediaUrls = Array.isArray(body.mediaUrls)
      ? body.mediaUrls.map(String).filter(Boolean)
      : Array.isArray(body.media_urls)
        ? body.media_urls.map(String).filter(Boolean)
        : body.image_url
          ? [String(body.image_url)]
          : [];

    const role = (await memberRole(session.user.id, communityId)) || 'owner';
    const canPin = role === 'owner' || role === 'moderator' || role === 'admin';
    const wantPin = Boolean(body.isPinned ?? body.is_pinned) && canPin;

    await ensurePostsSchema();

    const payload = {
      community_id: communityId,
      user_id: session.user.id,
      user_name: session.user.name || 'Creator',
      user_image: session.user.image ?? null,
      author_role: role === 'moderator' ? 'admin' : role,
      title: title || null,
      content: content || title,
      category,
      media_urls: mediaUrls,
      is_pinned: wantPin,
    };

    if (!process.env.DATABASE_URL?.trim()) {
      const post = createManagedFeedPost(payload);
      return Response.json({ post, demo: true });
    }

    try {
      const rows = await sql`
        INSERT INTO posts (
          user_id, community_id, user_name, user_image,
          title, content, tag, image_url, media_urls,
          is_pinned, pinned_at
        ) VALUES (
          ${payload.user_id},
          ${payload.community_id},
          ${payload.user_name},
          ${payload.user_image},
          ${payload.title},
          ${payload.content},
          ${category},
          ${mediaUrls[0] ?? null},
          ${JSON.stringify(mediaUrls)},
          ${wantPin},
          ${wantPin ? new Date().toISOString() : null}
        )
        RETURNING *
      `;
      const row = rows?.[0] as Record<string, unknown> | undefined;
      if (!row?.id) throw new Error('Insert returned no row');
      const post = mapDbPost(row, [], false, payload.author_role);
      return Response.json({ post, demo: false });
    } catch (dbError) {
      console.warn('[POST posts] DB fallback', dbError);
      const post = createManagedFeedPost(payload);
      return Response.json({ post, demo: true, warning: 'persisted_in_memory' });
    }
  } catch (error) {
    console.error('[POST /api/admin/community/posts]', error);
    return Response.json(
      {
        error: 'create_failed',
        message: error instanceof Error ? error.message : 'Failed to create post',
      },
      { status: 500 }
    );
  }
}

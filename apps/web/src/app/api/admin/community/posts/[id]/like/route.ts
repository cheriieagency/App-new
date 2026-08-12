/**
 * POST /api/admin/community/posts/[id]/like — toggle like
 */

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';
import {
  findManagedFeedPost,
  toggleManagedFeedLike,
} from '@/lib/community-posts';

async function requireSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: idParam } = await ctx.params;
  const postId = Number(idParam);
  if (!postId) return Response.json({ error: 'invalid_id' }, { status: 400 });

  const managed = findManagedFeedPost(postId);
  if (managed || postId >= 50_000) {
    const result = toggleManagedFeedLike(postId, session.user.id);
    if (!result) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json({ ...result, demo: true });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const existing = await sql`
      SELECT 1 FROM likes
      WHERE post_id = ${postId} AND user_id = ${session.user.id}
      LIMIT 1
    `;
    let liked: boolean;
    if (existing?.[0]) {
      await sql`
        DELETE FROM likes
        WHERE post_id = ${postId} AND user_id = ${session.user.id}
      `;
      liked = false;
    } else {
      await sql`
        INSERT INTO likes (post_id, user_id)
        VALUES (${postId}, ${session.user.id})
        ON CONFLICT DO NOTHING
      `;
      liked = true;
    }
    const countRows = await sql`
      SELECT COUNT(*)::int AS n FROM likes WHERE post_id = ${postId}
    `;
    return Response.json({
      liked,
      like_count: Number(countRows?.[0]?.n ?? 0),
    });
  } catch (error) {
    console.error('[POST like]', error);
    const result = toggleManagedFeedLike(postId, session.user.id);
    if (result) return Response.json({ ...result, demo: true });
    return Response.json({ error: 'like_failed' }, { status: 500 });
  }
}

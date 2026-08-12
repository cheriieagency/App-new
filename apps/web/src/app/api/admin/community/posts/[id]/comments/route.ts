/**
 * POST /api/admin/community/posts/[id]/comments
 */

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';
import {
  addManagedFeedComment,
  findManagedFeedPost,
} from '@/lib/community-posts';

async function requireSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: idParam } = await ctx.params;
  const postId = Number(idParam);
  if (!postId) return Response.json({ error: 'invalid_id' }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const content = String(body.content ?? '').trim();
  if (!content) {
    return Response.json({ error: 'content_required' }, { status: 400 });
  }
  const parentId =
    body.parent_id != null || body.parentId != null
      ? Number(body.parent_id ?? body.parentId)
      : null;

  const managed = findManagedFeedPost(postId);
  if (managed || postId >= 50_000) {
    const comment = addManagedFeedComment({
      post_id: postId,
      user_id: session.user.id,
      user_name: session.user.name || 'Creator',
      user_image: session.user.image ?? null,
      content,
      parent_id: parentId,
      author_role: 'owner',
    });
    if (!comment) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json({ comment, demo: true });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const exists = await sql`SELECT id FROM posts WHERE id = ${postId}`;
    if (!exists?.[0]) return Response.json({ error: 'Not found' }, { status: 404 });

    const rows = await sql`
      INSERT INTO comments (post_id, user_id, user_name, content, parent_id)
      VALUES (
        ${postId},
        ${session.user.id},
        ${session.user.name || 'Creator'},
        ${content},
        ${parentId}
      )
      RETURNING *
    `;
    const row = rows?.[0] as Record<string, unknown>;
    return Response.json({
      comment: {
        id: Number(row.id),
        post_id: postId,
        user_id: session.user.id,
        user_name: session.user.name || 'Creator',
        user_image: session.user.image ?? null,
        content,
        parent_id: parentId,
        created_at: String(row.created_at ?? new Date().toISOString()),
        author_role: 'owner',
      },
    });
  } catch (error) {
    console.error('[POST comment]', error);
    const comment = addManagedFeedComment({
      post_id: postId,
      user_id: session.user.id,
      user_name: session.user.name || 'Creator',
      user_image: session.user.image ?? null,
      content,
      parent_id: parentId,
      author_role: 'owner',
    });
    if (comment) return Response.json({ comment, demo: true });
    return Response.json({ error: 'comment_failed' }, { status: 500 });
  }
}

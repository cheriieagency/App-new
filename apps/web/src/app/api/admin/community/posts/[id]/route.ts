/**
 * DELETE /api/admin/community/posts/[id]
 * PATCH  /api/admin/community/posts/[id] — pin / edit
 */

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';
import {
  deleteManagedFeedPost,
  findManagedFeedPost,
  updateManagedFeedPost,
} from '@/lib/community-posts';

async function requireSession() {
  return auth.api.getSession({ headers: await headers() });
}

async function canModerate(
  userId: string,
  communityId: number,
  authorId?: string | null
): Promise<boolean> {
  if (authorId && authorId === userId) return true;
  if (!process.env.DATABASE_URL?.trim()) return true;
  try {
    const rows = await sql`
      SELECT role FROM community_memberships
      WHERE user_id = ${userId} AND community_id = ${communityId}
        AND role IN ('owner', 'moderator')
      LIMIT 1
    `;
    if (rows?.[0]) return true;
    const owned = await sql`
      SELECT id FROM communities WHERE id = ${communityId} AND creator_id = ${userId}
      LIMIT 1
    `;
    return Boolean(owned?.[0]);
  } catch {
    return authorId === userId;
  }
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id: idParam } = await ctx.params;
  const id = Number(idParam);
  if (!id) return Response.json({ error: 'invalid_id' }, { status: 400 });

  const managed = findManagedFeedPost(id);
  if (managed) {
    const ok = await canModerate(
      session.user.id,
      managed.community_id,
      managed.user_id
    );
    if (!ok) return Response.json({ error: 'Forbidden' }, { status: 403 });
    deleteManagedFeedPost(managed.community_id, id);
    return Response.json({ success: true, demo: id >= 50_000 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const rows = await sql`SELECT id, user_id, community_id FROM posts WHERE id = ${id}`;
    const row = rows?.[0] as
      | { id: number; user_id: string; community_id: number }
      | undefined;
    if (!row) return Response.json({ error: 'Not found' }, { status: 404 });
    const ok = await canModerate(session.user.id, Number(row.community_id), row.user_id);
    if (!ok) return Response.json({ error: 'Forbidden' }, { status: 403 });

    await sql`DELETE FROM likes WHERE post_id = ${id}`;
    await sql`DELETE FROM comments WHERE post_id = ${id}`;
    await sql`DELETE FROM posts WHERE id = ${id}`;
    return Response.json({ success: true });
  } catch (error) {
    console.error('[DELETE post]', error);
    return Response.json({ error: 'delete_failed' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id: idParam } = await ctx.params;
  const id = Number(idParam);
  if (!id) return Response.json({ error: 'invalid_id' }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? 'update');

  const managed = findManagedFeedPost(id);
  if (managed) {
    const ok = await canModerate(
      session.user.id,
      managed.community_id,
      managed.user_id
    );
    if (!ok) return Response.json({ error: 'Forbidden' }, { status: 403 });

    if (action === 'pin' || action === 'unpin') {
      const pinned = action === 'pin';
      const post = updateManagedFeedPost(managed.community_id, id, {
        is_pinned: pinned,
        pinned_at: pinned ? new Date().toISOString() : null,
      });
      return Response.json({ post, demo: true });
    }

    const post = updateManagedFeedPost(managed.community_id, id, {
      title:
        body.title !== undefined ? String(body.title || '').trim() || null : managed.title,
      content:
        body.content !== undefined
          ? String(body.content || '').trim() || managed.content
          : managed.content,
      category:
        body.category !== undefined ? String(body.category) : managed.category,
      tag: body.category !== undefined ? String(body.category) : managed.tag,
    });
    return Response.json({ post, demo: true });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const rows = await sql`SELECT * FROM posts WHERE id = ${id}`;
    const row = rows?.[0] as Record<string, unknown> | undefined;
    if (!row) return Response.json({ error: 'Not found' }, { status: 404 });
    const communityId = Number(row.community_id);
    const ok = await canModerate(
      session.user.id,
      communityId,
      String(row.user_id)
    );
    if (!ok) return Response.json({ error: 'Forbidden' }, { status: 403 });

    if (action === 'pin' || action === 'unpin') {
      const pinned = action === 'pin';
      const updated = await sql`
        UPDATE posts
        SET is_pinned = ${pinned},
            pinned_at = ${pinned ? new Date().toISOString() : null},
            updated_at = now()
        WHERE id = ${id}
        RETURNING *
      `;
      return Response.json({ post: updated[0], success: true });
    }

    const title =
      body.title !== undefined ? String(body.title || '').trim() || null : row.title;
    const content =
      body.content !== undefined
        ? String(body.content || '').trim() || String(row.content)
        : row.content;
    const tag =
      body.category !== undefined ? String(body.category) : (row.tag as string);

    const updated = await sql`
      UPDATE posts
      SET title = ${title as string | null},
          content = ${content as string},
          tag = ${tag},
          updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `;
    return Response.json({ post: updated[0], success: true });
  } catch (error) {
    console.error('[PATCH post]', error);
    return Response.json({ error: 'update_failed' }, { status: 500 });
  }
}

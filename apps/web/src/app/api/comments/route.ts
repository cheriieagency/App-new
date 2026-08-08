import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { MOCK_COMMENTS } from '@/lib/mock-demo-content';
import { applyCommentPinOverride, demoCommentPinOverrides } from '@/lib/demo-pin-state';

function withDemoPins(comments: Array<Record<string, unknown>>) {
  return comments.map((c) =>
    applyCommentPinOverride({
      ...c,
      id: Number(c.id),
      is_pinned: Boolean(c.is_pinned),
      pinned_at: (c.pinned_at as string | null | undefined) ?? null,
    })
  );
}

function sortPinnedFirst(comments: Array<Record<string, unknown>>) {
  return [...comments].sort((a, b) => {
    const ap = a.is_pinned ? 1 : 0;
    const bp = b.is_pinned ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return (
      new Date(String(a.created_at)).getTime() - new Date(String(b.created_at)).getTime()
    );
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('post_id');
    if (!postId) return Response.json({ error: 'post_id required' }, { status: 400 });

    if (!process.env.DATABASE_URL?.trim()) {
      const mock = MOCK_COMMENTS[Number(postId)] ?? [];
      return Response.json(sortPinnedFirst(withDemoPins(mock as Array<Record<string, unknown>>)));
    }

    const comments = await sql`
      SELECT id, post_id, user_id, user_name, content, parent_id,
             media_url, media_type, is_pinned, pinned_at, created_at
      FROM comments
      WHERE post_id = ${Number(postId)}
      ORDER BY is_pinned DESC, created_at ASC
    `;
    if (!Array.isArray(comments) || comments.length === 0) {
      const mock = MOCK_COMMENTS[Number(postId)] ?? [];
      return Response.json(sortPinnedFirst(withDemoPins(mock as Array<Record<string, unknown>>)));
    }
    return Response.json(comments);
  } catch (error) {
    console.error(error);
    const { searchParams } = new URL(request.url);
    const postId = Number(searchParams.get('post_id'));
    const mock = MOCK_COMMENTS[postId] ?? [];
    return Response.json(sortPinnedFirst(withDemoPins(mock as Array<Record<string, unknown>>)));
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { action } = body as { action?: string };

    // Pin / unpin a top-level comment (community moderation).
    if (action === 'pin' || action === 'unpin') {
      const commentId = Number(body.comment_id);
      if (!commentId) {
        return Response.json({ error: 'comment_id required' }, { status: 400 });
      }
      const pinned = action === 'pin';

      if (!process.env.DATABASE_URL?.trim()) {
        demoCommentPinOverrides.set(commentId, pinned);
        return Response.json({
          success: true,
          id: commentId,
          is_pinned: pinned,
          pinned_at: pinned ? new Date().toISOString() : null,
          demo: true,
        });
      }

      const rows = await sql`
        UPDATE comments
        SET is_pinned = ${pinned},
            pinned_at = ${pinned ? new Date().toISOString() : null}
        WHERE id = ${commentId}
          AND parent_id IS NULL
        RETURNING id, post_id, is_pinned, pinned_at
      `;
      if (!rows[0]) {
        return Response.json({ error: 'Comment not found or is a reply' }, { status: 404 });
      }
      return Response.json({ success: true, ...rows[0] });
    }

    const { post_id, content, parent_id, media_url, media_type } = body;
    const text = typeof content === 'string' ? content.trim() : '';
    // Allow text, photo, or both — photo-only comments are valid.
    if (!post_id || (!text && !media_url)) {
      return Response.json(
        { error: 'post_id and content or media_url required' },
        { status: 400 }
      );
    }

    const comment = await sql`
      INSERT INTO comments (post_id, user_id, user_name, content, parent_id, media_url, media_type)
      VALUES (
        ${Number(post_id)},
        ${session.user.id},
        ${session.user.name},
        ${text || ' '},
        ${parent_id ?? null},
        ${media_url ?? null},
        ${media_type ?? null}
      )
      RETURNING *
    `;
    return Response.json({ ...comment[0], is_pinned: false });
  } catch (error) {
    console.error(error);
    if (!process.env.DATABASE_URL?.trim()) {
      const body = await request
        .clone()
        .json()
        .catch(() => ({} as Record<string, unknown>));

      if (body.action === 'pin' || body.action === 'unpin') {
        const commentId = Number(body.comment_id);
        const pinned = body.action === 'pin';
        demoCommentPinOverrides.set(commentId, pinned);
        return Response.json({
          success: true,
          id: commentId,
          is_pinned: pinned,
          pinned_at: pinned ? new Date().toISOString() : null,
          demo: true,
        });
      }

      const text = typeof body.content === 'string' ? body.content.trim() : '';
      return Response.json({
        id: Date.now(),
        post_id: Number(body.post_id),
        user_id: session.user.id,
        user_name: session.user.name,
        content: text || ' ',
        parent_id: body.parent_id ?? null,
        media_url: body.media_url ?? null,
        media_type: body.media_type ?? null,
        is_pinned: false,
        pinned_at: null,
        created_at: new Date().toISOString(),
        demo: true,
      });
    }
    return Response.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}

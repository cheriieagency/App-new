import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { applyPostPinOverride } from '@/lib/demo-pin-state';

function withDemoPins(posts: Array<Record<string, unknown>>) {
  return posts.map((p) =>
    applyPostPinOverride({
      ...p,
      id: Number(p.id),
      is_pinned: Boolean(p.is_pinned),
      pinned_at: (p.pinned_at as string | null | undefined) ?? null,
    })
  );
}

function sortPinnedFirst(posts: Array<Record<string, unknown>>) {
  return [...posts].sort((a, b) => {
    const ap = a.is_pinned ? 1 : 0;
    const bp = b.is_pinned ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return (
      new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime()
    );
  });
}

export async function GET() {
  try {
    if (!process.env.DATABASE_URL?.trim()) {
      return Response.json([]);
    }

    const posts = await sql`
      SELECT p.*,
             (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id)::int    AS like_count,
             (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id)::int AS comment_count
      FROM posts p
      ORDER BY p.is_pinned DESC, p.created_at DESC
    `;
    if (!Array.isArray(posts) || posts.length === 0) {
      return Response.json([]);
    }
    return Response.json(
      sortPinnedFirst(withDemoPins(posts as Array<Record<string, unknown>>))
    );
  } catch (error) {
    console.error(error);
    return Response.json([]);
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { action } = body as { action?: string };

    // Pin / unpin is creator-admin only (Community Admin panel).
    if (action === 'pin' || action === 'unpin') {
      return Response.json(
        { error: 'Pinning is only available in Admin' },
        { status: 403 }
      );
    }

    const { content, tag, image_url } = body as {
      content?: string;
      tag?: string | null;
      image_url?: string | null;
    };

    if (!content?.trim()) return Response.json({ error: 'Content required' }, { status: 400 });

    const post = await sql`
      INSERT INTO posts (user_id, user_name, user_image, content, tag, image_url)
      VALUES (
        ${session.user.id},
        ${session.user.name},
        ${session.user.image ?? null},
        ${content},
        ${tag ?? null},
        ${image_url ?? null}
      )
      RETURNING *
    `;
    return Response.json({
      ...post[0],
      like_count: 0,
      comment_count: 0,
      is_pinned: false,
      pinned_at: null,
    });
  } catch (error) {
    console.error(error);
    if (!process.env.DATABASE_URL?.trim()) {
      const body = await request
        .clone()
        .json()
        .catch(() => ({} as Record<string, unknown>));

      if (body.action === 'pin' || body.action === 'unpin') {
        return Response.json(
          { error: 'Pinning is only available in Admin' },
          { status: 403 }
        );
      }

      return Response.json({
        id: Date.now(),
        user_id: session.user.id,
        user_name: session.user.name,
        user_image: session.user.image ?? null,
        content: body.content,
        tag: body.tag ?? null,
        image_url: body.image_url ?? null,
        is_pinned: false,
        pinned_at: null,
        created_at: new Date().toISOString(),
        like_count: 0,
        comment_count: 0,
        demo: true,
      });
    }
    return Response.json({ error: 'Failed to create post' }, { status: 500 });
  }
}

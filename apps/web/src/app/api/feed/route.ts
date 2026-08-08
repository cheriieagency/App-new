import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET() {
  try {
    const posts = await sql`
      SELECT p.*,
             (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id)::int    AS like_count,
             (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id)::int AS comment_count
      FROM posts p
      ORDER BY p.created_at DESC
    `;
    return Response.json(posts);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { content, tag, image_url } = await request.json();
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
    return Response.json(post[0]);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to create post' }, { status: 500 });
  }
}

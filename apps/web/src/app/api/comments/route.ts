import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('post_id');
    if (!postId) return Response.json({ error: 'post_id required' }, { status: 400 });

    const comments = await sql`
      SELECT id, post_id, user_id, user_name, content, parent_id,
             media_url, media_type, created_at
      FROM comments
      WHERE post_id = ${Number(postId)}
      ORDER BY created_at ASC
    `;
    return Response.json(comments);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { post_id, content, parent_id, media_url, media_type } = await request.json();
    if (!post_id || !content?.trim()) {
      return Response.json({ error: 'post_id and content required' }, { status: 400 });
    }

    const comment = await sql`
      INSERT INTO comments (post_id, user_id, user_name, content, parent_id, media_url, media_type)
      VALUES (
        ${Number(post_id)},
        ${session.user.id},
        ${session.user.name},
        ${content},
        ${parent_id ?? null},
        ${media_url ?? null},
        ${media_type ?? null}
      )
      RETURNING *
    `;
    return Response.json(comment[0]);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}

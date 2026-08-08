import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { post_id } = await request.json();
    if (!post_id) return Response.json({ error: 'Missing post_id' }, { status: 400 });

    // Check if already liked
    const existing = await sql`
      SELECT 1 FROM likes WHERE post_id = ${post_id} AND user_id = ${session.user.id}
    `;

    if (existing.length > 0) {
      // Unlike
      await sql`DELETE FROM likes WHERE post_id = ${post_id} AND user_id = ${session.user.id}`;
      return Response.json({ liked: false });
    } else {
      // Like
      await sql`INSERT INTO likes (post_id, user_id) VALUES (${post_id}, ${session.user.id})`;
      return Response.json({ liked: true });
    }
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to toggle like' }, { status: 500 });
  }
}

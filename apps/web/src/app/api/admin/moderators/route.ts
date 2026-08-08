import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const [members, mods] = await sql.transaction([
      sql`SELECT id, name, email, image FROM "user" ORDER BY "createdAt" DESC LIMIT 50`,
      sql`
        SELECT ma.user_id, ma.community_id, u.name, u.image
        FROM moderator_assignments ma
        JOIN "user" u ON u.id = ma.user_id
      `,
    ]);

    return Response.json({ members, moderators: mods });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to fetch moderators' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { user_id, community_id, action } = await request.json();
    if (!user_id || !community_id || !action) {
      return Response.json({ error: 'Missing fields' }, { status: 400 });
    }

    if (action === 'assign') {
      await sql`
        INSERT INTO moderator_assignments (user_id, community_id, assigned_by)
        VALUES (${user_id}, ${community_id}, ${session.user.id})
        ON CONFLICT (community_id, user_id) DO NOTHING
      `;
    } else if (action === 'remove') {
      await sql`
        DELETE FROM moderator_assignments
        WHERE user_id = ${user_id} AND community_id = ${community_id}
      `;
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to update moderator' }, { status: 500 });
  }
}

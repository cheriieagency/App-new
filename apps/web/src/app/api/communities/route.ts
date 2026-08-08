import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { getMockCommunitiesForUser } from '@/lib/mock-communities';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  const userId = session?.user?.id ?? null;
  const email = session?.user?.email ?? null;
  const name = session?.user?.name ?? null;

  try {
    let communities;
    if (userId) {
      communities = await sql`
        SELECT
          c.*,
          CASE WHEN cm.user_id IS NOT NULL THEN true ELSE false END AS is_joined
        FROM communities c
        LEFT JOIN community_memberships cm
          ON cm.community_id = c.id AND cm.user_id = ${userId}
        ORDER BY c.is_featured DESC, c.member_count DESC
      `;
    } else {
      communities = await sql`
        SELECT c.*, false AS is_joined
        FROM communities c
        ORDER BY c.is_featured DESC, c.member_count DESC
      `;
    }

    if (!Array.isArray(communities) || communities.length === 0) {
      return Response.json(getMockCommunitiesForUser({ email, name }));
    }

    return Response.json(communities);
  } catch (error) {
    console.error(error);
    // Local/demo: return mocks so Ebba can test without DATABASE_URL.
    return Response.json(getMockCommunitiesForUser({ email, name }));
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { community_id, action } = await request.json();
    if (!community_id || !action) {
      return Response.json({ error: 'Missing fields' }, { status: 400 });
    }

    if (action === 'join') {
      await sql`
        INSERT INTO community_memberships (user_id, community_id)
        VALUES (${session.user.id}, ${community_id})
        ON CONFLICT DO NOTHING
      `;
      await sql`
        UPDATE communities SET member_count = member_count + 1 WHERE id = ${community_id}
      `;
    } else if (action === 'leave') {
      const deleted = await sql`
        DELETE FROM community_memberships
        WHERE user_id = ${session.user.id} AND community_id = ${community_id}
        RETURNING *
      `;
      if (deleted.length > 0) {
        await sql`
          UPDATE communities SET member_count = GREATEST(member_count - 1, 0) WHERE id = ${community_id}
        `;
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error(error);
    // Demo mode without DB: pretend join succeeded so UI can continue.
    if (!process.env.DATABASE_URL?.trim()) {
      return Response.json({ success: true, mode: 'demo-mock' });
    }
    return Response.json({ error: 'Failed to update membership' }, { status: 500 });
  }
}

import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = await sql`
      SELECT * FROM bio_blocks WHERE user_id = ${session.user.id}
    `;

    if (rows.length === 0) {
      const defaults = [
        {
          id: '1',
          type: 'lead_magnet',
          title: 'Gratis E-bok',
          subtitle: 'Ladda ned gratis',
          emoji: '📘',
          color: '#3B82F6',
          visible: true,
        },
        {
          id: '2',
          type: 'course',
          title: 'Kurs: Nordic Creator',
          subtitle: 'Onlinekurs · 12 lektioner',
          emoji: '🎓',
          color: '#8B5CF6',
          visible: true,
        },
        {
          id: '3',
          type: 'coaching',
          title: '1:1 Coaching',
          subtitle: 'Boka ett samtal',
          emoji: '🤝',
          color: '#10B981',
          visible: true,
        },
        {
          id: '4',
          type: 'community',
          title: 'Gå med i Community',
          subtitle: 'Gratis & öppet',
          emoji: '🏠',
          color: '#F59E0B',
          visible: true,
        },
      ];
      return Response.json({
        blocks: defaults,
        handle: session.user.name?.toLowerCase().replace(/\s+/g, '') ?? 'creator',
        display_name: session.user.name ?? 'Creator',
        bio_text: 'Nordic Creator · Hjälper dig växa online 🚀',
        avatar_url: session.user.image ?? null,
      });
    }

    return Response.json(rows[0]);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to fetch bio' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { blocks, handle, display_name, bio_text, avatar_url, social_links } =
      await request.json();

    const existing = await sql`SELECT id FROM bio_blocks WHERE user_id = ${session.user.id}`;

    if (existing.length > 0) {
      await sql`
        UPDATE bio_blocks
        SET blocks = ${JSON.stringify(blocks)}, handle = ${handle ?? null},
            display_name = ${display_name ?? null}, bio_text = ${bio_text ?? null},
            avatar_url = ${avatar_url ?? null},
            social_links = ${JSON.stringify(social_links ?? [])},
            updated_at = NOW()
        WHERE user_id = ${session.user.id}
      `;
    } else {
      await sql`
        INSERT INTO bio_blocks (user_id, blocks, handle, display_name, bio_text, avatar_url, social_links)
        VALUES (${session.user.id}, ${JSON.stringify(blocks)}, ${handle ?? null},
                ${display_name ?? null}, ${bio_text ?? null}, ${avatar_url ?? null},
                ${JSON.stringify(social_links ?? [])})
      `;
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to save bio' }, { status: 500 });
  }
}

import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { DEFAULT_BIO_THEME, normalizeBioTheme } from '@/lib/bio-theme';

const DEFAULT_BLOCKS = [
  {
    id: '1',
    type: 'lead_magnet',
    category: 'links',
    title: 'Gratis E-bok',
    subtitle: 'Ladda ned gratis',
    emoji: '📘',
    color: '#3B82F6',
    visible: true,
  },
  {
    id: '2',
    type: 'course',
    category: 'links',
    title: 'Kurs: clikd:',
    subtitle: 'Onlinekurs · 12 lektioner',
    emoji: '🎓',
    color: '#8B5CF6',
    visible: true,
  },
  {
    id: '3',
    type: 'coaching',
    category: 'links',
    title: '1:1 Coaching',
    subtitle: 'Boka ett samtal',
    emoji: '🤝',
    color: '#10B981',
    visible: true,
  },
  {
    id: '4',
    type: 'community',
    category: 'links',
    title: 'Gå med i Community',
    subtitle: 'Gratis & öppet',
    emoji: '🏠',
    color: '#F59E0B',
    visible: true,
  },
  {
    id: 's1',
    type: 'store',
    category: 'store',
    title: 'Creator Starter Pack',
    subtitle: 'Extern butik',
    emoji: '🛒',
    color: '#9b8afb',
    visible: true,
    destination_url: 'https://example.com/starter-pack',
    utm_slug: 'starter-pack-s1',
  },
  {
    id: 's2',
    type: 'store',
    category: 'store',
    title: 'Live Studio Hook Pack',
    subtitle: 'Digital produkt',
    emoji: '📦',
    color: '#0f766e',
    visible: true,
    destination_url: 'https://example.com/hook-pack',
    utm_slug: 'hook-pack-s2',
  },
];

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    try {
      const rows = await sql`
        SELECT * FROM bio_blocks WHERE user_id = ${session.user.id}
      `;

      if (rows.length === 0) {
        return Response.json({
          blocks: DEFAULT_BLOCKS,
          handle: session.user.name?.toLowerCase().replace(/\s+/g, '') ?? 'creator',
          display_name: session.user.name ?? 'Creator',
          bio_text: 'clikd: · Hjälper dig växa online 🚀',
          avatar_url: session.user.image ?? null,
          theme: DEFAULT_BIO_THEME,
        });
      }

      const row = rows[0] as Record<string, unknown>;
      return Response.json({
        ...row,
        theme: normalizeBioTheme(row.theme as Parameters<typeof normalizeBioTheme>[0]),
      });
    } catch (dbError) {
      console.error(dbError);
      return Response.json({
        blocks: DEFAULT_BLOCKS,
        handle: session.user.name?.toLowerCase().replace(/\s+/g, '') ?? 'creator',
        display_name: session.user.name ?? 'Creator',
        bio_text: 'clikd: · Hjälper dig växa online 🚀',
        avatar_url: session.user.image ?? null,
        theme: DEFAULT_BIO_THEME,
        demo: true,
      });
    }
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to fetch bio' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { blocks, handle, display_name, bio_text, avatar_url, social_links, theme } =
      await request.json();
    const normalizedTheme = normalizeBioTheme(theme);

    try {
      const existing = await sql`SELECT id FROM bio_blocks WHERE user_id = ${session.user.id}`;

      if (existing.length > 0) {
        await sql`
          UPDATE bio_blocks
          SET blocks = ${JSON.stringify(blocks)}, handle = ${handle ?? null},
              display_name = ${display_name ?? null}, bio_text = ${bio_text ?? null},
              avatar_url = ${avatar_url ?? null},
              social_links = ${JSON.stringify(social_links ?? [])},
              theme = ${JSON.stringify(normalizedTheme)},
              updated_at = NOW()
          WHERE user_id = ${session.user.id}
        `;
        const cleanHandle = String(handle ?? '')
          .replace(/^@/, '')
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9._-]/g, '') || 'creator';
        return Response.json({
          success: true,
          first_publish: false,
          handle: cleanHandle,
          theme: normalizedTheme,
        });
      } else {
        await sql`
          INSERT INTO bio_blocks (user_id, blocks, handle, display_name, bio_text, avatar_url, social_links, theme)
          VALUES (${session.user.id}, ${JSON.stringify(blocks)}, ${handle ?? null},
                  ${display_name ?? null}, ${bio_text ?? null}, ${avatar_url ?? null},
                  ${JSON.stringify(social_links ?? [])}, ${JSON.stringify(normalizedTheme)})
        `;
        const cleanHandle = String(handle ?? '')
          .replace(/^@/, '')
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9._-]/g, '') || 'creator';
        return Response.json({
          success: true,
          first_publish: true,
          handle: cleanHandle,
          theme: normalizedTheme,
        });
      }
    } catch (dbError) {
      // Demo mode without DB — accept save so the UI can continue.
      console.error(dbError);
      const cleanHandle = String(handle ?? '')
        .replace(/^@/, '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '') || 'creator';
      return Response.json({
        success: true,
        first_publish: false,
        handle: cleanHandle,
        theme: normalizedTheme,
        demo: true,
      });
    }
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to save bio' }, { status: 500 });
  }
}

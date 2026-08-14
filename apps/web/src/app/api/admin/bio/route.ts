import { bioBlockSlug } from '@/lib/bio-utm';
import {
  registerBioBlocksAsDestinations,
} from '@/lib/bio-clicks/persist';
import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { DEFAULT_BIO_THEME, normalizeBioTheme } from '@/lib/bio-theme';

/** Empty bio until the creator adds real blocks — no seeded demo products. */
const DEFAULT_BLOCKS: Array<Record<string, unknown>> = [];

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
          bio_text: '',
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
        bio_text: '',
        avatar_url: session.user.image ?? null,
        theme: DEFAULT_BIO_THEME,
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
    const body = await request.json();
    const { blocks, handle, display_name, bio_text, avatar_url, social_links, theme } =
      body as Record<string, unknown>;
    const normalizedTheme = normalizeBioTheme(
      theme as Parameters<typeof normalizeBioTheme>[0]
    );
    const workspaceId = String(
      body.workspaceId ||
        body.workspace_id ||
        request.headers.get('x-workspace-id') ||
        `user:${session.user.id}`
    ).trim();
    const blockList = Array.isArray(blocks)
      ? (blocks as Array<Record<string, unknown>>)
      : [];

    const cleanHandle = String(handle ?? '')
      .replace(/^@/, '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '') || 'creator';

    // Ensure every published link has a durable /r/{slug} destination for click tracking.
    const ensureDestinations = async () => {
      try {
        const withSlugs = blockList.map((b) => ({
          ...b,
          utm_slug: String(b.utm_slug || bioBlockSlug(b as { id?: string; title?: string; utm_slug?: string })),
        }));
        await registerBioBlocksAsDestinations({
          workspaceId,
          userId: session.user.id,
          handle: cleanHandle,
          blocks: withSlugs,
        });
      } catch (err) {
        console.warn('[admin/bio] destination register failed', err);
      }
    };

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
        await ensureDestinations();
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
        await ensureDestinations();
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
      await ensureDestinations();
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

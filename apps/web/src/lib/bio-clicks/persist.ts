/**
 * Durable Link-in-bio click ledger.
 * Powers Analytics → Link in bio from real /bio and /r/{slug} traffic.
 */

import { createHash, randomBytes } from 'crypto';
import sql from '@/app/api/utils/sql';

export type BioClickInput = {
  workspaceId: string;
  userId?: string | null;
  handle?: string | null;
  slug: string;
  blockId?: string | null;
  title?: string | null;
  destinationUrl?: string | null;
  visitorKey?: string | null;
};

export type BioLinkDestination = {
  slug: string;
  workspace_id: string;
  user_id: string | null;
  handle: string | null;
  title: string | null;
  destination_url: string;
  block_id: string | null;
};

export type BioLinkClickAgg = {
  slug: string;
  title: string | null;
  block_id: string | null;
  destination_url: string | null;
  clicks: number;
  unique: number;
};

let schemaReady: Promise<void> | null = null;

export async function ensureBioClicksSchema(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  if (schemaReady) return schemaReady;

  schemaReady = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS public.bio_link_destinations (
        slug text PRIMARY KEY,
        workspace_id text NOT NULL,
        user_id text,
        handle text,
        title text,
        destination_url text NOT NULL,
        block_id text,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS bio_link_destinations_workspace_idx
        ON public.bio_link_destinations (workspace_id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS bio_link_destinations_handle_idx
        ON public.bio_link_destinations (handle)
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS public.bio_link_clicks (
        id text PRIMARY KEY,
        workspace_id text NOT NULL,
        user_id text,
        handle text,
        slug text NOT NULL,
        block_id text,
        title text,
        destination_url text,
        visitor_key text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS bio_link_clicks_workspace_created_idx
        ON public.bio_link_clicks (workspace_id, created_at DESC)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS bio_link_clicks_slug_created_idx
        ON public.bio_link_clicks (slug, created_at DESC)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS bio_link_clicks_handle_created_idx
        ON public.bio_link_clicks (handle, created_at DESC)
    `;
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });

  return schemaReady;
}

export function hashVisitorKey(parts: {
  ip?: string | null;
  ua?: string | null;
  cookie?: string | null;
}): string {
  if (parts.cookie?.trim()) return parts.cookie.trim().slice(0, 64);
  const raw = `${parts.ip || '0'}|${(parts.ua || '').slice(0, 120)}`;
  return createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

export async function upsertBioLinkDestination(input: {
  slug: string;
  workspaceId: string;
  userId?: string | null;
  handle?: string | null;
  title?: string | null;
  destinationUrl: string;
  blockId?: string | null;
}): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  const slug = input.slug.trim();
  const destination = input.destinationUrl.trim();
  if (!slug || !destination) return;

  await ensureBioClicksSchema();
  await sql`
    INSERT INTO public.bio_link_destinations (
      slug, workspace_id, user_id, handle, title, destination_url, block_id, updated_at
    ) VALUES (
      ${slug},
      ${input.workspaceId},
      ${input.userId ?? null},
      ${input.handle ? String(input.handle).replace(/^@/, '').toLowerCase() : null},
      ${input.title ?? null},
      ${destination},
      ${input.blockId ?? null},
      now()
    )
    ON CONFLICT (slug) DO UPDATE SET
      workspace_id = EXCLUDED.workspace_id,
      user_id = COALESCE(EXCLUDED.user_id, public.bio_link_destinations.user_id),
      handle = COALESCE(EXCLUDED.handle, public.bio_link_destinations.handle),
      title = COALESCE(EXCLUDED.title, public.bio_link_destinations.title),
      destination_url = EXCLUDED.destination_url,
      block_id = COALESCE(EXCLUDED.block_id, public.bio_link_destinations.block_id),
      updated_at = now()
  `;
}

export async function resolveBioLinkDestination(
  slug: string
): Promise<BioLinkDestination | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  const clean = slug.trim();
  if (!clean) return null;

  await ensureBioClicksSchema();
  const rows = await sql`
    SELECT slug, workspace_id, user_id, handle, title, destination_url, block_id
    FROM public.bio_link_destinations
    WHERE slug = ${clean}
    LIMIT 1
  `;
  const row = rows?.[0] as BioLinkDestination | undefined;
  if (row?.destination_url) return row;

  // Fallback: scan published bio_blocks JSON for matching utm_slug / id.
  try {
    const bios = await sql`
      SELECT user_id, handle, blocks
      FROM bio_blocks
      WHERE blocks::text ILIKE ${'%' + clean + '%'}
      LIMIT 8
    `;
    for (const bio of bios || []) {
      const blocks = parseBlocks((bio as { blocks?: unknown }).blocks);
      for (const b of blocks) {
        const blockSlug =
          String(b.utm_slug || '').trim() ||
          (b.id ? `bio-${b.id}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-') : '');
        const alt = b.id ? `store-${b.id}` : '';
        if (blockSlug !== clean && alt !== clean) continue;
        const destination = String(b.destination_url || b.url || '').trim();
        if (!destination) continue;
        const handle = String((bio as { handle?: string }).handle || '')
          .replace(/^@/, '')
          .toLowerCase();
        const dest: BioLinkDestination = {
          slug: clean,
          workspace_id: `user:${(bio as { user_id?: string }).user_id || 'unknown'}`,
          user_id: String((bio as { user_id?: string }).user_id || '') || null,
          handle: handle || null,
          title: String(b.title || 'Link'),
          destination_url: destination,
          block_id: b.id ? String(b.id) : null,
        };
        await upsertBioLinkDestination({
          slug: clean,
          workspaceId: dest.workspace_id,
          userId: dest.user_id,
          handle: dest.handle,
          title: dest.title,
          destinationUrl: destination,
          blockId: dest.block_id,
        });
        return dest;
      }
    }
  } catch {
    /* ignore scan errors */
  }

  return null;
}

export async function recordBioLinkClick(input: BioClickInput): Promise<boolean> {
  if (!process.env.DATABASE_URL?.trim()) return false;
  const slug = input.slug.trim();
  const workspaceId = input.workspaceId.trim();
  if (!slug || !workspaceId) return false;

  await ensureBioClicksSchema();
  const id = `clk_${Date.now().toString(36)}_${randomBytes(4).toString('hex')}`;
  const handle = input.handle
    ? String(input.handle).replace(/^@/, '').toLowerCase()
    : null;

  await sql`
    INSERT INTO public.bio_link_clicks (
      id, workspace_id, user_id, handle, slug, block_id, title,
      destination_url, visitor_key, created_at
    ) VALUES (
      ${id},
      ${workspaceId},
      ${input.userId ?? null},
      ${handle},
      ${slug},
      ${input.blockId ?? null},
      ${input.title ?? null},
      ${input.destinationUrl ?? null},
      ${input.visitorKey ?? null},
      now()
    )
  `;

  if (input.destinationUrl?.trim()) {
    await upsertBioLinkDestination({
      slug,
      workspaceId,
      userId: input.userId,
      handle,
      title: input.title,
      destinationUrl: input.destinationUrl,
      blockId: input.blockId,
    });
  }

  return true;
}

export async function aggregateBioLinkClicks(opts: {
  workspaceId: string;
  handle?: string | null;
  from?: string | null;
  to?: string | null;
}): Promise<BioLinkClickAgg[]> {
  if (!process.env.DATABASE_URL?.trim()) return [];
  const workspaceId = opts.workspaceId.trim();
  if (!workspaceId) return [];

  await ensureBioClicksSchema();
  const handle = opts.handle
    ? String(opts.handle).replace(/^@/, '').toLowerCase()
    : null;
  const fromIso = opts.from
    ? `${opts.from.slice(0, 10)}T00:00:00.000Z`
    : '1970-01-01T00:00:00.000Z';
  const toIso = opts.to
    ? `${opts.to.slice(0, 10)}T23:59:59.999Z`
    : '2999-12-31T23:59:59.999Z';

  const rows = handle
    ? await sql`
        SELECT
          slug,
          MAX(title) AS title,
          MAX(block_id) AS block_id,
          MAX(destination_url) AS destination_url,
          COUNT(*)::int AS clicks,
          COUNT(DISTINCT NULLIF(visitor_key, ''))::int AS unique_visitors
        FROM public.bio_link_clicks
        WHERE created_at >= ${fromIso}::timestamptz
          AND created_at <= ${toIso}::timestamptz
          AND (workspace_id = ${workspaceId} OR handle = ${handle})
        GROUP BY slug
        ORDER BY clicks DESC
      `
    : await sql`
        SELECT
          slug,
          MAX(title) AS title,
          MAX(block_id) AS block_id,
          MAX(destination_url) AS destination_url,
          COUNT(*)::int AS clicks,
          COUNT(DISTINCT NULLIF(visitor_key, ''))::int AS unique_visitors
        FROM public.bio_link_clicks
        WHERE created_at >= ${fromIso}::timestamptz
          AND created_at <= ${toIso}::timestamptz
          AND workspace_id = ${workspaceId}
        GROUP BY slug
        ORDER BY clicks DESC
      `;

  return (rows || []).map((r) => {
    const row = r as Record<string, unknown>;
    const clicks = Number(row.clicks) || 0;
    const unique = Number(row.unique_visitors) || 0;
    return {
      slug: String(row.slug || ''),
      title: row.title ? String(row.title) : null,
      block_id: row.block_id ? String(row.block_id) : null,
      destination_url: row.destination_url ? String(row.destination_url) : null,
      clicks,
      unique: Math.max(unique, clicks > 0 ? 1 : 0),
    };
  });
}

export async function registerBioBlocksAsDestinations(input: {
  workspaceId: string;
  userId?: string | null;
  handle?: string | null;
  blocks: Array<Record<string, unknown>>;
}): Promise<number> {
  let n = 0;
  const handle = input.handle
    ? String(input.handle).replace(/^@/, '').toLowerCase()
    : null;
  for (const b of input.blocks) {
    if (b.visible === false) continue;
    const type = String(b.type || '');
    if (type === 'divider' || type === 'header' || type === 'text') continue;
    const id = b.id != null ? String(b.id) : '';
    const slug =
      String(b.utm_slug || '').trim() ||
      (id ? `bio-${id}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-') : '');
    const destination = String(b.destination_url || b.url || '').trim();
    if (!slug || !destination) continue;
    await upsertBioLinkDestination({
      slug,
      workspaceId: input.workspaceId,
      userId: input.userId,
      handle,
      title: String(b.title || 'Link'),
      destinationUrl: destination,
      blockId: id || null,
    });
    n += 1;
  }
  return n;
}

function parseBlocks(raw: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(raw)) return raw as Array<Record<string, unknown>>;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as Array<Record<string, unknown>>) : [];
    } catch {
      return [];
    }
  }
  return [];
}

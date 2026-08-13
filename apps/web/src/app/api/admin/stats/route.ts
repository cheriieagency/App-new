import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { seedDemoUtmStats, registerDemoDestination } from '@/lib/bio-utm';

type BioStoreBlock = {
  id?: string;
  type?: string;
  category?: string;
  title?: string;
  destination_url?: string;
  url?: string;
  utm_slug?: string;
  visible?: boolean;
};

const ZERO_STATS = {
  members: 0,
  rsvps: 0,
  products: 0,
  revenue: 0,
  emails: [] as unknown[],
  utm_links: [] as ReturnType<typeof seedDemoUtmStats>,
  utm_total_clicks: 0,
  views: 0,
  reach: 0,
  engagement: 0,
};

function rowCount(rows: unknown): number {
  const list = Array.isArray(rows) ? rows : [];
  const topItem = (list?.[0] || {}) as { count?: unknown };
  const n = Number(topItem?.count);
  return Number.isFinite(n) ? n : 0;
}

async function safeCount(query: Promise<unknown>): Promise<number> {
  try {
    return rowCount(await query);
  } catch (error) {
    console.warn('[admin/stats] count query failed', error);
    return 0;
  }
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const handleFallback =
    session.user.name?.toLowerCase().replace(/\s+/g, '') ?? 'creator';

  try {
    // Prefer a transaction when available; fall back to individual queries.
    let membersResult: unknown;
    let rsvpResult: unknown;
    let productResult: unknown;
    let emailList: unknown = [];
    let bioRows: unknown = [];

    try {
      const tx = await sql.transaction([
        sql`SELECT COUNT(*)::int AS count FROM "user"`,
        sql`SELECT COUNT(*)::int AS count FROM rsvps`,
        sql`SELECT COUNT(*)::int AS count FROM products`,
        sql`SELECT email, name, "createdAt" AS created_at FROM "user" ORDER BY "createdAt" DESC LIMIT 100`,
        sql`SELECT blocks, handle FROM bio_blocks WHERE user_id = ${session.user.id} LIMIT 1`,
      ]);
      membersResult = tx?.[0];
      rsvpResult = tx?.[1];
      productResult = tx?.[2];
      emailList = tx?.[3];
      bioRows = tx?.[4];
    } catch (txError) {
      console.warn(
        '[admin/stats] transaction failed — using per-query fallback',
        txError
      );
      const [m, r, p, emails, bio] = await Promise.all([
        safeCount(sql`SELECT COUNT(*)::int AS count FROM "user"`),
        safeCount(sql`SELECT COUNT(*)::int AS count FROM rsvps`),
        safeCount(sql`SELECT COUNT(*)::int AS count FROM products`),
        (async () => {
          try {
            return await sql`
              SELECT email, name, "createdAt" AS created_at
              FROM "user"
              ORDER BY "createdAt" DESC
              LIMIT 100
            `;
          } catch {
            return [];
          }
        })(),
        (async () => {
          try {
            return await sql`
              SELECT blocks, handle
              FROM bio_blocks
              WHERE user_id = ${session.user.id}
              LIMIT 1
            `;
          } catch {
            return [];
          }
        })(),
      ]);
      // Encode counts as pseudo-rows so rowCount works uniformly.
      membersResult = [{ count: m }];
      rsvpResult = [{ count: r }];
      productResult = [{ count: p }];
      emailList = emails;
      bioRows = bio;
    }

    const members = rowCount(membersResult);
    const rsvps = rowCount(rsvpResult);
    const products = rowCount(productResult);
    const revenue = members * 199 + (members > 0 ? 4760 : 0);

    const bioList = Array.isArray(bioRows) ? bioRows : [];
    const bio = (bioList?.[0] || {}) as {
      blocks?: BioStoreBlock[] | string;
      handle?: string;
    };
    const handle = bio?.handle || handleFallback;

    let blocks: BioStoreBlock[] = [];
    if (typeof bio?.blocks === 'string') {
      try {
        const parsed = JSON.parse(bio.blocks);
        blocks = Array.isArray(parsed) ? parsed : [];
      } catch {
        blocks = [];
      }
    } else if (Array.isArray(bio?.blocks)) {
      blocks = bio.blocks;
    }

    const storeProducts = blocks
      .filter(
        (b) =>
          b?.visible !== false &&
          (b?.category === 'store' || b?.type === 'store') &&
          (b?.destination_url || b?.url)
      )
      .map((b) => {
        const slug = b?.utm_slug || `store-${b?.id || 'item'}`;
        const destination = String(b?.destination_url || b?.url || '');
        registerDemoDestination(slug, {
          destination,
          handle,
          title: b?.title || 'Store product',
        });
        return {
          slug,
          title: b?.title || 'Store product',
          destination_url: destination,
          handle,
        };
      });

    const utm_links =
      storeProducts.length > 0 ? seedDemoUtmStats(storeProducts) : [];
    const emails = Array.isArray(emailList) ? emailList : [];

    return Response.json({
      members,
      rsvps,
      products,
      revenue,
      emails,
      utm_links,
      utm_total_clicks: utm_links.reduce((n, row) => n + (row?.clicks || 0), 0),
      // Default zero metrics so clients never read undefined[0].
      views: 0,
      reach: 0,
      engagement: 0,
    });
  } catch (error) {
    console.error('[admin/stats]', error);
    void handleFallback;
    return Response.json({ ...ZERO_STATS });
  }
}

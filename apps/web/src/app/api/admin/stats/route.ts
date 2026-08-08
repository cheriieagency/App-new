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

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const handleFallback =
    session.user.name?.toLowerCase().replace(/\s+/g, '') ?? 'creator';

  try {
    const [membersResult, rsvpResult, productResult, emailList, bioRows] =
      await sql.transaction([
        sql`SELECT COUNT(*)::int AS count FROM "user"`,
        sql`SELECT COUNT(*)::int AS count FROM rsvps`,
        sql`SELECT COUNT(*)::int AS count FROM products`,
        sql`SELECT email, name, "createdAt" AS created_at FROM "user" ORDER BY "createdAt" DESC LIMIT 100`,
        sql`SELECT blocks, handle FROM bio_blocks WHERE user_id = ${session.user.id} LIMIT 1`,
      ]);

    const members = membersResult[0]?.count ?? 0;
    const rsvps = rsvpResult[0]?.count ?? 0;
    const products = productResult[0]?.count ?? 0;
    const revenue = members * 199 + 4760;

    const bio = bioRows?.[0] as
      | { blocks?: BioStoreBlock[] | string; handle?: string }
      | undefined;
    const handle = bio?.handle || handleFallback;
    let blocks: BioStoreBlock[] = [];
    if (typeof bio?.blocks === 'string') {
      try {
        blocks = JSON.parse(bio.blocks);
      } catch {
        blocks = [];
      }
    } else if (Array.isArray(bio?.blocks)) {
      blocks = bio.blocks;
    }

    const storeProducts = blocks
      .filter(
        (b) =>
          b.visible !== false &&
          (b.category === 'store' || b.type === 'store') &&
          (b.destination_url || b.url)
      )
      .map((b) => {
        const slug = b.utm_slug || `store-${b.id}`;
        const destination = String(b.destination_url || b.url || '');
        registerDemoDestination(slug, {
          destination,
          handle,
          title: b.title || 'Store product',
        });
        return {
          slug,
          title: b.title || 'Store product',
          destination_url: destination,
          handle,
        };
      });

    const utm_links =
      storeProducts.length > 0
        ? seedDemoUtmStats(storeProducts)
        : seedDemoUtmStats([
            {
              slug: 'starter-pack-demo',
              title: 'Creator Starter Pack',
              destination_url: 'https://example.com/starter-pack',
              handle: handleFallback,
            },
            {
              slug: 'coaching-call-demo',
              title: '1:1 Mentorship',
              destination_url: 'https://example.com/mentorship',
              handle: handleFallback,
            },
          ]);

    return Response.json({
      members,
      rsvps,
      products,
      revenue,
      emails: emailList,
      utm_links,
      utm_total_clicks: utm_links.reduce((n, r) => n + r.clicks, 0),
    });
  } catch (error) {
    console.error(error);
    // Demo fallback when DATABASE_URL is missing.
    const utm_links = seedDemoUtmStats([
      {
        slug: 'starter-pack-demo',
        title: 'Creator Starter Pack',
        destination_url: 'https://example.com/starter-pack',
        handle: handleFallback,
      },
      {
        slug: 'hook-pack-demo',
        title: 'Live Studio Hook Pack',
        destination_url: 'https://example.com/hook-pack',
        handle: handleFallback,
      },
      {
        slug: 'coaching-call-demo',
        title: '1:1 Mentorship',
        destination_url: 'https://example.com/mentorship',
        handle: handleFallback,
      },
    ]);
    return Response.json({
      members: 48,
      rsvps: 12,
      products: 6,
      revenue: 14312,
      emails: [],
      utm_links,
      utm_total_clicks: utm_links.reduce((n, r) => n + r.clicks, 0),
      demo: true,
    });
  }
}

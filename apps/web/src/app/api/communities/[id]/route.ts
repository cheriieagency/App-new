/**
 * GET /api/communities/[id]
 * Resolve a single published community for the public About page.
 */

import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { extractCommunityPrice } from '@/lib/communities/pricing';
import { getMockCommunitiesForUser } from '@/lib/mock-communities';
import { listPublicCatalogCommunities } from '@/lib/public-communities-store';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  const { id: idOrSlug } = await context.params;
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  const userId = session?.user?.id ?? null;
  const email = session?.user?.email ?? null;
  const name = session?.user?.name ?? null;

  const asPublic = (raw: Record<string, unknown>) => {
    const pricing = extractCommunityPrice(raw);
    return {
      id: Number(raw.id),
      name: String(raw.name ?? 'Community'),
      description: String(raw.description ?? ''),
      category: String(raw.category ?? 'Community'),
      creator_name: String(raw.creator_name ?? ''),
      creator_image: (raw.creator_image as string | null) ?? null,
      cover_color: (raw.cover_color as string | null) ?? '#2B2568',
      member_count: Number(raw.member_count ?? 0),
      is_featured: Boolean(raw.is_featured),
      is_joined: Boolean(raw.is_joined),
      slug: (raw.slug as string | null) ?? null,
      monthly_price: pricing.monthly_price,
      price: pricing.price,
      is_free: pricing.is_free,
      workspace_id: pricing.workspace_id,
      creator_id: pricing.creator_id,
      is_published: raw.is_published !== false,
    };
  };

  try {
    if (process.env.DATABASE_URL?.trim()) {
      const isNumeric = /^\d+$/.test(idOrSlug);
      const rows = isNumeric
        ? userId
          ? await sql`
              SELECT c.*,
                CASE WHEN cm.user_id IS NOT NULL THEN true ELSE false END AS is_joined
              FROM communities c
              LEFT JOIN community_memberships cm
                ON cm.community_id = c.id AND cm.user_id = ${userId}
              WHERE c.id = ${Number(idOrSlug)}
                AND COALESCE(c.is_published, true) = true
              LIMIT 1
            `
          : await sql`
              SELECT c.*, false AS is_joined
              FROM communities c
              WHERE c.id = ${Number(idOrSlug)}
                AND COALESCE(c.is_published, true) = true
              LIMIT 1
            `
        : userId
          ? await sql`
              SELECT c.*,
                CASE WHEN cm.user_id IS NOT NULL THEN true ELSE false END AS is_joined
              FROM communities c
              LEFT JOIN community_memberships cm
                ON cm.community_id = c.id AND cm.user_id = ${userId}
              WHERE c.slug = ${idOrSlug}
                AND COALESCE(c.is_published, true) = true
              LIMIT 1
            `
          : await sql`
              SELECT c.*, false AS is_joined
              FROM communities c
              WHERE c.slug = ${idOrSlug}
                AND COALESCE(c.is_published, true) = true
              LIMIT 1
            `;

      if (Array.isArray(rows) && rows[0]) {
        return Response.json({ community: asPublic(rows[0] as Record<string, unknown>) });
      }
    }
  } catch (error) {
    console.error('[GET /api/communities/[id]]', error);
  }

  const catalog = [
    ...listPublicCatalogCommunities({ email, name, userId }),
    ...getMockCommunitiesForUser({ email, name }),
  ];
  const found =
    catalog.find((c) => String(c.id) === idOrSlug || c.slug === idOrSlug) ?? null;
  if (!found) {
    return Response.json({ error: 'not_found', community: null }, { status: 404 });
  }
  return Response.json({ community: found });
}

/**
 * GET /api/communities — public catalog for site users (search, join, about).
 * POST /api/communities — join / leave membership.
 */

import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { getMockCommunitiesForUser } from '@/lib/mock-communities';
import { fireEmailAutomations, persistSubscriber } from '@/lib/email/crm-persist';
import { syncSubscriber } from '@/lib/mock-email-crm';
import { getSiteUrl } from '@/lib/site';
import { extractCommunityPrice } from '@/lib/communities/pricing';
import {
  listPublicCatalogCommunities,
  publishCommunityToPublicCatalog,
} from '@/lib/public-communities-store';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  const userId = session?.user?.id ?? null;
  const email = session?.user?.email ?? null;
  const name = session?.user?.name ?? null;

  try {
    if (!process.env.DATABASE_URL?.trim()) {
      return Response.json(getMockCommunitiesForUser({ email, name }));
    }

    let communities;
    if (userId) {
      communities = await sql`
        SELECT
          c.*,
          CASE WHEN cm.user_id IS NOT NULL THEN true ELSE false END AS is_joined
        FROM communities c
        LEFT JOIN community_memberships cm
          ON cm.community_id = c.id AND cm.user_id = ${userId}
        WHERE COALESCE(c.is_published, true) = true
        ORDER BY c.is_featured DESC, c.member_count DESC, c.created_at DESC
      `;
    } else {
      communities = await sql`
        SELECT c.*, false AS is_joined
        FROM communities c
        WHERE COALESCE(c.is_published, true) = true
        ORDER BY c.is_featured DESC, c.member_count DESC, c.created_at DESC
      `;
    }

    if (Array.isArray(communities) && communities.length > 0) {
      // Keep catalog warm for about-page fallbacks — preserve admin pricing.
      const publicRows = communities.map((raw) => {
        const c = raw as Record<string, unknown>;
        const pricing = extractCommunityPrice(c);
        const row = {
          ...c,
          id: Number(c.id),
          name: String(c.name ?? 'Community'),
          description: String(c.description ?? ''),
          category: String(c.category ?? 'Community'),
          creator_name: String(c.creator_name ?? ''),
          creator_image: (c.creator_image as string | null) ?? null,
          cover_color: (c.cover_color as string | null) ?? '#2B2568',
          member_count: Number(c.member_count ?? 0),
          is_featured: Boolean(c.is_featured),
          is_joined: Boolean(c.is_joined),
          slug: (c.slug as string | null) ?? null,
          monthly_price: pricing.monthly_price,
          price: pricing.price,
          is_free: pricing.is_free,
          workspace_id: pricing.workspace_id,
          creator_id: pricing.creator_id,
        };
        publishCommunityToPublicCatalog(row);
        return row;
      });
      return Response.json(publicRows);
    }

    // DB empty — include any in-memory / demo published communities.
    const catalog = listPublicCatalogCommunities({ email, name, userId });
    if (catalog.length > 0) return Response.json(catalog);
    return Response.json(getMockCommunitiesForUser({ email, name }));
  } catch (error) {
    console.error('[GET /api/communities]', error);
    return Response.json(getMockCommunitiesForUser({ email, name }));
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const community_id = body.community_id;
  const action = body.action as string | undefined;

  try {
    if (!community_id || !action) {
      return Response.json({ error: 'Missing fields' }, { status: 400 });
    }

    if (action === 'join') {
      await sql`
        INSERT INTO community_memberships (user_id, community_id, role)
        VALUES (${session.user.id}, ${community_id}, 'member')
        ON CONFLICT (user_id, community_id) DO NOTHING
      `;
      await sql`
        UPDATE communities SET member_count = member_count + 1 WHERE id = ${community_id}
      `;
      // Auto-sync to creator Email CRM + fire welcome automation.
      try {
        const owners = await sql`
          SELECT creator_id, name FROM communities WHERE id = ${Number(community_id)} LIMIT 1
        `;
        const creatorId = owners?.[0]?.creator_id as string | undefined;
        const communityName =
          String(owners?.[0]?.name ?? '').trim() || `Community ${community_id}`;
        if (creatorId && session.user.email) {
          await persistSubscriber({
            creatorId,
            email: session.user.email,
            name: session.user.name || 'Medlem',
            userId: session.user.id,
            image: session.user.image ?? null,
            source: 'community_member',
            communityId: Number(community_id),
            tags: ['Community Member'],
          });
          void fireEmailAutomations({
            creatorId,
            communityId: Number(community_id),
            communityName,
            communityUrl: `${getSiteUrl()}/community/${community_id}`,
            trigger: 'community_join',
            recipientEmail: session.user.email,
            recipientName: session.user.name || 'Medlem',
          }).catch((err) =>
            console.warn('[communities/join] automation failed', err)
          );
        } else {
          syncSubscriber({
            email: session.user.email,
            name: session.user.name || 'Medlem',
            user_id: session.user.id,
            image: session.user.image ?? null,
            source: 'community_member',
            community_id: Number(community_id),
            extra_tags: ['Community Member'],
          });
        }
      } catch {
        syncSubscriber({
          email: session.user.email,
          name: session.user.name || 'Medlem',
          user_id: session.user.id,
          image: session.user.image ?? null,
          source: 'community_member',
          community_id: Number(community_id),
          extra_tags: ['Community Member'],
        });
      }
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
      if (action === 'join') {
        syncSubscriber({
          email: session.user.email,
          name: session.user.name || 'Medlem',
          user_id: session.user.id,
          image: session.user.image ?? null,
          source: 'community_member',
          community_id: Number(community_id) || null,
          extra_tags: ['Community Member'],
        });
      }
      return Response.json({ success: true, mode: 'demo-mock' });
    }
    return Response.json({ error: 'Failed to update membership' }, { status: 500 });
  }
}

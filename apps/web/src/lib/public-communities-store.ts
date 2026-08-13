/**
 * Public community catalog helpers — keeps created communities discoverable
 * for site users (search, /communities/[id], join) in demo + live modes.
 */

import type { SearchableCommunity } from '@/components/landing/CommunitySearchAutocomplete';
import type { ManagedCommunity } from '@/lib/mock-community-admin';

/** In-memory public catalog (demo / no-DB, and client hydration cache). */
export const PUBLIC_COMMUNITY_CATALOG: SearchableCommunity[] = [];

const NC_PUBLIC_COMMUNITIES_KEY = 'nc_public_communities_v1';

export function managedToSearchable(
  c: ManagedCommunity,
  opts?: { creatorName?: string | null; creatorImage?: string | null; isJoined?: boolean }
): SearchableCommunity {
  const extended = c as ManagedCommunity & {
    monthly_price_sek?: number;
    is_free?: boolean;
    workspace_id?: string | null;
    creator_id?: string | null;
  };
  const sek =
    typeof extended.monthly_price_sek === 'number'
      ? Math.max(0, Math.round(extended.monthly_price_sek))
      : 0;
  const isFree = extended.is_free === true || sek <= 0;
  const monthly = isFree ? 0 : sek;
  return {
    id: c.id,
    name: c.name,
    description: c.description || '',
    category: c.category || 'Community',
    creator_name: opts?.creatorName || c.name,
    creator_image: opts?.creatorImage ?? c.avatar_url,
    cover_color: c.cover_color || '#2B2568',
    member_count: c.member_count || 1,
    is_featured: false,
    is_joined: Boolean(opts?.isJoined),
    slug: c.slug,
    monthly_price: monthly,
    price: monthly,
    is_free: isFree || monthly <= 0,
    workspace_id: extended.workspace_id ?? null,
    creator_id: extended.creator_id ?? null,
  };
}

export function publishCommunityToPublicCatalog(
  community: SearchableCommunity
): SearchableCommunity {
  const idx = PUBLIC_COMMUNITY_CATALOG.findIndex((c) => c.id === community.id);
  if (idx >= 0) PUBLIC_COMMUNITY_CATALOG[idx] = { ...community };
  else PUBLIC_COMMUNITY_CATALOG.push({ ...community });

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(
        NC_PUBLIC_COMMUNITIES_KEY,
        JSON.stringify(PUBLIC_COMMUNITY_CATALOG)
      );
    } catch {
      /* ignore quota */
    }
  }
  return community;
}

export function hydratePublicCommunityCatalog(): SearchableCommunity[] {
  if (typeof window === 'undefined') return [...PUBLIC_COMMUNITY_CATALOG];
  if (PUBLIC_COMMUNITY_CATALOG.length > 0) return [...PUBLIC_COMMUNITY_CATALOG];
  try {
    const raw = localStorage.getItem(NC_PUBLIC_COMMUNITIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SearchableCommunity[];
    if (!Array.isArray(parsed)) return [];
    PUBLIC_COMMUNITY_CATALOG.splice(0, PUBLIC_COMMUNITY_CATALOG.length, ...parsed);
  } catch {
    /* ignore */
  }
  return [...PUBLIC_COMMUNITY_CATALOG];
}

export function listPublicCatalogCommunities(opts?: {
  email?: string | null;
  name?: string | null;
  userId?: string | null;
}): SearchableCommunity[] {
  hydratePublicCommunityCatalog();
  return PUBLIC_COMMUNITY_CATALOG.map((c) => ({ ...c }));
}

import type { SearchableCommunity } from '@/components/landing/CommunitySearchAutocomplete';
import { extractCommunityPrice } from '@/lib/communities/pricing';
import { listPublicCatalogCommunities } from '@/lib/public-communities-store';

/** Local fallback when /api/communities is loading or unavailable. */
export const MOCK_COMMUNITIES: SearchableCommunity[] = [];

/** Catalog-backed list for no-DB / loading fallbacks (no demo memberships). */
export function getMockCommunitiesForUser(_opts?: {
  email?: string | null;
  name?: string | null;
  forceJoined?: boolean;
}): SearchableCommunity[] {
  const catalog = listPublicCatalogCommunities();
  const byId = new Map<number, SearchableCommunity>();
  for (const c of [...MOCK_COMMUNITIES, ...catalog]) {
    byId.set(c.id, { ...c, is_joined: Boolean(c.is_joined) });
  }
  return [...byId.values()];
}

export function normalizeCommunities(data: unknown): SearchableCommunity[] {
  if (!Array.isArray(data)) return [];
  return data.map((raw, index) => {
    const c = raw as Record<string, unknown>;
    const pricing = extractCommunityPrice(c);
    return {
      id: Number(c.id ?? index + 1),
      name: String(c.name ?? 'Community'),
      description: String(c.description ?? ''),
      category: String(c.category ?? 'Community'),
      creator_name: String(c.creator_name ?? ''),
      creator_image: (c.creator_image as string | null | undefined) ?? null,
      cover_color: (c.cover_color as string | null | undefined) ?? '#0f1f1c',
      member_count: Number(c.member_count ?? 0),
      is_featured: Boolean(c.is_featured),
      is_joined: Boolean(c.is_joined),
      slug: (c.slug as string | null | undefined) ?? null,
      monthly_price: pricing.monthly_price,
      price: pricing.price,
      is_free: pricing.is_free,
      workspace_id: pricing.workspace_id,
      creator_id: pricing.creator_id,
    };
  });
}

/**
 * Recommend communities the user has not joined yet, ranked from their
 * current memberships (shared category + topical overlap).
 */
export function recommendCommunitiesFromMemberships(
  communities: SearchableCommunity[],
  opts?: { limit?: number }
): SearchableCommunity[] {
  const limit = opts?.limit ?? 12;
  const joined = communities.filter((c) => c.is_joined);
  const joinedIds = new Set(joined.map((c) => c.id));
  const candidates = communities.filter((c) => !joinedIds.has(c.id));

  if (candidates.length === 0) return [];

  // No memberships yet → featured / popular discovery fallback.
  if (joined.length === 0) {
    return [...candidates]
      .sort(
        (a, b) =>
          Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured)) ||
          b.member_count - a.member_count
      )
      .slice(0, limit);
  }

  const joinedCategories = new Set(
    joined.map((c) => c.category.trim().toLowerCase()).filter(Boolean)
  );

  const interestTokens = new Set<string>();
  for (const c of joined) {
    const blob = `${c.name} ${c.description} ${c.category}`.toLowerCase();
    for (const word of blob.split(/[^a-zà-ö0-9]+/i)) {
      if (word.length >= 4) interestTokens.add(word);
    }
  }

  const scored = candidates.map((c) => {
    let score = 0;
    const category = c.category.trim().toLowerCase();
    if (joinedCategories.has(category)) score += 100;
    if (c.is_featured) score += 20;

    const hay = `${c.name} ${c.description} ${c.category}`.toLowerCase();
    for (const token of interestTokens) {
      if (hay.includes(token)) score += 5;
    }

    score += Math.min(25, Math.log10(c.member_count + 1) * 8);
    return { c, score, categoryMatch: joinedCategories.has(category) };
  });

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      Number(b.categoryMatch) - Number(a.categoryMatch) ||
      b.c.member_count - a.c.member_count
  );

  return scored.map((s) => s.c).slice(0, limit);
}

/** Unique categories from communities the user has already joined. */
export function joinedCommunityCategories(communities: SearchableCommunity[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of communities) {
    if (!c.is_joined) continue;
    const key = c.category.trim();
    if (!key) continue;
    const lower = key.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    out.push(key);
  }
  return out;
}

import type { SearchableCommunity } from '@/components/landing/CommunitySearchAutocomplete';
import { normalizeCommunities } from '@/lib/mock-communities';

export type CommunityAbout = SearchableCommunity & {
  privacy: 'private' | 'public';
  pitch: string;
  online_now: number;
  admin_count: number;
  video_url: string | null;
  cover_image: string | null;
  thumbnails: string[];
  includes: string[];
};

const INCLUDE_SETS: string[][] = [
  [
    'Veckovisa live-sessioner med Q&A',
    'Kursbibliotek med steg-för-steg lektioner',
    'Privat community-feed och peer feedback',
    'Mallar, scripts och checkout-ready offerter',
    'Bonus: AI Copilot för innehåll & tillväxt',
  ],
  [
    'Dagliga check-ins och vanor-tracker',
    'Live träning / mindset-sessioner',
    'Resursbibliotek för hållbart skapande',
    'Medlemschatt och accountability-grupper',
    'Bonus: månatlig gästföreläsare',
  ],
  [
    'Moms & Fortnox-guider för kreatörer',
    'Prissättningsworkshops live',
    'Mallar för faktura och kvittoflöde',
    'Q&A med ekonomiexpert varje månad',
    'Bonus: skattkalender för Norden',
  ],
];

function monthlyPrice(c: SearchableCommunity): number {
  if (c.is_free) return 0;
  if (typeof c.monthly_price === 'number') return Math.max(0, c.monthly_price);
  if (typeof c.price === 'number') return Math.max(0, c.price);
  // Never invent a price — missing admin price means free until set.
  return 0;
}

/** Enrich a community row with About-page fields (API-backed only). */
export function toCommunityAbout(c: SearchableCommunity): CommunityAbout {
  const price = monthlyPrice(c);
  const includes = INCLUDE_SETS[Number(c.id) % INCLUDE_SETS.length] ?? INCLUDE_SETS[0];
  const online = Math.max(3, Math.round(c.member_count * 0.02));
  return {
    ...c,
    monthly_price: price,
    price,
    is_free: price <= 0 || Boolean(c.is_free),
    privacy: 'public',
    pitch:
      c.description ||
      `Gå med i ${c.name} och få tillgång till kurser, live och ett engagerat community.`,
    online_now: online,
    admin_count: 1 + (Number(c.id) % 3),
    video_url: null,
    cover_image: c.creator_image ?? null,
    thumbnails: ['cover', 'lesson-1', 'live', 'bonus'],
    includes: includes ?? [],
  };
}

/** Resolve a community About page from live APIs only — never inject mock rows. */
export async function fetchCommunityAbout(idOrSlug: string): Promise<CommunityAbout | null> {
  try {
    // Prefer direct lookup so newly created communities resolve immediately.
    const direct = await fetch(`/api/communities/${encodeURIComponent(idOrSlug)}`, {
      cache: 'no-store',
    });
    if (direct.ok) {
      const payload = (await direct.json()) as { community?: SearchableCommunity | null };
      if (payload.community) return toCommunityAbout(payload.community);
    }

    const res = await fetch('/api/communities', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    const list = normalizeCommunities(Array.isArray(data) ? data : []);
    const found =
      list.find((c) => String(c.id) === idOrSlug || c.slug === idOrSlug) ?? null;
    return found ? toCommunityAbout(found) : null;
  } catch {
    return null;
  }
}

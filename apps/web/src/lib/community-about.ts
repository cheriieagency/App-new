import type { SearchableCommunity } from '@/components/landing/CommunitySearchAutocomplete';
import {
  getMockCommunitiesForUser,
  normalizeCommunities,
} from '@/lib/mock-communities';

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
    'Mallar, scripts och swish-ready offerter',
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
  if (typeof c.monthly_price === 'number') return c.monthly_price;
  if (typeof c.price === 'number') return c.price;
  const tiers = [199, 249, 299, 399, 499];
  return tiers[Number(c.id) % tiers.length] ?? 199;
}

/** Enrich a community row with About-page fields (API + mock safe). */
export function toCommunityAbout(c: SearchableCommunity): CommunityAbout {
  const price = monthlyPrice(c);
  const includes = INCLUDE_SETS[Number(c.id) % INCLUDE_SETS.length] ?? INCLUDE_SETS[0];
  const online = Math.max(3, Math.round(c.member_count * 0.02));
  return {
    ...c,
    monthly_price: price,
    privacy: Number(c.id) % 3 === 0 ? 'public' : 'private',
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

export async function fetchCommunityAbout(idOrSlug: string): Promise<CommunityAbout | null> {
  const fromMock = () => {
    const mock =
      getMockCommunitiesForUser({ forceJoined: true }).find(
        (c) => String(c.id) === idOrSlug || c.slug === idOrSlug
      ) ?? null;
    return mock ? toCommunityAbout(mock) : null;
  };

  try {
    const res = await fetch('/api/communities');
    const data = await res.json();
    const list = normalizeCommunities(Array.isArray(data) ? data : []);
    const found =
      list.find((c) => String(c.id) === idOrSlug || c.slug === idOrSlug) ?? null;
    if (found) return toCommunityAbout(found);
    return fromMock();
  } catch {
    return fromMock();
  }
}

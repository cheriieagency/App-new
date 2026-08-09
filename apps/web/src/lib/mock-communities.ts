import type { SearchableCommunity } from '@/components/landing/CommunitySearchAutocomplete';

/** Test account used for local / membership QA. */
export const EBBA_TEST_USER = {
  email: 'ebbabrobeck@test.se',
  name: 'Ebba Brobeck',
  password: 'ebba1234',
} as const;

/** Slugs for the two communities Ebba is a member of. */
export const EBBA_MEMBER_COMMUNITY_SLUGS = [
  'ebba-creator-lab',
  'ebba-live-studio',
] as const;

/** Local fallback when /api/communities is loading or unavailable. */
export const MOCK_COMMUNITIES: SearchableCommunity[] = [
  {
    id: 101,
    name: 'Ebba Creator Lab',
    slug: 'ebba-creator-lab',
    description:
      'Hands-on creator community — feed, courses, events and member tools for Nordic marketers.',
    category: 'Marknadsföring',
    creator_name: 'Ebba Brobeck',
    creator_image: null,
    cover_color: '#6366f1',
    member_count: 48,
    is_featured: false,
    monthly_price: 199,
    is_joined: false,
  },
  {
    id: 102,
    name: 'Ebba Live Studio',
    slug: 'ebba-live-studio',
    description: 'Live webinars, RSVP and realtime chat for coaching-led audiences.',
    category: 'Coaching',
    creator_name: 'Ebba Brobeck',
    creator_image: null,
    cover_color: '#0369a1',
    member_count: 32,
    is_featured: false,
    monthly_price: 299,
    is_joined: false,
  },
  {
    id: 103,
    name: 'Svensk E-handel & Growth',
    slug: 'svensk-ehandel-growth',
    description: 'Growth playbooks, Swish funnels and e-commerce tactics for Swedish brands.',
    category: 'E-handel',
    creator_name: 'Maja Lind',
    creator_image: null,
    cover_color: '#059669',
    member_count: 128,
    is_featured: false,
    monthly_price: 149,
  },
  {
    id: 1,
    name: 'Nordic Creator Hub',
    slug: 'nordic-creator',
    description:
      'The ultimate community for Nordic digital creators & educators. Weekly live Q&As, course library, Swish funnel templates, and private member chat.',
    category: 'Marknadsföring',
    creator_name: 'Sofia Bergström',
    creator_image: null,
    cover_color: '#312e81',
    member_count: 1340,
    is_featured: true,
    monthly_price: 199,
  },
  {
    id: 2,
    name: 'Healthy Growth',
    slug: 'healthy-growth',
    description: 'Habits, training and mindset for sustainable creator energy.',
    category: 'Health',
    creator_name: 'Lisa Holm',
    creator_image: null,
    cover_color: '#be123c',
    member_count: 640,
    monthly_price: 199,
  },
  {
    id: 3,
    name: 'Creator Finance Lab',
    slug: 'creator-finance',
    description: 'VAT, Fortnox and pricing without the headache — built for Nordic sellers.',
    category: 'Finance',
    creator_name: 'Erik Nyström',
    creator_image: null,
    cover_color: '#b45309',
    member_count: 890,
    monthly_price: 399,
  },
  {
    id: 4,
    name: 'Coaching Lab Nordics',
    slug: 'coaching-lab',
    description: 'Peer coaching, XP and live sessions every week.',
    category: 'Coaching',
    creator_name: 'Nora Lind',
    creator_image: null,
    cover_color: '#0369a1',
    member_count: 420,
    monthly_price: 499,
  },
];

export function isEbbaTestUser(email?: string | null, name?: string | null): boolean {
  const e = (email ?? '').toLowerCase();
  const n = (name ?? '').toLowerCase();
  return (
    e.includes('ebbabrobeck') ||
    e === EBBA_TEST_USER.email ||
    n.includes('ebbabrobeck') ||
    n.includes('ebba brobeck')
  );
}

/** Mock list with Ebba's two communities marked as joined when session matches. */
export function getMockCommunitiesForUser(opts?: {
  email?: string | null;
  name?: string | null;
  forceJoined?: boolean;
}): SearchableCommunity[] {
  const markJoined = opts?.forceJoined || isEbbaTestUser(opts?.email, opts?.name);
  return MOCK_COMMUNITIES.map((c) => ({
    ...c,
    is_joined:
      markJoined &&
      EBBA_MEMBER_COMMUNITY_SLUGS.includes(
        c.slug as (typeof EBBA_MEMBER_COMMUNITY_SLUGS)[number]
      )
        ? true
        : Boolean(c.is_joined),
  }));
}

export function normalizeCommunities(data: unknown): SearchableCommunity[] {
  if (!Array.isArray(data)) return [];
  return data.map((raw, index) => {
    const c = raw as Record<string, unknown>;
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
      monthly_price:
        typeof c.monthly_price === 'number'
          ? c.monthly_price
          : typeof c.price === 'number'
            ? c.price
            : null,
      price: typeof c.price === 'number' ? c.price : null,
    };
  });
}

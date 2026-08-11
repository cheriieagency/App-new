/** Demo store catalog for community products & services. */

import {
  DEFAULT_COLLECT_FIELDS,
  DEFAULT_ORDER_BUMP,
  normalizeCollectFields,
  normalizeOrderBump,
  type CollectField,
  type OrderBump,
} from '@/lib/store-collect-fields';

export type StoreKind = 'product' | 'service';

export type StoreProductType =
  | 'ebook'
  | 'course'
  | 'digital'
  | 'coaching'
  | 'service'
  | 'community'
  | 'other';

export type StoreProduct = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  type: StoreProductType;
  kind: StoreKind;
  image_url: string | null;
  community_id: number | null;
  is_published: boolean;
  created_at: string;
  /** Creator-configured checkout form fields. */
  collect_fields: CollectField[];
  /** Optional order bump upsell at checkout. */
  order_bump: OrderBump | null;
  /** Purchase unlocks membership; buyer gets an automated community email. */
  grants_community_access?: boolean;
  /** Community the buyer is invited to when grants_community_access is true. */
  access_community_id?: number | null;
};

export type { CollectField, OrderBump };

export const PRODUCT_TYPES: StoreProductType[] = [
  'ebook',
  'course',
  'digital',
  'other',
];
export const SERVICE_TYPES: StoreProductType[] = [
  'coaching',
  'service',
  'community',
  'other',
];

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

/** Runtime creates / overrides in demo mode (no DATABASE_URL). */
let demoOverrides = new Map<number, StoreProduct>();
const deletedIds = new Set<number>();
let nextId = 900;

function withCheckoutDefaults(
  product: Omit<StoreProduct, 'collect_fields' | 'order_bump'> & {
    collect_fields?: CollectField[];
    order_bump?: OrderBump | null;
  }
): StoreProduct {
  return {
    ...product,
    collect_fields: normalizeCollectFields(product.collect_fields),
    order_bump: product.order_bump
      ? normalizeOrderBump(product.order_bump)
      : { ...DEFAULT_ORDER_BUMP },
  };
}

export const MOCK_STORE_PRODUCTS: StoreProduct[] = [
  withCheckoutDefaults({
    id: 801,
    name: 'Creator Starter Pack',
    description: 'E-bok + CapCut-templates + launch-checklist för din första launch.',
    price: 199,
    currency: 'SEK',
    type: 'ebook',
    kind: 'product',
    image_url:
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd0c?w=800&q=80',
    community_id: 101,
    is_published: true,
    created_at: daysAgo(12),
    grants_community_access: true,
    access_community_id: 101,
    order_bump: {
      enabled: true,
      title: '⚡ Lägg till arbetsbok för +49 kr',
      price: 49,
      description: 'Bonus-PDF med övningar och templates',
    },
  }),
  withCheckoutDefaults({
    id: 802,
    name: 'Live Workshop Replay',
    description: 'Inspelning + slides från launch-workshopen.',
    price: 349,
    currency: 'SEK',
    type: 'course',
    kind: 'product',
    image_url:
      'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=800&q=80',
    community_id: 101,
    is_published: true,
    created_at: daysAgo(8),
  }),
  withCheckoutDefaults({
    id: 803,
    name: '1:1 Creator Mentorship',
    description: '60 min coaching med kreatören — erbjudande, funnel och prissättning.',
    price: 1490,
    currency: 'SEK',
    type: 'coaching',
    kind: 'service',
    image_url:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=80',
    community_id: 101,
    is_published: true,
    created_at: daysAgo(5),
    collect_fields: [
      ...DEFAULT_COLLECT_FIELDS,
      {
        id: 'context',
        label: 'Please provide additional context on how I can help you!',
        type: 'textarea',
        required: true,
        visible: true,
      },
    ],
  }),
  withCheckoutDefaults({
    id: 804,
    name: 'Ebba Creator Lab — Månad',
    description: 'Full access till community + classroom i 30 dagar.',
    price: 199,
    currency: 'SEK',
    type: 'community',
    kind: 'service',
    image_url:
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80',
    community_id: 101,
    is_published: true,
    created_at: daysAgo(20),
    grants_community_access: true,
    access_community_id: 101,
  }),
  withCheckoutDefaults({
    id: 805,
    name: 'Live Studio Hook Pack',
    description: '20 färdiga hooks + CapCut-templates för live-webbinarier.',
    price: 149,
    currency: 'SEK',
    type: 'digital',
    kind: 'product',
    image_url:
      'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=800&q=80',
    community_id: 102,
    is_published: true,
    created_at: daysAgo(6),
    order_bump: {
      enabled: true,
      title: '⚡ Lägg till CapCut pack för +29 kr',
      price: 29,
      description: 'Extra templates för hooks',
    },
  }),
  withCheckoutDefaults({
    id: 806,
    name: 'Live Session Review',
    description: '30 min feedback på din senaste live — pitch, CTA och tempo.',
    price: 890,
    currency: 'SEK',
    type: 'service',
    kind: 'service',
    image_url:
      'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&q=80',
    community_id: 102,
    is_published: true,
    created_at: daysAgo(3),
    collect_fields: [
      ...DEFAULT_COLLECT_FIELDS.map((f) =>
        f.id === 'phone' ? { ...f, required: true } : { ...f }
      ),
      {
        id: 'replay-link',
        label: 'Link to your latest live replay',
        type: 'text',
        required: true,
        visible: true,
      },
    ],
  }),
];

export function kindForType(type: string): StoreKind {
  if (type === 'coaching' || type === 'service' || type === 'community') {
    return 'service';
  }
  return 'product';
}

function allDemoProducts(): StoreProduct[] {
  const byId = new Map<number, StoreProduct>();
  for (const p of MOCK_STORE_PRODUCTS) {
    if (!deletedIds.has(p.id)) byId.set(p.id, p);
  }
  for (const p of demoOverrides.values()) {
    if (!deletedIds.has(p.id)) byId.set(p.id, p);
  }
  return Array.from(byId.values());
}

export function listDemoStoreProducts(
  communityId?: number,
  opts?: { includeDrafts?: boolean }
) {
  let list = allDemoProducts();
  // clikd: (id 1) sees the full platform catalog — same as Classroom.
  if (communityId != null && communityId !== 1) {
    list = list.filter((p) => p.community_id === communityId);
  }
  if (!opts?.includeDrafts) {
    list = list.filter((p) => p.is_published);
  }
  return list.slice().sort((a, b) => Number(a.price) - Number(b.price));
}

export function getMockStoreAdmin(communityId?: number) {
  return {
    products: listDemoStoreProducts(communityId, { includeDrafts: true }),
    demo: true as const,
  };
}

export function demoCreateStoreProduct(input: {
  name: string;
  description?: string | null;
  price: number;
  type: StoreProductType;
  kind?: StoreKind;
  image_url?: string | null;
  community_id?: number | null;
  is_published?: boolean;
  currency?: string;
  collect_fields?: CollectField[];
  order_bump?: OrderBump | null;
}): StoreProduct {
  const product = withCheckoutDefaults({
    id: nextId++,
    name: input.name,
    description: input.description ?? null,
    price: Number(input.price) || 0,
    currency: input.currency ?? 'SEK',
    type: input.type,
    kind: input.kind ?? kindForType(input.type),
    image_url: input.image_url ?? null,
    community_id: input.community_id ?? null,
    is_published: input.is_published ?? true,
    created_at: new Date().toISOString(),
    collect_fields: input.collect_fields,
    order_bump: input.order_bump ?? { ...DEFAULT_ORDER_BUMP },
  });
  demoOverrides.set(product.id, product);
  return product;
}

export function demoUpdateStoreProduct(
  id: number,
  patch: Partial<StoreProduct>
): StoreProduct | null {
  const current =
    demoOverrides.get(id) ?? MOCK_STORE_PRODUCTS.find((p) => p.id === id);
  if (!current || deletedIds.has(id)) return null;
  const updated = withCheckoutDefaults({
    ...current,
    ...patch,
    id,
    collect_fields:
      patch.collect_fields !== undefined
        ? patch.collect_fields
        : current.collect_fields,
    order_bump:
      patch.order_bump !== undefined ? patch.order_bump : current.order_bump,
  });
  demoOverrides.set(id, updated);
  return updated;
}

export function demoDeleteStoreProduct(id: number): boolean {
  deletedIds.add(id);
  demoOverrides.delete(id);
  return true;
}

/** Bridge for legacy MOCK_PRODUCTS consumers (admin content tab / seed). */
export const MOCK_PRODUCTS = MOCK_STORE_PRODUCTS.map((p) => ({
  id: p.id,
  name: p.name,
  description: p.description,
  price: p.price,
  currency: p.currency,
  type: p.type,
  kind: p.kind,
  image_url: p.image_url,
  community_id: p.community_id,
  is_published: p.is_published,
  collect_fields: p.collect_fields,
  order_bump: p.order_bump,
}));

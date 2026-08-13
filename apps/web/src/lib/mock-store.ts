/** Demo store catalog for community products & services. */

import {
  DEFAULT_COLLECT_FIELDS,
  DEFAULT_FULFILLMENT,
  DEFAULT_ORDER_BUMP,
  MEMBER_ONE_CLICK_COLLECT_FIELDS,
  normalizeBillingInterval,
  normalizeCollectFields,
  normalizeFulfillment,
  normalizeOrderBump,
  type BillingInterval,
  type CollectField,
  type OfferFulfillment,
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

/** High-level offer pill in Community Store admin. */
export type OfferTypePill = 'digital' | 'course' | 'coaching';

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
  workspace_id?: string | null;
  is_published: boolean;
  created_at: string;
  collect_fields: CollectField[];
  order_bump: OrderBump | null;
  billing_interval?: BillingInterval;
  fulfillment?: OfferFulfillment;
  require_custom_fields?: boolean;
  grants_community_access?: boolean;
  access_community_id?: number | null;
  /** Bio coaching: create Google Calendar + Meet on purchase */
  google_calendar_enabled?: boolean;
};

export type { CollectField, OrderBump, BillingInterval, OfferFulfillment };

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

export function offerPillFromProduct(p: Pick<StoreProduct, 'type' | 'kind'>): OfferTypePill {
  if (p.type === 'course') return 'course';
  if (p.kind === 'service' || p.type === 'coaching' || p.type === 'service') {
    return 'coaching';
  }
  return 'digital';
}

export function productFieldsFromOfferPill(pill: OfferTypePill): {
  kind: StoreKind;
  type: StoreProductType;
} {
  if (pill === 'course') return { kind: 'product', type: 'course' };
  if (pill === 'coaching') return { kind: 'service', type: 'coaching' };
  return { kind: 'product', type: 'digital' };
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

/** Runtime creates / overrides in demo mode (no DATABASE_URL). */
let demoOverrides = new Map<number, StoreProduct>();
const deletedIds = new Set<number>();
let nextId = 900;

function withCheckoutDefaults(
  product: Omit<StoreProduct, 'collect_fields' | 'order_bump' | 'fulfillment' | 'billing_interval'> & {
    collect_fields?: CollectField[];
    order_bump?: OrderBump | null;
    fulfillment?: OfferFulfillment;
    billing_interval?: BillingInterval;
    require_custom_fields?: boolean;
  }
): StoreProduct {
  return {
    ...product,
    collect_fields: normalizeCollectFields(
      product.collect_fields ?? MEMBER_ONE_CLICK_COLLECT_FIELDS
    ),
    order_bump: product.order_bump
      ? normalizeOrderBump(product.order_bump)
      : { ...DEFAULT_ORDER_BUMP },
    fulfillment: normalizeFulfillment(product.fulfillment ?? DEFAULT_FULFILLMENT),
    billing_interval: normalizeBillingInterval(
      product.billing_interval ?? 'one_time'
    ),
    require_custom_fields: Boolean(product.require_custom_fields),
  };
}

export const MOCK_STORE_PRODUCTS: StoreProduct[] = [];

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
  workspace_id?: string | null;
  is_published?: boolean;
  currency?: string;
  collect_fields?: CollectField[];
  order_bump?: OrderBump | null;
  billing_interval?: BillingInterval;
  fulfillment?: OfferFulfillment;
  require_custom_fields?: boolean;
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
    workspace_id: input.workspace_id ?? null,
    is_published: input.is_published ?? true,
    created_at: new Date().toISOString(),
    collect_fields: input.collect_fields ?? MEMBER_ONE_CLICK_COLLECT_FIELDS,
    order_bump: input.order_bump ?? { ...DEFAULT_ORDER_BUMP },
    billing_interval: input.billing_interval ?? 'one_time',
    fulfillment: input.fulfillment ?? { ...DEFAULT_FULFILLMENT },
    require_custom_fields: input.require_custom_fields ?? false,
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

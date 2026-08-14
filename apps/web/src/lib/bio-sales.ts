/**
 * Link-in-bio checkout sales ledger (workspace-scoped).
 * Powers Analytics → Revenue + Link in bio from Bio Builder purchases.
 */

import {
  buildTrackedShortUrl,
  bioBlockSlug,
  getDemoClickCount,
  getDemoUniqueCount,
  type UtmClickStat,
} from '@/lib/bio-utm';
import type {
  WorkspaceAnalyticsData,
  WorkspaceBioBlock,
  WorkspaceProfile,
} from '@/lib/mock-workspace-profiles';

export type BioSale = {
  id: string;
  workspace_id: string;
  block_id: string;
  product_title: string;
  category: string;
  amount_sek: number;
  currency: string;
  created_at: string;
  buyer_email?: string | null;
};

export type BioProductPerf = {
  id: string;
  name: string;
  category: string;
  clicks: number;
  purchases: number;
  conversion: string;
  revenue_sek: number;
  live: boolean;
  slug: string;
};

const SALES_STORAGE_KEY = 'nc_bio_sales_v1';

function readSales(): BioSale[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SALES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BioSale[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSales(rows: BioSale[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(rows));
  } catch {
    /* ignore quota */
  }
}

export function listBioSales(workspaceId?: string | null): BioSale[] {
  const all = readSales();
  if (!workspaceId) return all;
  return all.filter((s) => s.workspace_id === workspaceId);
}

/** Record a completed Link-in-bio / Bio Builder checkout. */
export function recordBioSale(input: {
  workspaceId: string;
  blockId: string;
  productTitle: string;
  category?: string;
  amountSek: number;
  currency?: string;
  buyerEmail?: string | null;
}): BioSale {
  const sale: BioSale = {
    id: `sale_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    workspace_id: input.workspaceId,
    block_id: input.blockId,
    product_title: input.productTitle,
    category: input.category || 'store',
    amount_sek: Math.max(0, Math.round(Number(input.amountSek) || 0)),
    currency: input.currency || 'SEK',
    created_at: new Date().toISOString(),
    buyer_email: input.buyerEmail ?? null,
  };
  writeSales([sale, ...readSales()]);
  return sale;
}

export function sumBioRevenueSek(
  workspaceId: string,
  opts?: { from?: string; to?: string }
): number {
  const fromMs = opts?.from ? new Date(`${opts.from}T00:00:00`).getTime() : 0;
  const toMs = opts?.to
    ? new Date(`${opts.to}T23:59:59`).getTime()
    : Number.POSITIVE_INFINITY;
  return listBioSales(workspaceId).reduce((sum, s) => {
    const t = new Date(s.created_at).getTime();
    if (t < fromMs || t > toMs) return sum;
    return sum + s.amount_sek;
  }, 0);
}

/** Last N days of checkout revenue (oldest → newest), for the Revenue chart. */
export function bioRevenueChart(workspaceId: string, days = 7): number[] {
  const sales = listBioSales(workspaceId);
  const out: number[] = [];
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayTotal = sales
      .filter((s) => s.created_at.slice(0, 10) === key)
      .reduce((sum, s) => sum + s.amount_sek, 0);
    out.push(dayTotal);
  }
  return out;
}

/** Last N days of bio link/product clicks (proxy visitors for the dual chart). */
export function bioClicksChart(
  links: UtmClickStat[],
  days = 7
): number[] {
  const total = links.reduce((s, l) => s + l.clicks, 0);
  if (total <= 0) return Array.from({ length: days }, () => 0);
  // Distribute clicks across the range with a slight weekend lift.
  const base = total / days;
  return Array.from({ length: days }, (_, i) => {
    const weekendBoost = i === days - 1 || i === days - 2 ? 1.25 : 1;
    return Math.max(0, Math.round(base * weekendBoost * (0.75 + (i % 3) * 0.12)));
  });
}

function blockUnitPrice(block: WorkspaceBioBlock): number {
  const price = typeof block.price === 'number' ? block.price : null;
  const sale =
    typeof block.sale_price === 'number' &&
    price != null &&
    block.sale_price >= 0 &&
    block.sale_price < price
      ? block.sale_price
      : null;
  return Math.max(0, Math.round(sale ?? price ?? 0));
}

function blockSlug(block: WorkspaceBioBlock): string {
  return bioBlockSlug(block);
}

/** Monetizable Bio Builder blocks (store + priced links). */
export function listBioCommerceBlocks(
  blocks: WorkspaceBioBlock[]
): WorkspaceBioBlock[] {
  return blocks.filter((b) => {
    if (b.visible === false) return false;
    if (b.category === 'store' || b.type === 'store') return true;
    return typeof b.price === 'number' && b.price >= 0;
  });
}

/** All clickable Link-in-bio rows (links + store) for analytics. */
export function listBioTrackableBlocks(
  blocks: WorkspaceBioBlock[]
): WorkspaceBioBlock[] {
  return blocks.filter((b) => {
    if (b.visible === false) return false;
    if (b.type === 'divider' || b.type === 'header' || b.type === 'text') {
      return false;
    }
    return Boolean(b.title || b.destination_url || b.url || b.utm_slug);
  });
}

export type BioClickOverride = {
  clicks: number;
  unique: number;
};

/** Build UTM rows from Bio Builder Active blocks + live click counters (or API overrides). */
export function buildBioUtmLinks(
  profile: Pick<WorkspaceProfile, 'bio' | 'handle'>,
  opts?: {
    clickStats?: Record<string, BioClickOverride> | Map<string, BioClickOverride>;
    /** When true, missing clickStats entries are 0 (API loaded). When false, fall back to demo map. */
    preferClickStats?: boolean;
  }
): UtmClickStat[] {
  const handle = (profile.bio.handle || profile.handle || 'creator').replace(
    /^@/,
    ''
  );
  // Active blocks only — never invent rows from click history / social links.
  const blocks = listBioTrackableBlocks(profile.bio.blocks);
  const stats =
    opts?.clickStats instanceof Map
      ? opts.clickStats
      : opts?.clickStats
        ? new Map(Object.entries(opts.clickStats))
        : null;
  const preferStats = Boolean(opts?.preferClickStats && stats);

  return blocks.map((b) => {
    const slug = blockSlug(b);
    const destination =
      b.destination_url || b.url || `https://clikd.app/bio/${handle}`;
    const override = stats?.get(slug);
    const liveClicks = preferStats
      ? (override?.clicks ?? 0)
      : (override?.clicks ?? getDemoClickCount(slug));
    const liveUnique = preferStats
      ? (override?.unique ?? 0)
      : (override?.unique ?? getDemoUniqueCount(slug));
    return {
      slug,
      title: b.title || 'Link',
      clicks: liveClicks,
      unique: Math.max(liveUnique, liveClicks > 0 ? 1 : 0),
      destination_url: destination,
      tracked_url: buildTrackedShortUrl(slug),
    };
  });
}

export function buildBioProductPerformance(
  profile: WorkspaceProfile,
  opts?: {
    from?: string;
    to?: string;
    clickStats?: Record<string, BioClickOverride> | Map<string, BioClickOverride>;
  }
): BioProductPerf[] {
  const sales = listBioSales(profile.id);
  const fromMs = opts?.from ? new Date(`${opts.from}T00:00:00`).getTime() : 0;
  const toMs = opts?.to
    ? new Date(`${opts.to}T23:59:59`).getTime()
    : Number.POSITIVE_INFINITY;
  const ranged = sales.filter((s) => {
    const t = new Date(s.created_at).getTime();
    return t >= fromMs && t <= toMs;
  });

  const byBlock = new Map<string, { purchases: number; revenue: number }>();
  for (const s of ranged) {
    const prev = byBlock.get(s.block_id) || { purchases: 0, revenue: 0 };
    prev.purchases += 1;
    prev.revenue += s.amount_sek;
    byBlock.set(s.block_id, prev);
  }

  const links = buildBioUtmLinks(profile, { clickStats: opts?.clickStats });
  const clicksBySlug = new Map(links.map((l) => [l.slug, l.clicks]));

  return listBioCommerceBlocks(profile.bio.blocks)
    .map((b) => {
      const slug = blockSlug(b);
      const stats = byBlock.get(b.id) || { purchases: 0, revenue: 0 };
      const clicks = clicksBySlug.get(slug) ?? 0;
      const cvr =
        clicks > 0
          ? Math.round((stats.purchases / clicks) * 1000) / 10
          : stats.purchases > 0
            ? 100
            : 0;
      return {
        id: b.id,
        name: b.title || 'Product',
        category:
          b.category === 'store' || b.type === 'store'
            ? 'Store'
            : b.type || 'Link',
        clicks,
        purchases: stats.purchases,
        conversion: `${cvr}%`,
        revenue_sek: stats.revenue,
        live: b.visible !== false,
        slug,
      };
    })
    .sort((a, b) => b.revenue_sek - a.revenue_sek || b.clicks - a.clicks);
}

/** Recompute workspace analytics slice from Bio Builder + sales ledger. */
export function computeBioAnalyticsSlice(
  profile: WorkspaceProfile,
  opts?: { from?: string; to?: string }
): Pick<
  WorkspaceAnalyticsData,
  'revenue_sek' | 'products' | 'revenue_chart' | 'utm_links' | 'utm_total_clicks'
> {
  const utm_links = buildBioUtmLinks(profile);
  const revenue_sek = sumBioRevenueSek(profile.id, opts);
  const products = listBioCommerceBlocks(profile.bio.blocks).length;
  return {
    revenue_sek,
    products,
    revenue_chart: bioRevenueChart(profile.id, 7),
    utm_links,
    utm_total_clicks: utm_links.reduce((n, r) => n + r.clicks, 0),
  };
}

export function effectiveUnitPrice(block: WorkspaceBioBlock): number {
  return blockUnitPrice(block);
}

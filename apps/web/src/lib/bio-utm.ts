/** UTM helpers + demo click tracking for Bio Store product links. */

import { SITE_URL } from '@/lib/site';

export type UtmClickStat = {
  slug: string;
  title: string;
  clicks: number;
  unique: number;
  destination_url: string;
  tracked_url: string;
};

/** In-memory click counters for demo / no-DB mode. */
const demoClicks = new Map<string, { clicks: number; uniques: Set<string> }>();

export function slugifyBioProduct(title: string, id: string) {
  const base =
    title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'product';
  return `${base}-${id}`.slice(0, 56);
}

/** Append standard UTM params to an external product URL. */
export function appendUtmParams(
  destination: string,
  opts: { handle: string; slug: string }
) {
  try {
    const u = new URL(destination);
    u.searchParams.set('utm_source', 'nordic_creator');
    u.searchParams.set('utm_medium', 'bio_store');
    u.searchParams.set('utm_campaign', opts.handle || 'creator');
    u.searchParams.set('utm_content', opts.slug);
    return u.toString();
  } catch {
    const sep = destination.includes('?') ? '&' : '?';
    return `${destination}${sep}utm_source=nordic_creator&utm_medium=bio_store&utm_campaign=${encodeURIComponent(opts.handle || 'creator')}&utm_content=${encodeURIComponent(opts.slug)}`;
  }
}

/** Short trackable link shown to the creator (clicks go through /r/[slug]). */
export function buildTrackedShortUrl(slug: string, origin?: string) {
  const base =
    origin ||
    (typeof window !== 'undefined' ? window.location.origin : SITE_URL);
  return `${base.replace(/\/$/, '')}/r/${slug}`;
}

export function recordDemoClick(slug: string, visitorKey = 'anon') {
  const row = demoClicks.get(slug) ?? { clicks: 0, uniques: new Set<string>() };
  row.clicks += 1;
  row.uniques.add(visitorKey);
  demoClicks.set(slug, row);
  return row.clicks;
}

export function getDemoClickCount(slug: string) {
  return demoClicks.get(slug)?.clicks ?? 0;
}

export function getDemoUniqueCount(slug: string) {
  return demoClicks.get(slug)?.uniques.size ?? 0;
}

/** Seed plausible demo analytics so the Analytics tab isn't empty. */
export function seedDemoUtmStats(
  products: Array<{
    slug: string;
    title: string;
    destination_url: string;
    handle: string;
  }>
): UtmClickStat[] {
  return products.map((p, i) => {
    const seeded = 12 + ((i * 17) % 41);
    const live = getDemoClickCount(p.slug);
    const clicks = seeded + live;
    const unique = Math.max(
      1,
      Math.round(clicks * 0.72) + getDemoUniqueCount(p.slug)
    );
    return {
      slug: p.slug,
      title: p.title,
      clicks,
      unique,
      destination_url: p.destination_url,
      tracked_url: buildTrackedShortUrl(p.slug),
    };
  });
}

/** Resolve destination for a tracked slug (demo registry). */
const demoDestinations = new Map<
  string,
  { destination: string; handle: string; title: string }
>();

export function registerDemoDestination(
  slug: string,
  data: { destination: string; handle: string; title: string }
) {
  demoDestinations.set(slug, data);
}

export function getDemoDestination(slug: string) {
  return demoDestinations.get(slug) ?? null;
}

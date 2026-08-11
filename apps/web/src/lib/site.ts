/**
 * Official production site URL for clikd:
 * Use these helpers for metadata, canonicals, and absolute link builders.
 */

export const SITE_HOST = 'clikd.app';

/** Canonical production origin — no trailing slash. */
export const SITE_URL = `https://${SITE_HOST}`;

/** Human-readable host used in UI copy (e.g. clikd.app/@handle). */
export const SITE_DISPLAY_HOST = SITE_HOST;

/**
 * Resolve the public site origin.
 * Prefers explicit env overrides, then falls back to the production domain.
 */
export function getSiteUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.BETTER_AUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (fromEnv) {
    try {
      return new URL(fromEnv).origin;
    } catch {
      /* ignore invalid env */
    }
  }

  // Vercel preview/deploy URL — only when no explicit site URL is set.
  if (process.env.VERCEL_URL?.trim()) {
    const host = process.env.VERCEL_URL.replace(/^https?:\/\//, '');
    return `https://${host}`;
  }

  return SITE_URL;
}

/** Build an absolute URL from a path (leading slash optional). */
export function absoluteUrl(path = '/'): string {
  const base = getSiteUrl().replace(/\/$/, '');
  if (!path || path === '/') return base;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Public bio URL: https://clikd.app/@handle */
export function bioPublicUrl(handle: string, origin?: string): string {
  const base = (origin || getSiteUrl()).replace(/\/$/, '');
  const clean = handle.replace(/^@+/, '') || 'creator';
  return `${base}/@${clean}`;
}

/** Display-only bio path host, e.g. clikd.app/@creator */
export function bioPublicDisplay(handle: string): string {
  const clean = handle.replace(/^@+/, '') || 'creator';
  return `${SITE_DISPLAY_HOST}/@${clean}`;
}

/** Public community share URL. */
export function communityPublicUrl(
  communityIdOrSlug: string | number,
  origin?: string
): string {
  return absolutePathWithOrigin(`/communities/${communityIdOrSlug}`, origin);
}

function absolutePathWithOrigin(path: string, origin?: string): string {
  const base = (origin?.trim() || getSiteUrl()).replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Verified-domain media proxy for TikTok / Meta PULL_FROM_URL.
 *
 * TikTok URL Properties are registered on www.clikd.app — not the Supabase
 * storage host. Outbound publish URLs must therefore be:
 *   https://www.clikd.app/api/media?url=${encodeURIComponent(supabaseUrl)}
 */

/** Origin verified in TikTok Developer Portal → URL Properties. */
export const VERIFIED_MEDIA_PROXY_ORIGIN = 'https://www.clikd.app';

const PROXY_PATH = '/api/media';

function hostnameOf(raw: string): string {
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function isClikdProxyHost(host: string): boolean {
  return host === 'clikd.app' || host === 'www.clikd.app';
}

/** True when `raw` is already a clikd: /api/media proxy URL. */
export function isVerifiedMediaProxyUrl(raw: string): boolean {
  try {
    const url = new URL(raw.trim());
    return isClikdProxyHost(url.hostname) && url.pathname === PROXY_PATH;
  } catch {
    return false;
  }
}

/**
 * Allowlist for the proxy: HTTPS Supabase Storage object URLs only.
 * Blocks open-proxy / SSRF (localhost, private IPs, arbitrary hosts).
 */
export function isAllowedSupabaseMediaUrl(raw: string): boolean {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== 'https:') return false;

    const host = url.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host.endsWith('.local') ||
      host.endsWith('.localhost')
    ) {
      return false;
    }

    if (isClikdProxyHost(host)) return false;

    const path = url.pathname;
    const looksLikeStorage =
      path.includes('/storage/v1/object/') || path.startsWith('/storage/');

    const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const projectHost = projectUrl ? hostnameOf(projectUrl) : '';
    if (projectHost && host === projectHost && looksLikeStorage) return true;

    if (host.endsWith('.supabase.co') && looksLikeStorage) return true;

    return false;
  } catch {
    return false;
  }
}

/**
 * Rewrite a Supabase Storage URL so TikTok/Meta fetch it via www.clikd.app.
 * Non-Supabase HTTPS URLs are returned unchanged.
 */
export function toVerifiedPublishMediaUrl(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return trimmed;

  if (isVerifiedMediaProxyUrl(trimmed)) {
    try {
      const current = new URL(trimmed);
      const nested = current.searchParams.get('url') || '';
      if (!nested) return trimmed;
      return `${VERIFIED_MEDIA_PROXY_ORIGIN}${PROXY_PATH}?url=${encodeURIComponent(nested)}`;
    } catch {
      return trimmed;
    }
  }

  if (!isAllowedSupabaseMediaUrl(trimmed)) return trimmed;

  return `${VERIFIED_MEDIA_PROXY_ORIGIN}${PROXY_PATH}?url=${encodeURIComponent(trimmed)}`;
}

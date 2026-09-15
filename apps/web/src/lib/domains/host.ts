/**
 * Detect platform vs custom-domain hosts (shared by middleware + metadata).
 */

export function normalizeHostname(host: string | null | undefined): string {
  return (host || '').toLowerCase().split(':')[0].trim();
}

/** Platform hosts that must keep clikd: branding (not customer favicons). */
export function isPlatformHost(host: string | null | undefined): boolean {
  const h = normalizeHostname(host);
  if (!h) return true;
  if (h === 'localhost' || h === '127.0.0.1' || h.endsWith('.localhost')) {
    return true;
  }
  if (h === 'clikd.app' || h.endsWith('.clikd.app')) return true;
  if (h.endsWith('.vercel.app')) return true;
  return false;
}

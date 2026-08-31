/**
 * Platform matching for monthly reports — maps tiktok_business → tiktok, etc.
 */

export function normalizeReportPlatform(platform: string): string {
  const p = String(platform || '').trim().toLowerCase();
  if (p === 'tiktok_business') return 'tiktok';
  return p;
}

/** Whether a connected account counts toward selected report platforms. */
export function platformMatchesReport(
  accountPlatform: string,
  allowed: Set<string>
): boolean {
  const norm = normalizeReportPlatform(accountPlatform);
  return allowed.has(norm) || allowed.has(accountPlatform.toLowerCase());
}

/** Supported post platforms for frozen reports (no YouTube posts API yet). */
export const REPORT_POST_PLATFORMS = ['instagram', 'facebook', 'tiktok'] as const;

export function sanitizeReportPlatforms(platforms?: string[]): string[] {
  const raw = platforms?.length
    ? platforms.map((p) => String(p).trim().toLowerCase())
    : [...REPORT_POST_PLATFORMS];
  const out = new Set<string>();
  for (const p of raw) {
    if (p === 'youtube') continue;
    if (p === 'tiktok_business') out.add('tiktok');
    else if (REPORT_POST_PLATFORMS.includes(p as (typeof REPORT_POST_PLATFORMS)[number]))
      out.add(p);
  }
  return out.size ? [...out] : [...REPORT_POST_PLATFORMS];
}

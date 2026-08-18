/**
 * Shared YYYY-MM-DD helpers for Analytics date ranges + Meta since/until.
 */

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function toYmdUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Default overview window: last 7 days through today (UTC calendar). */
export function defaultAnalyticsRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 7);
  return { from: toYmdUtc(from), to: toYmdUtc(to) };
}

export function parseAnalyticsRange(
  fromRaw?: string | null,
  toRaw?: string | null
): { from: string; to: string } {
  const fallback = defaultAnalyticsRange();
  const from = YMD.test(fromRaw || '') ? String(fromRaw) : fallback.from;
  const to = YMD.test(toRaw || '') ? String(toRaw) : fallback.to;
  return from <= to ? { from, to } : { from: to, to: from };
}

/**
 * Inclusive calendar-day check.
 * Rows without a parseable timestamp are treated as in-range — platform APIs
 * return "recent" media, so dropping them left Reach/Views at 0.
 */
export function isIsoInRange(
  iso: string | null | undefined,
  from: string,
  to: string
): boolean {
  if (!iso) return true;
  const day = String(iso).slice(0, 10);
  if (!YMD.test(day)) return true;
  return day >= from && day <= to;
}

/** Meta Graph `since`/`until` unix seconds (`until` = start of the day after `to`). */
export function rangeToUnix(
  from: string,
  to: string
): { since: number; until: number } {
  const since = Math.floor(Date.parse(`${from}T00:00:00.000Z`) / 1000);
  const untilDate = new Date(`${to}T00:00:00.000Z`);
  untilDate.setUTCDate(untilDate.getUTCDate() + 1);
  const until = Math.floor(untilDate.getTime() / 1000);
  return { since, until: Math.max(until, since + 86400) };
}

/**
 * Split a long range into ≤30-day chunks (Instagram insights max window).
 * Newest chunks first, capped so 1y/2y presets still return last 90 days.
 */
export function chunkDateRange(
  from: string,
  to: string,
  maxDays = 30,
  maxChunks = 3
): Array<{ from: string; to: string }> {
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return [{ from, to }];
  }
  const chunks: Array<{ from: string; to: string }> = [];
  let cursor = new Date(end);
  while (cursor >= start && chunks.length < maxChunks) {
    const chunkEnd = toYmdUtc(cursor);
    const chunkStartDate = new Date(cursor);
    chunkStartDate.setUTCDate(chunkStartDate.getUTCDate() - (maxDays - 1));
    if (chunkStartDate < start) chunkStartDate.setTime(start.getTime());
    chunks.unshift({ from: toYmdUtc(chunkStartDate), to: chunkEnd });
    cursor = new Date(chunkStartDate);
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return chunks.length ? chunks : [{ from, to }];
}

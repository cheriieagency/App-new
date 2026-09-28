/**
 * Short TTL in-memory cache for Analytics API responses.
 * Cuts repeat Meta Graph fan-outs when the panel remounts or soft-refreshes.
 */

type CacheEntry = {
  expiresAt: number;
  payload: unknown;
};

const store = new Map<string, CacheEntry>();
const DEFAULT_TTL_MS = 60_000;

export function analyticsCacheKey(parts: Array<string | null | undefined>): string {
  return parts.map((p) => String(p ?? '').trim() || '-').join('|');
}

export function getAnalyticsCached<T>(key: string): T | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    store.delete(key);
    return null;
  }
  return hit.payload as T;
}

export function setAnalyticsCached(
  key: string,
  payload: unknown,
  ttlMs = DEFAULT_TTL_MS
): void {
  store.set(key, { payload, expiresAt: Date.now() + ttlMs });
  // Bound memory — drop oldest when large.
  if (store.size > 80) {
    const first = store.keys().next().value;
    if (first) store.delete(first);
  }
}

export function invalidateAnalyticsCache(prefix?: string): void {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

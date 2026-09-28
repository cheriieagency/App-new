/**
 * Shared React Query options for Analytics / Meta surfaces.
 * Tuned for responsiveness without hammering Meta Graph every few seconds.
 */

export const LIVE_ANALYTICS_QUERY = {
  /** Reuse a fresh pull — avoids Meta Graph storms on remount/tab switch. */
  staleTime: 90_000,
  /** Keep last response while refetching to avoid UI flicker. */
  gcTime: 10 * 60_000,
  /** Prefer cache on remount; invalidate only when filters change. */
  refetchOnMount: false as const,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
  /** Soft live refresh while Analytics UI is open. */
  refetchInterval: 120_000,
  refetchIntervalInBackground: false,
};

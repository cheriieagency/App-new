/**
 * Shared React Query options for Analytics / Meta surfaces.
 * Tuned for responsiveness without hammering Meta Graph every few seconds.
 */

export const LIVE_ANALYTICS_QUERY = {
  /** Reuse a fresh pull for a minute — avoids sync storms on remount/tab switch. */
  staleTime: 60_000,
  /** Keep last response while refetching to avoid UI flicker. */
  gcTime: 5 * 60_000,
  refetchOnMount: true as const,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
  /** Soft live refresh while Analytics UI is open (was 30s). */
  refetchInterval: 90_000,
  refetchIntervalInBackground: false,
};

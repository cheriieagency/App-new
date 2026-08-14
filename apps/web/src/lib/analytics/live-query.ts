/**
 * Shared React Query options so Analytics tabs stay live / up-to-date.
 */

export const LIVE_ANALYTICS_QUERY = {
  /** Treat data as stale immediately so remount / focus always revalidates. */
  staleTime: 0,
  /** Keep last response briefly while refetching to avoid UI flicker. */
  gcTime: 60_000,
  refetchOnMount: 'always' as const,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  /** Poll Meta / platform APIs while the Analytics UI is open. */
  refetchInterval: 30_000,
  refetchIntervalInBackground: false,
};

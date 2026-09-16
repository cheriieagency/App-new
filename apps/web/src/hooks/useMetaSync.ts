'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { MetaSyncSnapshot } from '@/lib/meta/sync';
import { LIVE_ANALYTICS_QUERY } from '@/lib/analytics/live-query';

type MetaSyncResponse = {
  synced: boolean;
  snapshot: MetaSyncSnapshot | null;
  error?: string;
};

/** Loads (and lazily syncs) Meta Graph data for Analytics / Inbox / Planner. */
export function useMetaSync(enabled = true) {
  return useQuery<MetaSyncResponse>({
    queryKey: ['meta-sync'],
    enabled,
    ...LIVE_ANALYTICS_QUERY,
    queryFn: async () => {
      const r = await fetch(`/api/meta/sync?_=${Date.now()}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!r.ok) throw new Error('Failed to load Meta sync');
      return r.json();
    },
  });
}

/**
 * Live Inbox: re-pull Graph while Social Inbox is open.
 * Uses ?force=1 so GET is not stuck on a stale in-memory snapshot.
 */
export function useLiveMetaInboxSync(enabled = true) {
  const queryClient = useQueryClient();
  return useQuery<MetaSyncResponse>({
    queryKey: ['meta-sync', 'live-inbox'],
    enabled,
    staleTime: 0,
    gcTime: 60_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 20_000,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      const r = await fetch(`/api/meta/sync?force=1&_=${Date.now()}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!r.ok) throw new Error('Failed to live-sync Meta inbox');
      const json = (await r.json()) as MetaSyncResponse;
      // Keep the shared Analytics cache in sync with the live pull.
      queryClient.setQueryData(['meta-sync'], json);
      return json;
    },
  });
}

export async function refreshMetaSync(): Promise<MetaSyncResponse> {
  const r = await fetch('/api/meta/sync', {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
  });
  if (!r.ok) throw new Error('Failed to refresh Meta sync');
  return r.json();
}

/** Invalidate all live analytics + Meta sync caches (e.g. after reconnect). */
export function useInvalidateLiveAnalytics() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['analytics'] });
    void queryClient.invalidateQueries({ queryKey: ['analytics-posts'] });
    void queryClient.invalidateQueries({ queryKey: ['analytics-stories'] });
    void queryClient.invalidateQueries({ queryKey: ['analytics-hashtags'] });
    void queryClient.invalidateQueries({ queryKey: ['meta-sync'] });
    void queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
  };
}

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

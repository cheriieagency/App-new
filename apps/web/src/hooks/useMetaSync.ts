'use client';

import { useRef } from 'react';
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
 * Live Inbox: refresh while Social Inbox is the active section.
 * Soft pulls by default (cached snapshot); force Graph every other cycle
 * so we stay fresh without a full Meta fan-out every 20s.
 */
export function useLiveMetaInboxSync(enabled = true) {
  const queryClient = useQueryClient();
  const forceTick = useRef(0);
  return useQuery<MetaSyncResponse>({
    queryKey: ['meta-sync', 'live-inbox'],
    enabled,
    staleTime: 45_000,
    gcTime: 5 * 60_000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      forceTick.current += 1;
      // Force Graph on first load + every 2nd poll (~2 min).
      const force = forceTick.current === 1 || forceTick.current % 2 === 0;
      const url = force
        ? `/api/meta/sync?force=1&_=${Date.now()}`
        : `/api/meta/sync?_=${Date.now()}`;
      const r = await fetch(url, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!r.ok) throw new Error('Failed to live-sync Meta inbox');
      const json = (await r.json()) as MetaSyncResponse;
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

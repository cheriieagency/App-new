'use client';

import { useQuery } from '@tanstack/react-query';
import type { MetaSyncSnapshot } from '@/lib/meta/sync';

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
    queryFn: async () => {
      const r = await fetch('/api/meta/sync');
      if (!r.ok) throw new Error('Failed to load Meta sync');
      return r.json();
    },
    staleTime: 60_000,
  });
}

export async function refreshMetaSync(): Promise<MetaSyncResponse> {
  const r = await fetch('/api/meta/sync', { method: 'POST' });
  if (!r.ok) throw new Error('Failed to refresh Meta sync');
  return r.json();
}

'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ConnectedSocialAccount } from '@/lib/mock-content-planner';

type SocialsResponse = {
  accounts: ConnectedSocialAccount[];
  meta_connected?: boolean;
  demo?: boolean;
};

/**
 * Shared query for connected social accounts — gates demo/analytics data
 * until the creator has linked Instagram / Facebook (or other platforms).
 */
export function useConnectedSocials() {
  const query = useQuery<SocialsResponse>({
    queryKey: ['planner-socials'],
    queryFn: async () => {
      const r = await fetch('/api/planner/socials');
      if (!r.ok) throw new Error('Failed to load social accounts');
      return r.json();
    },
    staleTime: 30_000,
  });

  const accounts = query.data?.accounts ?? [];
  const hasConnectedSocials = useMemo(
    () =>
      Boolean(query.data?.meta_connected) ||
      accounts.some((a) => a.connected),
    [accounts, query.data?.meta_connected]
  );
  const hasInstagram = useMemo(
    () => accounts.some((a) => a.platform === 'instagram' && a.connected),
    [accounts]
  );
  const hasFacebook = useMemo(
    () => accounts.some((a) => a.platform === 'facebook' && a.connected),
    [accounts]
  );

  return {
    ...query,
    accounts,
    hasConnectedSocials,
    hasInstagram,
    hasFacebook,
  };
}

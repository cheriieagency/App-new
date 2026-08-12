'use client';

import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';

export type AnalyticsApiResponse = {
  ok: boolean;
  source?: string;
  connected?: boolean;
  reason?: string;
  message?: string | null;
  cta?: { label: string; href: string } | null;
  metrics?: {
    reach: number;
    impressions: number;
    likes: number;
    comments: number;
    followers: number;
    engagement_rate: number;
  };
  accounts?: Array<{
    platform: string;
    handle?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
    follower_count?: number | null;
  }>;
  insights?: Record<string, number> | null;
  instagram?: Record<string, unknown> | null;
  media?: unknown[];
  synced_at?: string | null;
};

/** Hydrates /api/analytics with soft onboarding fallback (never crashes the page). */
export function useAnalytics(enabled = true) {
  const pathname = usePathname();
  return useQuery<AnalyticsApiResponse>({
    queryKey: ['analytics', pathname ?? ''],
    enabled,
    queryFn: async () => {
      const r = await fetch('/api/analytics', {
        credentials: 'include',
        cache: 'no-store',
      });
      // Soft-parse even on 401 — route returns structured fallback JSON.
      return r.json();
    },
    staleTime: 15_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}

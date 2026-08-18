'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { useWorkspaceOptional } from '@/context/WorkspaceContext';
import { NC_WORKSPACE_STORAGE_KEY } from '@/lib/mock-workspace-profiles';
import { LIVE_ANALYTICS_QUERY } from '@/lib/analytics/live-query';

export type AnalyticsHashtag = {
  tag: string;
  posts: number;
  reach: number;
  er: number;
  trend: number;
};

export type AnalyticsPlatformSlice = {
  connected: boolean;
  followers: number;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type AnalyticsDemoRow = {
  key: string;
  label: string;
  value: number;
  pct: number;
};

export type AnalyticsPlatformDemographics = {
  platform: string;
  available: boolean;
  message?: string | null;
  countries: AnalyticsDemoRow[];
  cities: AnalyticsDemoRow[];
  genders: AnalyticsDemoRow[];
  ages: AnalyticsDemoRow[];
  active_hours: number[];
};

export type AnalyticsDemographics = {
  source: 'engaged_audience' | 'followers' | 'none';
  countries: AnalyticsDemoRow[];
  cities: AnalyticsDemoRow[];
  genders: AnalyticsDemoRow[];
  ages: AnalyticsDemoRow[];
  active_hours: number[];
  available: boolean;
  message?: string | null;
  by_platform?: AnalyticsPlatformDemographics[];
  platforms_with_data?: string[];
};

export type AnalyticsApiResponse = {
  ok: boolean;
  source?: string;
  connected?: boolean;
  reason?: string;
  workspace_id?: string | null;
  message?: string | null;
  cta?: { label: string; href: string } | null;
  metrics?: {
    reach: number;
    impressions: number;
    likes: number;
    comments: number;
    shares?: number;
    saves?: number;
    followers: number;
    profile_views?: number;
    engagement_rate: number;
    accounts?: number;
  };
  totals?: {
    followers: number;
    accounts: number;
    reach: number;
    impressions: number;
    likes: number;
    comments: number;
    shares?: number;
    saves?: number;
    engagement_rate: number;
  };
  by_platform?: Record<string, AnalyticsPlatformSlice>;
  accounts?: Array<{
    platform: string;
    handle?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
    follower_count?: number | null;
  }>;
  insights?: Record<string, number> | null;
  instagram?: Record<string, unknown> | null;
  demographics?: AnalyticsDemographics | null;
  media?: Array<{
    id: string;
    platform?: string | null;
    caption?: string | null;
    media_type?: string | null;
    media_url?: string | null;
    thumbnail_url?: string | null;
    permalink?: string | null;
    like_count?: number | null;
    comments_count?: number | null;
    shares_count?: number | null;
    view_count?: number | null;
    timestamp?: string | null;
  }>;
  hashtags?: AnalyticsHashtag[];
  planner_imported?: number;
  synced_at?: string | null;
};

function readStoredWorkspaceId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(NC_WORKSPACE_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Hydrates /api/analytics for the ACTIVE workspace (live, auto-refresh). */
export function useAnalytics(
  enabled = true,
  range?: { from?: string; to?: string } | null
) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const workspaceCtx = useWorkspaceOptional();
  const workspaceId =
    workspaceCtx?.activeWorkspaceId || readStoredWorkspaceId() || null;
  const from = range?.from?.trim() || '';
  const to = range?.to?.trim() || '';

  const query = useQuery<AnalyticsApiResponse>({
    queryKey: ['analytics', workspaceId ?? 'none', pathname ?? '', from, to],
    enabled: enabled && Boolean(workspaceId),
    ...LIVE_ANALYTICS_QUERY,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const ws = workspaceId || readStoredWorkspaceId();
      if (!ws) {
        return {
          ok: true,
          connected: false,
          reason: 'no_workspace',
          accounts: [],
          media: [],
          hashtags: [],
        };
      }
      const params = new URLSearchParams();
      params.set('workspaceId', ws);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      params.set('_', String(Date.now()));
      const r = await fetch(`/api/analytics?${params}`, {
        headers: {
          'x-workspace-id': ws,
          'x-active-workspace-id': ws,
        },
        credentials: 'include',
        cache: 'no-store',
      });
      // Soft-parse even on 401 — route returns structured fallback JSON.
      return r.json();
    },
  });

  // Re-fetch whenever the active workspace changes.
  useEffect(() => {
    if (!enabled || !workspaceId) return;
    void queryClient.invalidateQueries({ queryKey: ['analytics'] });
  }, [workspaceId, enabled, queryClient]);

  return query;
}

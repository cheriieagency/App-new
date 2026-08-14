'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { useWorkspaceOptional } from '@/context/WorkspaceContext';
import { NC_WORKSPACE_STORAGE_KEY } from '@/lib/mock-workspace-profiles';
import { LIVE_ANALYTICS_QUERY } from '@/lib/analytics/live-query';
import type { HashtagKpis, HashtagStat } from '@/lib/analytics/hashtags';

export type AnalyticsHashtagsResponse = {
  ok?: boolean;
  kpis?: HashtagKpis;
  hashtags?: HashtagStat[];
  message?: string | null;
};

function readStoredWorkspaceId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(NC_WORKSPACE_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Live hashtag stats for Analytics → Hashtags. */
export function useAnalyticsHashtags(enabled = true) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const workspace = useWorkspaceOptional();
  const workspaceId =
    workspace?.activeWorkspace?.id || readStoredWorkspaceId() || '';

  const query = useQuery({
    queryKey: ['analytics-hashtags', workspaceId, pathname],
    enabled: Boolean(enabled && workspaceId),
    ...LIVE_ANALYTICS_QUERY,
    queryFn: async (): Promise<AnalyticsHashtagsResponse> => {
      const url = new URL('/api/analytics/hashtags', window.location.origin);
      url.searchParams.set('workspaceId', workspaceId);
      url.searchParams.set('_', String(Date.now()));
      const res = await fetch(url.toString(), {
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'x-workspace-id': workspaceId,
          'x-active-workspace-id': workspaceId,
        },
      });
      const data = (await res.json()) as AnalyticsHashtagsResponse;
      if (!res.ok) {
        return {
          ok: false,
          kpis: { uniqueTags: 0, avgReachLift: 0, taggedPosts: 0 },
          hashtags: [],
        };
      }
      return data;
    },
  });

  useEffect(() => {
    if (!enabled || !workspaceId) return;
    void queryClient.invalidateQueries({ queryKey: ['analytics-hashtags'] });
  }, [workspaceId, enabled, queryClient]);

  return query;
}

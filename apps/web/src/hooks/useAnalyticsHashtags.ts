'use client';

import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { useWorkspaceOptional } from '@/context/WorkspaceContext';
import { NC_WORKSPACE_STORAGE_KEY } from '@/lib/mock-workspace-profiles';
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
  const workspace = useWorkspaceOptional();
  const workspaceId =
    workspace?.activeWorkspace?.id || readStoredWorkspaceId() || '';

  return useQuery({
    queryKey: ['analytics-hashtags', workspaceId, pathname],
    enabled: Boolean(enabled && workspaceId),
    staleTime: 60_000,
    queryFn: async (): Promise<AnalyticsHashtagsResponse> => {
      const url = new URL('/api/analytics/hashtags', window.location.origin);
      url.searchParams.set('workspaceId', workspaceId);
      const res = await fetch(url.toString(), {
        credentials: 'include',
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
}

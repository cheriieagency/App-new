'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { useWorkspaceOptional } from '@/context/WorkspaceContext';
import { NC_WORKSPACE_STORAGE_KEY } from '@/lib/mock-workspace-profiles';
import { LIVE_ANALYTICS_QUERY } from '@/lib/analytics/live-query';
import type {
  PlatformAccountPill,
  UnifiedPostMetric,
} from '@/lib/analytics/unified-posts';

export type AnalyticsStoriesResponse = {
  ok?: boolean;
  posts?: UnifiedPostMetric[];
  accounts?: PlatformAccountPill[];
  message?: string | null;
  workspace_id?: string | null;
};

function readStoredWorkspaceId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(NC_WORKSPACE_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Live Instagram Stories for Analytics → Stories. */
export function useAnalyticsStories(enabled = true) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const workspace = useWorkspaceOptional();
  const workspaceId =
    workspace?.activeWorkspace?.id || readStoredWorkspaceId() || '';

  const query = useQuery({
    queryKey: ['analytics-stories', workspaceId, pathname],
    enabled: Boolean(enabled && workspaceId),
    ...LIVE_ANALYTICS_QUERY,
    queryFn: async (): Promise<AnalyticsStoriesResponse> => {
      const url = new URL('/api/analytics/stories', window.location.origin);
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
      const data = (await res.json()) as AnalyticsStoriesResponse;
      if (!res.ok) {
        return { ok: false, posts: [], accounts: [], message: 'Unauthorized' };
      }
      return data;
    },
  });

  useEffect(() => {
    if (!enabled || !workspaceId) return;
    void queryClient.invalidateQueries({ queryKey: ['analytics-stories'] });
  }, [workspaceId, enabled, queryClient]);

  return query;
}

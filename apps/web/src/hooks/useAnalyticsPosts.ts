'use client';

import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { useWorkspaceOptional } from '@/context/WorkspaceContext';
import { NC_WORKSPACE_STORAGE_KEY } from '@/lib/mock-workspace-profiles';
import type {
  PlatformAccountPill,
  UnifiedPostMetric,
} from '@/lib/analytics/unified-posts';

export type AnalyticsPostsResponse = {
  ok?: boolean;
  posts?: UnifiedPostMetric[];
  accounts?: PlatformAccountPill[];
  sort?: 'engagementRate' | 'publishedAt';
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

/** Live Instagram / Facebook / TikTok posts for Analytics → Posts. */
export function useAnalyticsPosts(enabled = true) {
  const pathname = usePathname();
  const workspace = useWorkspaceOptional();
  const workspaceId =
    workspace?.activeWorkspace?.id || readStoredWorkspaceId() || '';

  return useQuery({
    queryKey: ['analytics-posts', workspaceId, pathname],
    enabled: Boolean(enabled && workspaceId),
    staleTime: 60_000,
    queryFn: async (): Promise<AnalyticsPostsResponse> => {
      const url = new URL('/api/analytics/posts', window.location.origin);
      url.searchParams.set('workspaceId', workspaceId);
      url.searchParams.set('sort', 'engagementRate');
      const res = await fetch(url.toString(), {
        credentials: 'include',
        headers: {
          'x-workspace-id': workspaceId,
          'x-active-workspace-id': workspaceId,
        },
      });
      const data = (await res.json()) as AnalyticsPostsResponse;
      if (!res.ok) {
        return { ok: false, posts: [], accounts: [], message: 'Unauthorized' };
      }
      return data;
    },
  });
}

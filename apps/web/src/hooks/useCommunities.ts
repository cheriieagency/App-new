'use client';

/**
 * Workspace-scoped communities for Community Admin.
 * Revalidates when the active workspace changes.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useWorkspaceOptional } from '@/context/WorkspaceContext';
import { NC_WORKSPACE_STORAGE_KEY } from '@/lib/mock-workspace-profiles';
import type { ManagedCommunity } from '@/lib/mock-community-admin';

export type AdminCommunitiesResponse = {
  communities: ManagedCommunity[];
  community: ManagedCommunity | null;
  workspace_id?: string | null;
  demo?: boolean;
  error?: string;
};

function readStoredWorkspaceId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(NC_WORKSPACE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function useCommunities(enabled = true) {
  const queryClient = useQueryClient();
  const workspaceCtx = useWorkspaceOptional();
  const workspaceId =
    workspaceCtx?.activeWorkspaceId || readStoredWorkspaceId() || null;

  const query = useQuery<AdminCommunitiesResponse>({
    queryKey: ['admin-communities', workspaceId ?? 'none'],
    enabled: enabled && Boolean(workspaceId),
    queryFn: async () => {
      const ws = workspaceId || readStoredWorkspaceId();
      if (!ws) {
        return { communities: [], community: null, workspace_id: null };
      }
      const params = new URLSearchParams();
      params.set('workspaceId', ws);
      params.set('_', String(Date.now()));
      const r = await fetch(`/api/admin/communities?${params}`, {
        headers: {
          'x-workspace-id': ws,
          'x-active-workspace-id': ws,
        },
        credentials: 'include',
        cache: 'no-store',
      });
      if (!r.ok) throw new Error('Failed to load communities');
      return r.json();
    },
    staleTime: 5_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!enabled || !workspaceId) return;
    void queryClient.invalidateQueries({ queryKey: ['admin-communities'] });
  }, [workspaceId, enabled, queryClient]);

  const communities = query.data?.communities ?? [];
  const community = query.data?.community ?? communities[0] ?? null;

  return {
    ...query,
    workspaceId,
    communities,
    community,
    refetchCommunities: query.refetch,
  };
}

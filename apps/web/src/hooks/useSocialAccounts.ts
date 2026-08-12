'use client';

import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ConnectedSocialAccount } from '@/lib/mock-content-planner';
import { NC_WORKSPACE_STORAGE_KEY } from '@/lib/mock-workspace-profiles';

export type SocialAccountsResponse = {
  accounts: ConnectedSocialAccount[];
  meta_connected?: boolean;
  needs_ig_business?: boolean;
  connected_count?: number;
  workspace_id?: string | null;
  source?: string;
  demo?: boolean;
};

const SUCCESS_PARAMS = new Set([
  'meta_connected',
  'instagram_connected',
  'facebook_connected',
  'youtube_connected',
  'linkedin_connected',
]);

function readWorkspaceId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(NC_WORKSPACE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function readOAuthSuccessParam(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return new URLSearchParams(window.location.search).get('success');
  } catch {
    return null;
  }
}

/**
 * Unified live social_accounts fetch for the active user/workspace.
 * Immediately refetches when returning from OAuth (?success=…).
 */
export function useSocialAccounts(enabled = true) {
  const queryClient = useQueryClient();
  const workspaceId = readWorkspaceId();
  const success =
    typeof window !== 'undefined' ? readOAuthSuccessParam() : null;

  const query = useQuery<SocialAccountsResponse>({
    queryKey: ['social-accounts', workspaceId ?? 'default', success ?? ''],
    enabled,
    queryFn: async () => {
      const params = new URLSearchParams();
      const ws = readWorkspaceId();
      if (ws) params.set('workspaceId', ws);
      params.set('_', String(Date.now()));
      const qs = params.toString();
      const r = await fetch(`/api/socials/accounts?${qs}`, {
        headers: ws ? { 'x-workspace-id': ws } : undefined,
        credentials: 'include',
        cache: 'no-store',
      });
      if (!r.ok) throw new Error('Failed to load social accounts');
      return r.json();
    },
    staleTime: 5_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // Force hydrate as soon as OAuth redirects back with ?success=
  useEffect(() => {
    const param = readOAuthSuccessParam();
    if (!param || !SUCCESS_PARAMS.has(param)) return;
    void queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
    void query.refetch();
  }, [queryClient, query, success]);

  const accounts = query.data?.accounts ?? [];
  const connectedAccounts = useMemo(
    () => accounts.filter((a) => a.connected),
    [accounts]
  );
  const hasConnectedSocials = connectedAccounts.length > 0;
  const hasInstagram = connectedAccounts.some((a) => a.platform === 'instagram');
  const hasFacebook = connectedAccounts.some((a) => a.platform === 'facebook');
  const hasYouTube = connectedAccounts.some((a) => a.platform === 'youtube');
  const hasLinkedIn = connectedAccounts.some((a) => a.platform === 'linkedin');
  const needsIgBusiness = Boolean(
    query.data?.needs_ig_business || (hasFacebook && !hasInstagram)
  );
  const instagramAccount =
    connectedAccounts.find((a) => a.platform === 'instagram') ?? null;
  const byPlatform = useMemo(() => {
    const map = new Map<string, ConnectedSocialAccount>();
    for (const a of accounts) map.set(a.platform, a);
    return map;
  }, [accounts]);

  return {
    ...query,
    accounts,
    connectedAccounts,
    byPlatform,
    hasConnectedSocials,
    hasInstagram,
    hasFacebook,
    hasYouTube,
    hasLinkedIn,
    needsIgBusiness,
    instagramAccount,
    workspaceId,
  };
}

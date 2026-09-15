'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ConnectedSocialAccount } from '@/lib/mock-content-planner';
import { useSession } from '@/lib/auth-client';
import { useWorkspaceOptional } from '@/context/WorkspaceContext';
import { NC_WORKSPACE_STORAGE_KEY } from '@/lib/mock-workspace-profiles';
import { canAccessPendingApiPlatform } from '@/lib/config/pending-api-platforms';

export type SocialAccountsResponse = {
  accounts: ConnectedSocialAccount[];
  meta_connected?: boolean;
  needs_ig_business?: boolean;
  connected_count?: number;
  workspace_id?: string | null;
  source?: string;
  demo?: boolean;
  error?: string;
};

const SUCCESS_PARAMS = new Set([
  'meta_connected',
  'instagram_connected',
  'facebook_connected',
  'youtube_connected',
  'linkedin_connected',
  'tiktok_connected',
  'tiktok_business_connected',
  'pinterest_connected',
  'google_connected',
]);

const EMPTY_RESPONSE: SocialAccountsResponse = {
  accounts: [],
  connected_count: 0,
  workspace_id: null,
  source: 'empty',
};

function readStoredWorkspaceId(): string | null {
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

async function fetchSocialAccounts(
  workspaceId: string | null
): Promise<SocialAccountsResponse> {
  try {
    const params = new URLSearchParams();
    if (workspaceId) params.set('workspaceId', workspaceId);
    params.set('_', String(Date.now()));

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);

    try {
      const r = await fetch(`/api/socials/accounts?${params}`, {
        headers: workspaceId
          ? {
              'x-workspace-id': workspaceId,
              'x-active-workspace-id': workspaceId,
            }
          : undefined,
        credentials: 'include',
        cache: 'no-store',
        signal: controller.signal,
      });

      // Always parse JSON — API returns 200 + accounts:[] on soft failures.
      const json = (await r.json().catch(() => EMPTY_RESPONSE)) as SocialAccountsResponse;
      return {
        ...EMPTY_RESPONSE,
        ...json,
        accounts: Array.isArray(json.accounts) ? json.accounts : [],
      };
    } finally {
      window.clearTimeout(timeout);
    }
  } catch (error) {
    console.warn('[useSocialAccounts] fetch failed', error);
    return { ...EMPTY_RESPONSE, source: 'fetch_error' };
  }
}

/**
 * Unified live social_accounts fetch for the ACTIVE workspace only.
 * Revalidates when workspace changes or OAuth returns with ?success=…
 * Loading always clears — never leaves settings on endless "Loading…".
 */
export function useSocialAccounts(enabled = true) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const workspaceCtx = useWorkspaceOptional();
  const workspaceId =
    workspaceCtx?.activeWorkspaceId || readStoredWorkspaceId() || null;
  const success =
    typeof window !== 'undefined' ? readOAuthSuccessParam() : null;

  // Local loading flag — always cleared in finally so UI never sticks.
  const [isLoading, setIsLoading] = useState(Boolean(enabled));

  const query = useQuery<SocialAccountsResponse>({
    // Keep key stable — OAuth refresh is handled via invalidate + URL strip,
    // not by putting ?success= in the queryKey (that remounted every param).
    queryKey: [
      'social-accounts',
      workspaceId ?? 'none',
      session?.user?.id ?? 'anon',
    ],
    enabled,
    retry: false,
    queryFn: async () => {
      setIsLoading(true);
      try {
        const ws = workspaceId || readStoredWorkspaceId();
        return await fetchSocialAccounts(ws);
      } catch (error) {
        console.warn('[useSocialAccounts] queryFn error', error);
        return { ...EMPTY_RESPONSE, source: 'query_error' };
      } finally {
        setIsLoading(false);
      }
    },
    staleTime: 30_000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    // Keep prior workspace result while refetching — never invent an empty
    // success payload (that briefly flips hasConnectedSocials → false).
    placeholderData: (prev) => prev,
  });

  // Safety: if react-query never settles, clear local loader after 15s.
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    const t = window.setTimeout(() => setIsLoading(false), 15_000);
    return () => window.clearTimeout(t);
  }, [enabled, workspaceId, session?.user?.id]);

  // Sync local loading with a *real* settle — ignore placeholder "success".
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    if (query.isPlaceholderData) return;
    if (query.isFetched || query.isError || query.isSuccess) {
      setIsLoading(false);
    }
  }, [
    enabled,
    query.isFetched,
    query.isError,
    query.isSuccess,
    query.isPlaceholderData,
  ]);

  // OAuth return (?success=…) — invalidate once, then strip the query param so
  // this effect cannot re-fire on every query object identity change.
  useEffect(() => {
    const param = readOAuthSuccessParam();
    if (!param || !SUCCESS_PARAMS.has(param)) return;
    void queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('success');
      url.searchParams.delete('warning');
      url.searchParams.delete('error');
      url.searchParams.delete('detail');
      window.history.replaceState(
        {},
        '',
        `${url.pathname}${url.search}${url.hash}`
      );
    } catch {
      /* ignore history errors */
    }
  }, [queryClient, success]);

  // NOTE: Do NOT invalidate on workspaceId / pathname / session changes.
  // workspaceId is already in queryKey — React Query refetches when it changes.
  // Extra invalidates here caused an infinite /api/socials/accounts storm.

  // When the API remaps a foreign/legacy workspace (e.g. default-my-workspace)
  // onto the IG-linked owned workspace, keep the sidebar cookie in sync.
  // Depend only on the resolved id string — not accounts[] identity.
  useEffect(() => {
    const resolved = query.data?.workspace_id?.trim();
    if (!resolved || !workspaceCtx?.setActiveWorkspaceId) return;
    if (resolved === workspaceId) return;
    const hasConnected = (query.data?.accounts ?? []).some((a) => a.connected);
    const preferredEmpty =
      !workspaceId ||
      workspaceId === 'default-my-workspace' ||
      !hasConnected;
    if (!preferredEmpty && workspaceId) return;
    workspaceCtx.setActiveWorkspaceId(resolved);
  }, [
    query.data?.workspace_id,
    // Primitive count avoids re-running when accounts array is a new reference.
    query.data?.connected_count,
    workspaceCtx?.setActiveWorkspaceId,
    workspaceId,
  ]);

  const accounts = useMemo(() => {
    const raw = query.data?.accounts ?? [];
    const email = session?.user?.email ?? null;
    return raw.filter((a) => canAccessPendingApiPlatform(email, a.platform));
  }, [query.data?.accounts, session?.user?.email]);
  const connectedAccounts = useMemo(
    () => accounts.filter((a) => a.connected),
    [accounts]
  );
  const hasConnectedSocials = connectedAccounts.length > 0;
  const hasInstagram = connectedAccounts.some((a) => a.platform === 'instagram');
  const hasFacebook = connectedAccounts.some((a) => a.platform === 'facebook');
  const hasYouTube = connectedAccounts.some((a) => a.platform === 'youtube');
  const hasLinkedIn = connectedAccounts.some((a) => a.platform === 'linkedin');
  const hasTikTok = connectedAccounts.some((a) => a.platform === 'tiktok');
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

  // Stay in loading until the first real fetch settles when we still have zero
  // accounts. Empty placeholder must NOT flash the "Connect socials" gate.
  // Do not key off isFetching alone — window-focus refetch would re-show Loading
  // for creators who genuinely have no accounts yet.
  const showLoading =
    Boolean(enabled) &&
    connectedAccounts.length === 0 &&
    (query.isPending ||
      query.isPlaceholderData ||
      !query.isFetched ||
      isLoading);

  return {
    ...query,
    isLoading: showLoading,
    accounts,
    connectedAccounts,
    byPlatform,
    hasConnectedSocials,
    hasInstagram,
    hasFacebook,
    hasYouTube,
    hasLinkedIn,
    hasTikTok,
    needsIgBusiness,
    instagramAccount,
    workspaceId,
  };
}

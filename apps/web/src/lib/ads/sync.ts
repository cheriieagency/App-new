/**
 * Shared helpers for /api/ads — workspace + Meta user token resolution + full sync.
 */

import { cookies } from 'next/headers';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
} from '@/lib/social/persist';
import { loadWorkspaceSocialTokens } from '@/lib/analytics/workspace-tokens';
import {
  fetchMetaAccountInsightSeries,
  fetchMetaAdAccounts,
  fetchMetaAdsForAccount,
  fetchMetaAdSetsForAccount,
  fetchMetaCampaignsForAccount,
  fetchMetaCustomAudiences,
  type MetaAdRemote,
  type MetaAdSetRemote,
  type MetaCampaignRemote,
  type MetaCustomAudienceRemote,
  type MetaInsightDay,
} from '@/lib/meta/marketing-api';
import {
  aggregateCampaignKpis,
  listMetaAdAccounts,
  listMetaAds,
  listMetaAdSets,
  listMetaCampaigns,
  replaceInsightSeries,
  upsertMetaAdAccounts,
  upsertMetaAdsFromRemote,
  upsertMetaAdSetsFromRemote,
  upsertMetaCampaignsFromRemote,
  type MetaAdRow,
  type MetaAdSetRow,
  type MetaCampaignRow,
} from '@/lib/ads/persist';

export async function resolveAdsWorkspaceId(
  request: Request,
  bodyWorkspaceId?: string | null
): Promise<string | null> {
  const url = new URL(request.url);
  const jar = await cookies();
  return (
    (bodyWorkspaceId && bodyWorkspaceId.trim()) ||
    url.searchParams.get('workspaceId')?.trim() ||
    request.headers.get('x-workspace-id')?.trim() ||
    request.headers.get('x-active-workspace-id')?.trim() ||
    jar.get(ACTIVE_WORKSPACE_COOKIE)?.value ||
    jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value ||
    null
  );
}

/** Prefer Facebook user token; fall back to Instagram (often same Meta user token). */
export async function loadMetaAdsAccessToken(input: {
  userId: string;
  workspaceId: string;
}): Promise<{
  accessToken: string;
  platform: string;
  /** True when token is a Marketing API–capable user token. */
  isUserToken: boolean;
  /** Hint when only a Page token is available (Ads will likely fail). */
  needsReconnect?: boolean;
} | null> {
  const tokens = await loadWorkspaceSocialTokens({
    userId: input.userId,
    workspaceId: input.workspaceId,
    platforms: ['facebook', 'instagram'],
  });

  const pickUserToken = (row: (typeof tokens)[number] | undefined) => {
    if (!row) return null;
    const fromMeta = String(row.meta?.user_access_token || '').trim();
    if (fromMeta) return fromMeta;
    // Instagram rows sometimes store the long-lived user token as access_token.
    if (
      row.platform === 'instagram' &&
      String(row.meta?.token_source || '') === 'user_long_lived' &&
      row.access_token?.trim()
    ) {
      return row.access_token.trim();
    }
    return null;
  };

  const fb = tokens.find((t) => t.platform === 'facebook');
  const ig = tokens.find((t) => t.platform === 'instagram');

  const fbUser = pickUserToken(fb);
  if (fbUser) {
    return {
      accessToken: fbUser,
      platform: 'facebook',
      isUserToken: true,
    };
  }
  const igUser = pickUserToken(ig);
  if (igUser) {
    return {
      accessToken: igUser,
      platform: 'instagram',
      isUserToken: true,
    };
  }

  // Last resort: Page token — Marketing /me/adaccounts usually fails with this.
  const pageToken =
    fb?.access_token?.trim() || ig?.access_token?.trim() || null;
  if (pageToken) {
    return {
      accessToken: pageToken,
      platform: fb?.access_token ? 'facebook' : 'instagram',
      isUserToken: false,
      needsReconnect: true,
    };
  }
  return null;
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

export function resolveAdsDateRange(input?: {
  since?: string | null;
  until?: string | null;
  preset?: string | null;
}): { since: string; until: string; preset: string } {
  const until =
    input?.until?.trim() || new Date().toISOString().slice(0, 10);
  const preset = (input?.preset || '').trim().toLowerCase();
  if (input?.since?.trim()) {
    return { since: input.since.trim(), until, preset: 'custom' };
  }
  if (preset === 'last_7d' || preset === '7d') {
    return { since: isoDaysAgo(6), until, preset: 'last_7d' };
  }
  return { since: isoDaysAgo(29), until, preset: 'last_30d' };
}

export async function syncMetaAdsForWorkspace(input: {
  userId: string;
  workspaceId: string;
  accessToken: string;
  adAccountId?: string | null;
  since?: string;
  until?: string;
}): Promise<{
  accounts: Awaited<ReturnType<typeof listMetaAdAccounts>>;
  campaigns: MetaCampaignRow[];
  adsets: MetaAdSetRow[];
  ads: MetaAdRow[];
  audiences: MetaCustomAudienceRemote[];
  series: MetaInsightDay[];
  kpis: ReturnType<typeof aggregateCampaignKpis>;
  syncedAccounts: number;
  syncedCampaigns: number;
  syncedAdSets: number;
  syncedAds: number;
  accountErrors: Array<{ accountId: string; error: string }>;
  /** True when Meta returned zero ad accounts for this token. */
  noAdAccounts: boolean;
}> {
  const accounts = await fetchMetaAdAccounts(input.accessToken);
  await upsertMetaAdAccounts({
    workspaceId: input.workspaceId,
    userId: input.userId,
    accounts,
  });

  const targetAccounts = input.adAccountId
    ? accounts.filter(
        (a) =>
          a.id === input.adAccountId ||
          a.account_id === input.adAccountId?.replace(/^act_/, '')
      )
    : accounts;

  const remoteCampaigns: MetaCampaignRemote[] = [];
  const remoteAdSets: MetaAdSetRemote[] = [];
  const remoteAds: MetaAdRemote[] = [];
  const audiences: MetaCustomAudienceRemote[] = [];
  const seriesAll: MetaInsightDay[] = [];
  const accountErrors: Array<{ accountId: string; error: string }> = [];
  const currencyByAccount = new Map(
    accounts.map((a) => [a.id, a.currency] as const)
  );

  const range = resolveAdsDateRange({
    since: input.since,
    until: input.until,
  });

  for (const account of targetAccounts) {
    let accountHadPull = false;
    try {
      const campaigns = await fetchMetaCampaignsForAccount(
        account.id,
        input.accessToken
      );
      remoteCampaigns.push(...campaigns);
      accountHadPull = true;
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'campaigns_failed';
      console.warn('[ads/sync] campaigns failed for', account.id, error);
      accountErrors.push({ accountId: account.id, error: msg });
    }
    try {
      const adsets = await fetchMetaAdSetsForAccount(
        account.id,
        input.accessToken
      );
      remoteAdSets.push(...adsets);
      accountHadPull = true;
    } catch (error) {
      console.warn('[ads/sync] adsets failed for', account.id, error);
      if (!accountErrors.some((e) => e.accountId === account.id)) {
        accountErrors.push({
          accountId: account.id,
          error: error instanceof Error ? error.message : 'adsets_failed',
        });
      }
    }
    try {
      const ads = await fetchMetaAdsForAccount(account.id, input.accessToken);
      remoteAds.push(...ads);
      accountHadPull = true;
    } catch (error) {
      console.warn('[ads/sync] ads failed for', account.id, error);
    }
    try {
      const aud = await fetchMetaCustomAudiences(
        account.id,
        input.accessToken
      );
      audiences.push(...aud);
    } catch (error) {
      console.warn('[ads/sync] audiences failed for', account.id, error);
    }
    try {
      const series = await fetchMetaAccountInsightSeries(
        account.id,
        input.accessToken,
        range.since,
        range.until
      );
      if (series.length) {
        seriesAll.push(...series);
        await replaceInsightSeries({
          workspaceId: input.workspaceId,
          userId: input.userId,
          adAccountId: account.id,
          days: series,
        });
        accountHadPull = true;
      }
    } catch (error) {
      console.warn('[ads/sync] insights failed for', account.id, error);
    }
    void accountHadPull;
  }

  const campaignsByAccount = new Map<string, MetaCampaignRemote[]>();
  for (const campaign of remoteCampaigns) {
    const list = campaignsByAccount.get(campaign.ad_account_id) || [];
    list.push(campaign);
    campaignsByAccount.set(campaign.ad_account_id, list);
  }
  for (const [adAccountId, list] of campaignsByAccount) {
    await upsertMetaCampaignsFromRemote({
      workspaceId: input.workspaceId,
      userId: input.userId,
      currency: currencyByAccount.get(adAccountId) || 'SEK',
      campaigns: list,
    });
  }

  const adsetsByAccount = new Map<string, MetaAdSetRemote[]>();
  for (const adset of remoteAdSets) {
    const list = adsetsByAccount.get(adset.ad_account_id) || [];
    list.push(adset);
    adsetsByAccount.set(adset.ad_account_id, list);
  }
  for (const [adAccountId, list] of adsetsByAccount) {
    await upsertMetaAdSetsFromRemote({
      workspaceId: input.workspaceId,
      userId: input.userId,
      currency: currencyByAccount.get(adAccountId) || 'SEK',
      adsets: list,
    });
  }

  const adsByAccount = new Map<string, MetaAdRemote[]>();
  for (const ad of remoteAds) {
    const list = adsByAccount.get(ad.ad_account_id) || [];
    list.push(ad);
    adsByAccount.set(ad.ad_account_id, list);
  }
  for (const [adAccountId, list] of adsByAccount) {
    await upsertMetaAdsFromRemote({
      workspaceId: input.workspaceId,
      userId: input.userId,
      currency: currencyByAccount.get(adAccountId) || 'SEK',
      ads: list,
    });
  }

  const [storedAccounts, campaigns, adsets, ads] = await Promise.all([
    listMetaAdAccounts({
      workspaceId: input.workspaceId,
      userId: input.userId,
    }),
    listMetaCampaigns({
      workspaceId: input.workspaceId,
      userId: input.userId,
    }),
    listMetaAdSets({
      workspaceId: input.workspaceId,
      userId: input.userId,
    }),
    listMetaAds({
      workspaceId: input.workspaceId,
      userId: input.userId,
    }),
  ]);

  return {
    accounts: storedAccounts,
    campaigns,
    adsets,
    ads,
    audiences,
    series: seriesAll,
    kpis: aggregateCampaignKpis(campaigns),
    syncedAccounts: accounts.length,
    syncedCampaigns: remoteCampaigns.length,
    syncedAdSets: remoteAdSets.length,
    syncedAds: remoteAds.length,
    accountErrors,
    noAdAccounts: accounts.length === 0,
  };
}

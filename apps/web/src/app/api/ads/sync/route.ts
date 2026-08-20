/**
 * POST /api/ads/sync — pull campaigns / adsets / ads / audiences / insights (v20.0).
 * Requires DATABASE_URL + connected Meta token. Never seeds demo campaigns.
 */

import { requireApiSession } from '@/lib/auth/require-api-session';
import {
  aggregateCampaignKpis,
  aggregateSeriesKpis,
} from '@/lib/ads/persist';
import { purgeDemoAdsForWorkspace } from '@/lib/ads/demo-seed';
import {
  loadMetaAdsAccessToken,
  resolveAdsDateRange,
  resolveAdsWorkspaceId,
  syncMetaAdsForWorkspace,
} from '@/lib/ads/sync';

function emptyKpis() {
  return {
    totalSpend: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    avgCpc: 0,
    avgRoas: 0,
  };
}

export async function POST(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json(
      {
        ok: false,
        demo: false,
        error: 'database_required',
        message: 'DATABASE_URL is required to sync Meta Ads.',
      },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      workspaceId?: string;
      adAccountId?: string;
      since?: string;
      until?: string;
      preset?: string;
    };
    const workspaceId = await resolveAdsWorkspaceId(
      request,
      body.workspaceId ?? null
    );
    if (!workspaceId) {
      return Response.json(
        { error: 'workspace_required', message: 'workspaceId required' },
        { status: 400 }
      );
    }

    const range = resolveAdsDateRange({
      since: body.since,
      until: body.until,
      preset: body.preset,
    });

    await purgeDemoAdsForWorkspace({
      workspaceId,
      userId: session.user.id,
    });

    const token = await loadMetaAdsAccessToken({
      userId: session.user.id,
      workspaceId,
    });

    if (!token) {
      return Response.json({
        ok: false,
        demo: false,
        workspaceId,
        connected: false,
        accounts: [],
        campaigns: [],
        adsets: [],
        ads: [],
        audiences: [],
        series: [],
        dateRange: range,
        kpis: emptyKpis(),
        syncedAccounts: 0,
        syncedCampaigns: 0,
        syncedAdSets: 0,
        syncedAds: 0,
        message:
          'Connect Facebook under Settings → Socials with ads_read / ads_management, then sync again.',
        cta: { label: 'Connect Facebook', href: '/admin/settings/socials' },
      }, { status: 403 });
    }

    const result = await syncMetaAdsForWorkspace({
      userId: session.user.id,
      workspaceId,
      accessToken: token.accessToken,
      adAccountId: body.adAccountId?.trim() || null,
      since: range.since,
      until: range.until,
    });

    return Response.json({
      ok: true,
      demo: false,
      workspaceId,
      connected: true,
      tokenPlatform: token.platform,
      dateRange: range,
      ...result,
      kpis:
        result.series.length > 0
          ? aggregateSeriesKpis(result.series)
          : aggregateCampaignKpis(result.campaigns),
      message:
        result.campaigns.length === 0
          ? 'Synced Meta — no campaigns in this ad account yet.'
          : `Synced ${result.syncedCampaigns} campaigns, ${result.syncedAdSets} ad sets, ${result.syncedAds} ads.`,
      cta: null,
    });
  } catch (error) {
    console.error('[POST /api/ads/sync]', error);
    return Response.json(
      {
        ok: false,
        demo: false,
        error: 'sync_failed',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to sync Meta Ads metrics',
      },
      { status: 500 }
    );
  }
}

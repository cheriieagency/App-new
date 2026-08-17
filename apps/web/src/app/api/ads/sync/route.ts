/**
 * POST /api/ads/sync — pull campaigns / adsets / ads / audiences / insights (v20.0).
 */

import { requireApiSession } from '@/lib/auth/require-api-session';
import {
  aggregateCampaignKpis,
  aggregateSeriesKpis,
} from '@/lib/ads/persist';
import { ensureDemoAdsSeed, ensureDemoInsightSeries } from '@/lib/ads/demo-seed';
import {
  loadMetaAdsAccessToken,
  resolveAdsDateRange,
  resolveAdsWorkspaceId,
  syncMetaAdsForWorkspace,
} from '@/lib/ads/sync';

export async function POST(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json(
      {
        ok: true,
        demo: true,
        message: 'Demo mode — Meta sync skipped without DATABASE_URL.',
      },
      { status: 200 }
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

    const token = await loadMetaAdsAccessToken({
      userId: session.user.id,
      workspaceId,
    });

    if (!token) {
      const seeded = await ensureDemoAdsSeed({
        workspaceId,
        userId: session.user.id,
        force: true,
      });
      const series = await ensureDemoInsightSeries({
        workspaceId,
        userId: session.user.id,
        since: range.since,
        until: range.until,
      });
      return Response.json({
        ok: true,
        demo: true,
        workspaceId,
        connected: false,
        accounts: seeded.accounts,
        campaigns: seeded.campaigns,
        adsets: seeded.adsets,
        ads: seeded.ads,
        series,
        dateRange: range,
        kpis: aggregateSeriesKpis(series),
        syncedAccounts: seeded.accounts.length,
        syncedCampaigns: seeded.campaigns.length,
        syncedAdSets: seeded.adsets.length,
        syncedAds: seeded.ads.length,
        message:
          'Loaded demo Meta Ads data. Connect Facebook with ads permissions to sync live campaigns.',
        cta: { label: 'Connect Facebook', href: '/admin/settings/socials' },
      });
    }

    const result = await syncMetaAdsForWorkspace({
      userId: session.user.id,
      workspaceId,
      accessToken: token.accessToken,
      adAccountId: body.adAccountId?.trim() || null,
      since: range.since,
      until: range.until,
    });

    if (result.campaigns.length === 0) {
      const seeded = await ensureDemoAdsSeed({
        workspaceId,
        userId: session.user.id,
        force: true,
      });
      const series = await ensureDemoInsightSeries({
        workspaceId,
        userId: session.user.id,
        since: range.since,
        until: range.until,
      });
      return Response.json({
        ok: true,
        demo: true,
        workspaceId,
        connected: true,
        tokenPlatform: token.platform,
        accounts: seeded.accounts,
        campaigns: seeded.campaigns,
        adsets: seeded.adsets,
        ads: seeded.ads,
        series,
        dateRange: range,
        kpis: aggregateSeriesKpis(series),
        syncedAccounts: 0,
        syncedCampaigns: 0,
        syncedAdSets: 0,
        syncedAds: 0,
        message:
          'No live Meta campaigns found — showing demo data. Create campaigns in Ads Manager, then sync again.',
      });
    }

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
      message: `Synced ${result.syncedCampaigns} campaigns, ${result.syncedAdSets} ad sets, ${result.syncedAds} ads.`,
    });
  } catch (error) {
    console.error('[POST /api/ads/sync]', error);
    return Response.json(
      {
        ok: false,
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

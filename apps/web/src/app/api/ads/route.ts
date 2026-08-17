/**
 * GET /api/ads?workspaceId=…&preset=last_7d|last_30d&since=&until=
 * Full Meta Ads Manager board: campaigns → adsets → ads + KPI series.
 */

import { requireApiSession } from '@/lib/auth/require-api-session';
import {
  aggregateCampaignKpis,
  aggregateSeriesKpis,
  listInsightSeries,
  listMetaAdAccounts,
  listMetaAds,
  listMetaAdSets,
  listMetaCampaigns,
} from '@/lib/ads/persist';
import {
  ensureDemoAdsSeed,
  ensureDemoInsightSeries,
  getInMemoryDemoAdsPayload,
  isDemoAdsId,
} from '@/lib/ads/demo-seed';
import {
  loadMetaAdsAccessToken,
  resolveAdsDateRange,
  resolveAdsWorkspaceId,
} from '@/lib/ads/sync';

export async function GET(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  const url = new URL(request.url);
  const range = resolveAdsDateRange({
    since: url.searchParams.get('since'),
    until: url.searchParams.get('until'),
    preset: url.searchParams.get('preset'),
  });

  const workspaceId = await resolveAdsWorkspaceId(request);
  if (!workspaceId) {
    return Response.json({
      ok: true,
      workspaceId: null,
      connected: false,
      accounts: [],
      campaigns: [],
      adsets: [],
      ads: [],
      audiences: [],
      series: [],
      dateRange: range,
      kpis: {
        totalSpend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        avgCpc: 0,
        avgRoas: 0,
      },
      message: 'Select a workspace to load Meta Ads.',
    });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json(
      getInMemoryDemoAdsPayload(workspaceId, range.since, range.until)
    );
  }

  try {
    const token = await loadMetaAdsAccessToken({
      userId: session.user.id,
      workspaceId,
    });

    let [accounts, campaigns, adsets, ads] = await Promise.all([
      listMetaAdAccounts({ workspaceId, userId: session.user.id }),
      listMetaCampaigns({ workspaceId, userId: session.user.id }),
      listMetaAdSets({ workspaceId, userId: session.user.id }),
      listMetaAds({ workspaceId, userId: session.user.id }),
    ]);

    if (campaigns.length === 0) {
      const seeded = await ensureDemoAdsSeed({
        workspaceId,
        userId: session.user.id,
      });
      accounts = seeded.accounts;
      campaigns = seeded.campaigns;
      adsets = seeded.adsets;
      ads = seeded.ads;
    } else if (adsets.length === 0 || ads.length === 0) {
      // Backfill ad sets / ads for older campaign-only (or adset-only) demos.
      const seeded = await ensureDemoAdsSeed({
        workspaceId,
        userId: session.user.id,
      });
      if (adsets.length === 0) adsets = seeded.adsets;
      if (ads.length === 0) ads = seeded.ads;
      if (accounts.length === 0) accounts = seeded.accounts;
    }

    let series = await listInsightSeries({
      workspaceId,
      userId: session.user.id,
      since: range.since,
      until: range.until,
    });

    const allDemo =
      campaigns.length > 0 && campaigns.every((c) => isDemoAdsId(c.id));

    if (series.length === 0 && allDemo) {
      series = await ensureDemoInsightSeries({
        workspaceId,
        userId: session.user.id,
        since: range.since,
        until: range.until,
      });
    }

    const kpis =
      series.length > 0
        ? aggregateSeriesKpis(series)
        : aggregateCampaignKpis(campaigns);

    return Response.json({
      ok: true,
      demo: allDemo,
      workspaceId,
      connected: Boolean(token),
      tokenPlatform: token?.platform ?? null,
      accounts,
      campaigns,
      adsets,
      ads,
      audiences: allDemo
        ? [
            {
              id: 'demo-aud-visitors-30d',
              name: 'Website visitors last 30 days',
              subtype: 'WEBSITE',
              description: 'Meta Pixel retargeting',
            },
            {
              id: 'demo-aud-cart-14d',
              name: 'Add to cart last 14 days',
              subtype: 'WEBSITE',
              description: 'Meta Pixel retargeting',
            },
          ]
        : [],
      series,
      dateRange: range,
      kpis,
      message: allDemo
        ? 'Demo campaigns loaded — connect Facebook with ads permissions, then Sync Meta Metrics for live data.'
        : token
          ? null
          : 'Connect Facebook under Settings → Socials (ads_read / ads_management) to sync Meta Ads.',
      cta:
        allDemo || !token
          ? { label: 'Connect Facebook', href: '/admin/settings/socials' }
          : null,
    });
  } catch (error) {
    console.error('[GET /api/ads]', error);
    return Response.json(
      {
        ok: false,
        error: 'load_failed',
        message:
          error instanceof Error ? error.message : 'Failed to load Meta Ads',
        workspaceId,
        accounts: [],
        campaigns: [],
        adsets: [],
        ads: [],
        series: [],
        dateRange: range,
        kpis: {
          totalSpend: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          avgCpc: 0,
          avgRoas: 0,
        },
      },
      { status: 500 }
    );
  }
}

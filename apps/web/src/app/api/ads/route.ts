/**
 * GET /api/ads?workspaceId=…&preset=last_7d|last_30d&since=&until=
 * Full Meta Ads Manager board: campaigns → adsets → ads + KPI series.
 * Real data only when DATABASE_URL is set — never auto-seeds demo campaigns.
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
import { isDemoAdsId, purgeDemoAdsForWorkspace } from '@/lib/ads/demo-seed';
import {
  loadMetaAdsAccessToken,
  resolveAdsDateRange,
  resolveAdsWorkspaceId,
} from '@/lib/ads/sync';
import { fetchMetaCustomAudiences } from '@/lib/meta/marketing-api';

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
      demo: false,
      accounts: [],
      campaigns: [],
      adsets: [],
      ads: [],
      audiences: [],
      series: [],
      dateRange: range,
      kpis: emptyKpis(),
      message: 'Select a workspace to load Meta Ads.',
      cta: null,
    });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json({
      ok: true,
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
      message:
        'DATABASE_URL is required to load Meta Ads. Connect Postgres, then Sync Meta.',
      cta: null,
    });
  }

  try {
    // Drop any legacy demo seed so the board never shows fake spend/ROAS.
    await purgeDemoAdsForWorkspace({
      workspaceId,
      userId: session.user.id,
    });

    const token = await loadMetaAdsAccessToken({
      userId: session.user.id,
      workspaceId,
    });

    const [accountsRaw, campaignsRaw, adsetsRaw, adsRaw] = await Promise.all([
      listMetaAdAccounts({ workspaceId, userId: session.user.id }),
      listMetaCampaigns({ workspaceId, userId: session.user.id }),
      listMetaAdSets({ workspaceId, userId: session.user.id }),
      listMetaAds({ workspaceId, userId: session.user.id }),
    ]);

    const accounts = accountsRaw.filter((a) => !isDemoAdsId(a.id));
    const campaigns = campaignsRaw.filter((c) => !isDemoAdsId(c.id));
    const adsets = adsetsRaw.filter((a) => !isDemoAdsId(a.id));
    const ads = adsRaw.filter((a) => !isDemoAdsId(a.id));

    const series = await listInsightSeries({
      workspaceId,
      userId: session.user.id,
      since: range.since,
      until: range.until,
    });

    const kpis =
      series.length > 0
        ? aggregateSeriesKpis(series)
        : aggregateCampaignKpis(campaigns);

    let audiences: Array<{
      id: string;
      name: string;
      subtype: string | null;
      description: string | null;
    }> = [];

    const connected = Boolean(token);
    const needsReconnect = Boolean(token?.needsReconnect || (token && !token.isUserToken));
    // Only call Marketing API with a user token.
    if (token?.isUserToken && accounts.length > 0) {
      try {
        const remote = await fetchMetaCustomAudiences(
          accounts[0].id,
          token.accessToken
        );
        audiences = remote.map((a) => ({
          id: a.id,
          name: a.name,
          subtype: a.subtype ?? null,
          description: a.description ?? null,
        }));
      } catch (audErr) {
        console.warn('[GET /api/ads] audiences', audErr);
      }
    }

    return Response.json({
      ok: true,
      demo: false,
      workspaceId,
      connected,
      needsReconnect,
      tokenPlatform: token?.platform ?? null,
      accounts,
      campaigns,
      adsets,
      ads,
      audiences,
      series,
      dateRange: range,
      kpis,
      message: needsReconnect
        ? 'Reconnect Facebook under Settings → Socials so Ads Manager can use ads_read / ads_management (user token).'
        : connected
          ? campaigns.length === 0
            ? 'No Meta campaigns yet. Click Sync Meta to pull from your ad account, or create a campaign.'
            : null
          : 'Connect Facebook under Settings → Socials with ads_read / ads_management, then Sync Meta.',
      cta: needsReconnect
        ? { label: 'Reconnect Facebook', href: '/admin/settings/socials' }
        : connected
          ? null
          : { label: 'Connect Facebook', href: '/admin/settings/socials' },
    });
  } catch (error) {
    console.error('[GET /api/ads]', error);
    return Response.json(
      {
        ok: false,
        demo: false,
        error: 'load_failed',
        message:
          error instanceof Error ? error.message : 'Failed to load Meta Ads',
        workspaceId,
        accounts: [],
        campaigns: [],
        adsets: [],
        ads: [],
        audiences: [],
        series: [],
        dateRange: range,
        kpis: emptyKpis(),
      },
      { status: 500 }
    );
  }
}

/**
 * Durable demo Meta Ads seed — 3-tier hierarchy + daily insight series.
 * IDs are valid UUIDs (Postgres uuid columns reject strings like `act_demo_clikd`).
 */

import type {
  MetaAdAccount,
  MetaAdRemote,
  MetaAdSetRemote,
  MetaCampaignRemote,
  MetaInsightDay,
} from '@/lib/meta/marketing-api';
import {
  listInsightSeries,
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

/** Fixed demo UUIDs (namespace a000… so they’re easy to spot in DB). */
export const DEMO_AD_ACCOUNT_ID = 'a0000000-0000-4000-8000-000000000001';

const DEMO_CAMPAIGN_IDS = [
  'a0000000-0000-4000-8000-000000000011',
  'a0000000-0000-4000-8000-000000000012',
  'a0000000-0000-4000-8000-000000000013',
  'a0000000-0000-4000-8000-000000000014',
  'a0000000-0000-4000-8000-000000000015',
] as const;

const DEMO_ADSET_IDS = [
  'a0000000-0000-4000-8000-000000000021',
  'a0000000-0000-4000-8000-000000000022',
  'a0000000-0000-4000-8000-000000000023',
  'a0000000-0000-4000-8000-000000000024',
  'a0000000-0000-4000-8000-000000000025',
  'a0000000-0000-4000-8000-000000000026',
  'a0000000-0000-4000-8000-000000000027',
] as const;

const DEMO_AD_IDS = [
  'a0000000-0000-4000-8000-000000000031',
  'a0000000-0000-4000-8000-000000000032',
  'a0000000-0000-4000-8000-000000000033',
  'a0000000-0000-4000-8000-000000000034',
  'a0000000-0000-4000-8000-000000000035',
  'a0000000-0000-4000-8000-000000000036',
  'a0000000-0000-4000-8000-000000000037',
  'a0000000-0000-4000-8000-000000000038',
  'a0000000-0000-4000-8000-000000000039',
  'a0000000-0000-4000-8000-00000000003a',
] as const;

const DEMO_ID_SET = new Set<string>([
  DEMO_AD_ACCOUNT_ID,
  ...DEMO_CAMPAIGN_IDS,
  ...DEMO_ADSET_IDS,
  ...DEMO_AD_IDS,
]);

export function isDemoAdsId(id: string | null | undefined): boolean {
  const v = (id || '').trim().toLowerCase();
  if (!v) return false;
  if (DEMO_ID_SET.has(v)) return true;
  return (
    v.startsWith('demo-') ||
    v.startsWith('a0000000-') ||
    v.startsWith('act_demo_') ||
    v.includes('demo_clikd')
  );
}

function demoAccount(): MetaAdAccount {
  return {
    id: DEMO_AD_ACCOUNT_ID,
    account_id: 'demo_clikd',
    name: 'clikd: Demo Ad Account',
    currency: 'SEK',
    account_status: 1,
  };
}

function demoCampaigns(): MetaCampaignRemote[] {
  return [
    {
      id: DEMO_CAMPAIGN_IDS[0],
      name: 'Brand Awareness — Nordic Creators',
      status: 'ACTIVE',
      effective_status: 'ACTIVE',
      objective: 'OUTCOME_ENGAGEMENT',
      daily_budget: 45000,
      ad_account_id: DEMO_AD_ACCOUNT_ID,
      insights: {
        spend: 1284.5,
        impressions: 84210,
        clicks: 2140,
        cpc: 0.6,
        conversions: 42,
        purchase_roas: 1.8,
      },
    },
    {
      id: DEMO_CAMPAIGN_IDS[1],
      name: 'Bio Store Traffic — Soft Launch',
      status: 'ACTIVE',
      effective_status: 'ACTIVE',
      objective: 'OUTCOME_TRAFFIC',
      daily_budget: 30000,
      ad_account_id: DEMO_AD_ACCOUNT_ID,
      insights: {
        spend: 892.25,
        impressions: 42180,
        clicks: 1685,
        cpc: 0.53,
        conversions: 118,
        purchase_roas: 0,
      },
    },
    {
      id: DEMO_CAMPAIGN_IDS[2],
      name: 'Email Capture — Community Waitlist',
      status: 'PAUSED',
      effective_status: 'PAUSED',
      objective: 'OUTCOME_LEADS',
      daily_budget: 20000,
      ad_account_id: DEMO_AD_ACCOUNT_ID,
      insights: {
        spend: 410.0,
        impressions: 18540,
        clicks: 620,
        cpc: 0.66,
        conversions: 86,
        purchase_roas: 0,
      },
    },
    {
      id: DEMO_CAMPAIGN_IDS[3],
      name: 'Course Launch — Retargeting',
      status: 'ACTIVE',
      effective_status: 'ACTIVE',
      objective: 'OUTCOME_SALES',
      daily_budget: 75000,
      ad_account_id: DEMO_AD_ACCOUNT_ID,
      insights: {
        spend: 2340.8,
        impressions: 56320,
        clicks: 1980,
        cpc: 1.18,
        conversions: 64,
        purchase_roas: 3.4,
      },
    },
    {
      id: DEMO_CAMPAIGN_IDS[4],
      name: 'Reel Boost — Engagement',
      status: 'PAUSED',
      effective_status: 'PAUSED',
      objective: 'OUTCOME_ENGAGEMENT',
      daily_budget: 15000,
      ad_account_id: DEMO_AD_ACCOUNT_ID,
      insights: {
        spend: 156.4,
        impressions: 31200,
        clicks: 890,
        cpc: 0.18,
        conversions: 12,
        purchase_roas: 0,
      },
    },
  ];
}

function demoAdSets(): MetaAdSetRemote[] {
  return [
    {
      id: DEMO_ADSET_IDS[0],
      campaign_id: DEMO_CAMPAIGN_IDS[0],
      ad_account_id: DEMO_AD_ACCOUNT_ID,
      name: 'SE · Ages 25–44 · Broad',
      status: 'ACTIVE',
      daily_budget: 25000,
      targeting_summary: 'SE · Ages 25–44',
      insights: {
        spend: 720.1,
        impressions: 48100,
        clicks: 1210,
        cpc: 0.6,
        conversions: 24,
      },
    },
    {
      id: DEMO_ADSET_IDS[1],
      campaign_id: DEMO_CAMPAIGN_IDS[0],
      ad_account_id: DEMO_AD_ACCOUNT_ID,
      name: 'NO+DK · Lookalike 1%',
      status: 'ACTIVE',
      daily_budget: 20000,
      targeting_summary: 'NO, DK · Ages 22–40',
      insights: {
        spend: 564.4,
        impressions: 36110,
        clicks: 930,
        cpc: 0.61,
        conversions: 18,
      },
    },
    {
      id: DEMO_ADSET_IDS[2],
      campaign_id: DEMO_CAMPAIGN_IDS[1],
      ad_account_id: DEMO_AD_ACCOUNT_ID,
      name: 'Nordic · Link clicks',
      status: 'ACTIVE',
      daily_budget: 30000,
      targeting_summary: 'SE, NO, DK, FI · Ages 18–45',
      insights: {
        spend: 892.25,
        impressions: 42180,
        clicks: 1685,
        cpc: 0.53,
        conversions: 118,
      },
    },
    {
      id: DEMO_ADSET_IDS[3],
      campaign_id: DEMO_CAMPAIGN_IDS[2],
      ad_account_id: DEMO_AD_ACCOUNT_ID,
      name: 'Lead form · SE',
      status: 'PAUSED',
      daily_budget: 20000,
      targeting_summary: 'SE · Ages 25–54',
      insights: {
        spend: 410.0,
        impressions: 18540,
        clicks: 620,
        cpc: 0.66,
        conversions: 86,
      },
    },
    {
      id: DEMO_ADSET_IDS[4],
      campaign_id: DEMO_CAMPAIGN_IDS[3],
      ad_account_id: DEMO_AD_ACCOUNT_ID,
      name: 'Pixel · Website visitors 30d',
      status: 'ACTIVE',
      daily_budget: 45000,
      targeting_summary: 'Website visitors last 30 days',
      insights: {
        spend: 1480.5,
        impressions: 32100,
        clicks: 1120,
        cpc: 1.32,
        conversions: 41,
      },
    },
    {
      id: DEMO_ADSET_IDS[5],
      campaign_id: DEMO_CAMPAIGN_IDS[3],
      ad_account_id: DEMO_AD_ACCOUNT_ID,
      name: 'Pixel · Add to cart 14d',
      status: 'ACTIVE',
      daily_budget: 30000,
      targeting_summary: 'Add to cart last 14 days',
      insights: {
        spend: 860.3,
        impressions: 24220,
        clicks: 860,
        cpc: 1.0,
        conversions: 23,
      },
    },
    {
      id: DEMO_ADSET_IDS[6],
      campaign_id: DEMO_CAMPAIGN_IDS[4],
      ad_account_id: DEMO_AD_ACCOUNT_ID,
      name: 'IG Reels · SE',
      status: 'PAUSED',
      daily_budget: 15000,
      targeting_summary: 'SE · Ages 18–34',
      insights: {
        spend: 156.4,
        impressions: 31200,
        clicks: 890,
        cpc: 0.18,
        conversions: 12,
      },
    },
  ];
}

function demoAds(): MetaAdRemote[] {
  return [
    {
      id: DEMO_AD_IDS[0],
      adset_id: DEMO_ADSET_IDS[0],
      campaign_id: DEMO_CAMPAIGN_IDS[0],
      ad_account_id: DEMO_AD_ACCOUNT_ID,
      name: 'Carousel — Creator toolkit',
      status: 'ACTIVE',
      creative_thumbnail: null,
      headline: 'Build your creator brand with clikd:',
      insights: {
        spend: 410.2,
        impressions: 26100,
        clicks: 680,
        cpc: 0.6,
        conversions: 14,
      },
    },
    {
      id: DEMO_AD_IDS[1],
      adset_id: DEMO_ADSET_IDS[0],
      campaign_id: DEMO_CAMPAIGN_IDS[0],
      ad_account_id: DEMO_AD_ACCOUNT_ID,
      name: 'Video — Soft launch teaser',
      status: 'ACTIVE',
      creative_thumbnail: null,
      headline: 'Your store, community & events — one place',
      insights: {
        spend: 309.9,
        impressions: 22000,
        clicks: 530,
        cpc: 0.58,
        conversions: 10,
      },
    },
    {
      id: DEMO_AD_IDS[2],
      adset_id: DEMO_ADSET_IDS[1],
      campaign_id: DEMO_CAMPAIGN_IDS[0],
      ad_account_id: DEMO_AD_ACCOUNT_ID,
      name: 'Single image — Nordic pink',
      status: 'PAUSED',
      creative_thumbnail: null,
      headline: 'Made for Nordic creators',
      insights: {
        spend: 564.4,
        impressions: 36110,
        clicks: 930,
        cpc: 0.61,
        conversions: 18,
      },
    },
    {
      id: DEMO_AD_IDS[3],
      adset_id: DEMO_ADSET_IDS[2],
      campaign_id: DEMO_CAMPAIGN_IDS[1],
      ad_account_id: DEMO_AD_ACCOUNT_ID,
      name: 'Story — Bio link CTA',
      status: 'ACTIVE',
      creative_thumbnail: null,
      headline: 'Shop the soft launch',
      insights: {
        spend: 892.25,
        impressions: 42180,
        clicks: 1685,
        cpc: 0.53,
        conversions: 118,
      },
    },
    {
      id: DEMO_AD_IDS[4],
      adset_id: DEMO_ADSET_IDS[3],
      campaign_id: DEMO_CAMPAIGN_IDS[2],
      ad_account_id: DEMO_AD_ACCOUNT_ID,
      name: 'Lead ad — Waitlist',
      status: 'PAUSED',
      creative_thumbnail: null,
      headline: 'Join the community waitlist',
      insights: {
        spend: 410.0,
        impressions: 18540,
        clicks: 620,
        cpc: 0.66,
        conversions: 86,
      },
    },
    {
      id: DEMO_AD_IDS[5],
      adset_id: DEMO_ADSET_IDS[4],
      campaign_id: DEMO_CAMPAIGN_IDS[3],
      ad_account_id: DEMO_AD_ACCOUNT_ID,
      name: 'Retarget — Course offer',
      status: 'ACTIVE',
      creative_thumbnail: null,
      headline: 'Finish what you started — 20% off',
      insights: {
        spend: 980.0,
        impressions: 20100,
        clicks: 720,
        cpc: 1.36,
        conversions: 28,
      },
    },
    {
      id: DEMO_AD_IDS[6],
      adset_id: DEMO_ADSET_IDS[5],
      campaign_id: DEMO_CAMPAIGN_IDS[3],
      ad_account_id: DEMO_AD_ACCOUNT_ID,
      name: 'Dynamic — Cart abandon',
      status: 'ACTIVE',
      creative_thumbnail: null,
      headline: 'Your cart is waiting',
      insights: {
        spend: 860.3,
        impressions: 24220,
        clicks: 860,
        cpc: 1.0,
        conversions: 23,
      },
    },
    {
      id: DEMO_AD_IDS[7],
      adset_id: DEMO_ADSET_IDS[6],
      campaign_id: DEMO_CAMPAIGN_IDS[4],
      ad_account_id: DEMO_AD_ACCOUNT_ID,
      name: 'Reel boost — Hook cut',
      status: 'PAUSED',
      creative_thumbnail: null,
      headline: 'Watch the behind-the-scenes',
      insights: {
        spend: 156.4,
        impressions: 31200,
        clicks: 890,
        cpc: 0.18,
        conversions: 12,
      },
    },
    {
      id: DEMO_AD_IDS[8],
      adset_id: DEMO_ADSET_IDS[4],
      campaign_id: DEMO_CAMPAIGN_IDS[3],
      ad_account_id: DEMO_AD_ACCOUNT_ID,
      name: 'Retarget — Testimonial reel',
      status: 'ACTIVE',
      creative_thumbnail: null,
      headline: 'Creators who switched to clikd:',
      insights: {
        spend: 500.5,
        impressions: 12000,
        clicks: 400,
        cpc: 1.25,
        conversions: 13,
      },
    },
    {
      id: DEMO_AD_IDS[9],
      adset_id: DEMO_ADSET_IDS[4],
      campaign_id: DEMO_CAMPAIGN_IDS[3],
      ad_account_id: DEMO_AD_ACCOUNT_ID,
      name: 'Retarget — Urgency banner',
      status: 'PAUSED',
      creative_thumbnail: null,
      headline: 'Seats closing this week',
      insights: {
        spend: 0,
        impressions: 0,
        clicks: 0,
        cpc: 0,
        conversions: 0,
      },
    },
  ];
}

/** Synthetic daily series for trend charts (deterministic from day index). */
export function buildDemoInsightSeries(
  since: string,
  until: string
): MetaInsightDay[] {
  const start = new Date(`${since}T12:00:00Z`);
  const end = new Date(`${until}T12:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  const days: MetaInsightDay[] = [];
  const cursor = new Date(start);
  let i = 0;
  while (cursor <= end) {
    const wave = 0.75 + 0.35 * Math.sin(i / 2.4);
    const spend = Math.round((140 + (i % 7) * 28) * wave * 100) / 100;
    const clicks = Math.round(180 + (i % 5) * 40 * wave);
    const impressions = Math.round(clicks * (38 + (i % 4) * 3));
    const conversions = Math.round(4 + (i % 6) * 1.4 * wave);
    const cpc = clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0;
    const purchase_roas =
      Math.round((1.4 + (i % 5) * 0.35 + wave * 0.4) * 100) / 100;
    days.push({
      date: cursor.toISOString().slice(0, 10),
      spend,
      impressions,
      clicks,
      cpc,
      conversions,
      purchase_roas,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    i += 1;
  }
  return days;
}

function toCampaignRows(
  workspaceId: string,
  campaigns: MetaCampaignRemote[]
): MetaCampaignRow[] {
  return campaigns.map((c) => ({
    id: c.id,
    workspace_id: workspaceId,
    user_id: 'demo',
    ad_account_id: c.ad_account_id,
    name: c.name,
    status: c.status,
    objective: c.objective,
    daily_budget: (c.daily_budget || 0) / 100,
    spend: c.insights.spend,
    impressions: c.insights.impressions,
    clicks: c.insights.clicks,
    cpc: c.insights.cpc,
    conversions: c.insights.conversions || 0,
    purchase_roas: c.insights.purchase_roas || 0,
    currency: 'SEK',
    synced_at: new Date().toISOString(),
  }));
}

function toAdSetRows(
  workspaceId: string,
  adsets: MetaAdSetRemote[]
): MetaAdSetRow[] {
  return adsets.map((a) => ({
    id: a.id,
    workspace_id: workspaceId,
    user_id: 'demo',
    ad_account_id: a.ad_account_id,
    campaign_id: a.campaign_id,
    name: a.name,
    status: a.status,
    daily_budget: (a.daily_budget || 0) / 100,
    targeting_summary: a.targeting_summary,
    spend: a.insights.spend,
    impressions: a.insights.impressions,
    clicks: a.insights.clicks,
    cpc: a.insights.cpc,
    conversions: a.insights.conversions || 0,
    currency: 'SEK',
    synced_at: new Date().toISOString(),
  }));
}

function toAdRows(workspaceId: string, ads: MetaAdRemote[]): MetaAdRow[] {
  return ads.map((a) => ({
    id: a.id,
    workspace_id: workspaceId,
    user_id: 'demo',
    ad_account_id: a.ad_account_id,
    campaign_id: a.campaign_id,
    adset_id: a.adset_id,
    name: a.name,
    status: a.status,
    creative_thumbnail: a.creative_thumbnail,
    headline: a.headline,
    spend: a.insights.spend,
    impressions: a.insights.impressions,
    clicks: a.insights.clicks,
    cpc: a.insights.cpc,
    conversions: a.insights.conversions || 0,
    currency: 'SEK',
    synced_at: new Date().toISOString(),
  }));
}

/** In-memory payload when DATABASE_URL is not configured. */
export function getInMemoryDemoAdsPayload(
  workspaceId: string,
  since?: string,
  until?: string
) {
  const account = demoAccount();
  const campaigns = toCampaignRows(workspaceId, demoCampaigns());
  const adsets = toAdSetRows(workspaceId, demoAdSets());
  const ads = toAdRows(workspaceId, demoAds());
  const end = until || new Date().toISOString().slice(0, 10);
  const start =
    since ||
    new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
  const series = buildDemoInsightSeries(start, end);
  const spend = series.reduce((s, d) => s + d.spend, 0);
  const impressions = series.reduce((s, d) => s + d.impressions, 0);
  const clicks = series.reduce((s, d) => s + d.clicks, 0);
  const conversions = series.reduce((s, d) => s + d.conversions, 0);
  const roasWeighted = series.reduce(
    (s, d) => s + d.purchase_roas * d.spend,
    0
  );
  return {
    ok: true as const,
    demo: true as const,
    workspaceId,
    connected: false,
    accounts: [account],
    campaigns,
    adsets,
    ads,
    audiences: [
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
    ],
    series,
    dateRange: { since: start, until: end },
    kpis: {
      totalSpend: Math.round(spend * 100) / 100,
      impressions,
      clicks,
      conversions: Math.round(conversions * 100) / 100,
      avgCpc: clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0,
      avgRoas: spend > 0 ? Math.round((roasWeighted / spend) * 100) / 100 : 0,
    },
    message:
      'Demo Meta Ads data — connect Facebook with ads permissions to sync live campaigns.',
    cta: { label: 'Connect Facebook', href: '/admin/settings/socials' },
  };
}

/**
 * Upsert demo account + 3-tier hierarchy when the board is empty.
 */
export async function ensureDemoAdsSeed(input: {
  workspaceId: string;
  userId: string;
  force?: boolean;
}): Promise<{
  accounts: MetaAdAccount[];
  campaigns: MetaCampaignRow[];
  adsets: MetaAdSetRow[];
  ads: MetaAdRow[];
  seeded: boolean;
}> {
  const existingCampaigns = await listMetaCampaigns({
    workspaceId: input.workspaceId,
    userId: input.userId,
  });
  const hasLive = existingCampaigns.some((c) => !isDemoAdsId(c.id));
  const hasDemo = existingCampaigns.some((c) => isDemoAdsId(c.id));

  if ((hasLive || hasDemo) && !input.force) {
    const [accounts, adsets, ads] = await Promise.all([
      listMetaAdAccounts({
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
    // Older demo seeds may only have campaigns — backfill hierarchy.
    if (hasDemo && adsets.length === 0) {
      await upsertMetaAdSetsFromRemote({
        workspaceId: input.workspaceId,
        userId: input.userId,
        currency: 'SEK',
        adsets: demoAdSets(),
      });
      await upsertMetaAdsFromRemote({
        workspaceId: input.workspaceId,
        userId: input.userId,
        currency: 'SEK',
        ads: demoAds(),
      });
      const [adsets2, ads2] = await Promise.all([
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
        accounts,
        campaigns: existingCampaigns,
        adsets: adsets2,
        ads: ads2,
        seeded: true,
      };
    }
    // Ad sets exist but ads were never seeded (common after schema heal).
    if (hasDemo && ads.length === 0) {
      await upsertMetaAdsFromRemote({
        workspaceId: input.workspaceId,
        userId: input.userId,
        currency: 'SEK',
        ads: demoAds(),
      });
      const ads2 = await listMetaAds({
        workspaceId: input.workspaceId,
        userId: input.userId,
      });
      return {
        accounts,
        campaigns: existingCampaigns,
        adsets,
        ads: ads2,
        seeded: true,
      };
    }
    return {
      accounts,
      campaigns: existingCampaigns,
      adsets,
      ads,
      seeded: false,
    };
  }

  const account = demoAccount();
  await upsertMetaAdAccounts({
    workspaceId: input.workspaceId,
    userId: input.userId,
    accounts: [account],
  });
  await upsertMetaCampaignsFromRemote({
    workspaceId: input.workspaceId,
    userId: input.userId,
    currency: 'SEK',
    campaigns: demoCampaigns(),
  });
  await upsertMetaAdSetsFromRemote({
    workspaceId: input.workspaceId,
    userId: input.userId,
    currency: 'SEK',
    adsets: demoAdSets(),
  });
  await upsertMetaAdsFromRemote({
    workspaceId: input.workspaceId,
    userId: input.userId,
    currency: 'SEK',
    ads: demoAds(),
  });

  const until = new Date().toISOString().slice(0, 10);
  const since = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
  await replaceInsightSeries({
    workspaceId: input.workspaceId,
    userId: input.userId,
    adAccountId: DEMO_AD_ACCOUNT_ID,
    days: buildDemoInsightSeries(since, until),
  });

  const [accounts, campaigns, adsets, ads] = await Promise.all([
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

  return { accounts, campaigns, adsets, ads, seeded: true };
}

/** Ensure demo insight days exist for a date window (fills gaps). */
export async function ensureDemoInsightSeries(input: {
  workspaceId: string;
  userId: string;
  since: string;
  until: string;
}): Promise<MetaInsightDay[]> {
  const existing = await listInsightSeries(input);
  if (existing.length > 0) return existing;
  const days = buildDemoInsightSeries(input.since, input.until);
  await replaceInsightSeries({
    workspaceId: input.workspaceId,
    userId: input.userId,
    adAccountId: DEMO_AD_ACCOUNT_ID,
    days,
  });
  return days;
}

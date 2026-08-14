/**
 * Multi-platform audience demographics aggregator.
 * Pulls whatever each API exposes, then merges into one AnalyticsDemographics shape.
 *
 * Availability (official APIs):
 * - Meta Instagram: age / gender / city / country / online hours
 * - Meta Facebook Pages: age-gender / city / country (page fans)
 * - YouTube Analytics: age / gender / country (viewer %)
 * - Pinterest: organic user analytics are limited; ads audience_insights needs an ad account
 * - TikTok Display API: no audience demographics endpoints
 */

import sql from '@/app/api/utils/sql';
import {
  fetchInstagramAudienceDemographics,
  type DemoBreakdownRow,
  type InstagramAudienceDemographics,
} from '@/lib/meta/graph-api';

export type PlatformDemographicsSource =
  | 'instagram'
  | 'facebook'
  | 'youtube'
  | 'pinterest'
  | 'tiktok'
  | 'combined';

export type PlatformDemographicsSlice = {
  platform: PlatformDemographicsSource;
  available: boolean;
  message?: string | null;
  countries: DemoBreakdownRow[];
  cities: DemoBreakdownRow[];
  genders: DemoBreakdownRow[];
  ages: DemoBreakdownRow[];
  active_hours: number[];
};

export type MultiPlatformDemographics = InstagramAudienceDemographics & {
  by_platform: PlatformDemographicsSlice[];
  platforms_with_data: string[];
};

type TokenRow = {
  platform: string;
  platform_user_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  handle: string | null;
  page_id: string | null;
  followers_count: number | null;
};

const emptyHours = () => Array.from({ length: 24 }, () => 0);

function normalizeRows(
  entries: Array<{ key: string; label: string; value: number }>,
  limit = 8
): DemoBreakdownRow[] {
  const sorted = [...entries]
    .filter((e) => e.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
  const total = sorted.reduce((s, e) => s + e.value, 0) || 1;
  return sorted.map((e) => ({
    ...e,
    pct: Math.round((e.value / total) * 1000) / 10,
  }));
}

function mergeRows(lists: DemoBreakdownRow[][], limit = 8): DemoBreakdownRow[] {
  const map = new Map<string, { key: string; label: string; value: number }>();
  for (const list of lists) {
    for (const row of list) {
      const prev = map.get(row.key);
      if (prev) prev.value += row.value;
      else map.set(row.key, { key: row.key, label: row.label, value: row.value });
    }
  }
  return normalizeRows([...map.values()], limit);
}

function mergeHours(lists: number[][]): number[] {
  const out = emptyHours();
  for (const hours of lists) {
    for (let i = 0; i < 24; i++) out[i] += hours[i] || 0;
  }
  return out;
}

async function loadWorkspaceTokens(
  userId: string,
  workspaceId: string
): Promise<TokenRow[]> {
  if (!process.env.DATABASE_URL?.trim()) return [];
  try {
    const rows = await sql`
      SELECT platform, platform_user_id, access_token, refresh_token,
             handle, page_id, followers_count, user_id
      FROM social_accounts
      WHERE workspace_id = ${workspaceId}
        AND access_token IS NOT NULL
        AND TRIM(access_token) <> ''
      ORDER BY CASE WHEN user_id = ${userId} THEN 0 ELSE 1 END
    `;
    const byPlatform = new Map<string, TokenRow>();
    for (const row of (rows as TokenRow[]) ?? []) {
      if (!byPlatform.has(row.platform)) byPlatform.set(row.platform, row);
    }
    return [...byPlatform.values()];
  } catch (error) {
    console.warn('[demographics] token load failed', error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Facebook Page insights (fans demographics)
// ---------------------------------------------------------------------------
async function fetchFacebookPageDemographics(
  pageId: string,
  accessToken: string
): Promise<PlatformDemographicsSlice> {
  const base: PlatformDemographicsSlice = {
    platform: 'facebook',
    available: false,
    countries: [],
    cities: [],
    genders: [],
    ages: [],
    active_hours: emptyHours(),
    message: null,
  };

  try {
    const url = new URL(`https://graph.facebook.com/v19.0/${encodeURIComponent(pageId)}/insights`);
    url.searchParams.set(
      'metric',
      'page_fans_country,page_fans_city,page_fans_gender_age'
    );
    url.searchParams.set('period', 'lifetime');
    url.searchParams.set('access_token', accessToken);

    const res = await fetch(url.toString());
    const data = (await res.json()) as {
      data?: Array<{ name?: string; values?: Array<{ value?: Record<string, number> }> }>;
      error?: { message?: string };
    };
    if (!res.ok || data.error) {
      return {
        ...base,
        message:
          data.error?.message ||
          'Facebook Page demographics unavailable for this Page token.',
      };
    }

    let countries: DemoBreakdownRow[] = [];
    let cities: DemoBreakdownRow[] = [];
    let genders: DemoBreakdownRow[] = [];
    let ages: DemoBreakdownRow[] = [];

    for (const metric of data.data ?? []) {
      const map = metric.values?.[metric.values.length - 1]?.value;
      if (!map || typeof map !== 'object') continue;

      if (metric.name === 'page_fans_country') {
        countries = normalizeRows(
          Object.entries(map).map(([key, value]) => ({
            key,
            label: key,
            value: Number(value) || 0,
          }))
        );
      }
      if (metric.name === 'page_fans_city') {
        cities = normalizeRows(
          Object.entries(map).map(([key, value]) => ({
            key,
            label: key,
            value: Number(value) || 0,
          }))
        );
      }
      if (metric.name === 'page_fans_gender_age') {
        const genderTotals: Record<string, number> = { F: 0, M: 0, U: 0 };
        const ageTotals: Record<string, number> = {};
        for (const [key, value] of Object.entries(map)) {
          const n = Number(value) || 0;
          const [gender, age] = key.split('.');
          if (gender) genderTotals[gender] = (genderTotals[gender] || 0) + n;
          if (age) ageTotals[age] = (ageTotals[age] || 0) + n;
        }
        genders = normalizeRows(
          Object.entries(genderTotals).map(([key, value]) => ({
            key,
            label: key === 'F' ? 'Women' : key === 'M' ? 'Men' : 'Other',
            value,
          })),
          4
        );
        ages = normalizeRows(
          Object.entries(ageTotals).map(([key, value]) => ({
            key,
            label: key,
            value,
          })),
          10
        );
      }
    }

    const available = Boolean(
      countries.length || cities.length || genders.length || ages.length
    );
    return {
      ...base,
      available,
      countries,
      cities,
      genders,
      ages,
      message: available
        ? null
        : 'No Facebook Page fan demographics returned (needs a Page with enough fans).',
    };
  } catch (error) {
    console.warn('[demographics/facebook]', error);
    return {
      ...base,
      message: error instanceof Error ? error.message : 'Facebook demographics failed',
    };
  }
}

// ---------------------------------------------------------------------------
// YouTube Analytics (viewer demographics)
// ---------------------------------------------------------------------------
async function fetchYouTubeDemographics(
  channelId: string,
  accessToken: string
): Promise<PlatformDemographicsSlice> {
  const base: PlatformDemographicsSlice = {
    platform: 'youtube',
    available: false,
    countries: [],
    cities: [],
    genders: [],
    ages: [],
    active_hours: emptyHours(),
    message: null,
  };

  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 28);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  async function query(dimensions: string) {
    const url = new URL('https://youtubeanalytics.googleapis.com/v2/reports');
    url.searchParams.set('ids', `channel==${channelId}`);
    url.searchParams.set('startDate', fmt(start));
    url.searchParams.set('endDate', fmt(end));
    url.searchParams.set('metrics', 'viewerPercentage');
    url.searchParams.set('dimensions', dimensions);
    url.searchParams.set('sort', '-viewerPercentage');
    url.searchParams.set('maxResults', '25');

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = (await res.json()) as {
      rows?: Array<Array<string | number>>;
      columnHeaders?: Array<{ name?: string }>;
      error?: { message?: string; status?: string };
    };
    if (!res.ok || data.error) {
      throw new Error(
        data.error?.message ||
          `YouTube Analytics error (${res.status}) — reconnect YouTube with Analytics scope`
      );
    }
    return data.rows ?? [];
  }

  try {
    const [ageGenderRows, countryRows] = await Promise.all([
      query('ageGroup,gender').catch(() => [] as Array<Array<string | number>>),
      query('country').catch(() => [] as Array<Array<string | number>>),
    ]);

    const genderTotals: Record<string, number> = {};
    const ageTotals: Record<string, number> = {};
    for (const row of ageGenderRows) {
      const age = String(row[0] ?? '').replace(/^age/, '').replace(/_/g, '-');
      const gender = String(row[1] ?? '').toLowerCase();
      const pct = Number(row[2]) || 0;
      if (age) ageTotals[age] = (ageTotals[age] || 0) + pct;
      const gKey =
        gender === 'female' ? 'F' : gender === 'male' ? 'M' : 'U';
      genderTotals[gKey] = (genderTotals[gKey] || 0) + pct;
    }

    const countries = normalizeRows(
      countryRows.map((row) => ({
        key: String(row[0] ?? ''),
        label: String(row[0] ?? ''),
        value: Number(row[1]) || 0,
      }))
    );
    const genders = normalizeRows(
      Object.entries(genderTotals).map(([key, value]) => ({
        key,
        label: key === 'F' ? 'Women' : key === 'M' ? 'Men' : 'Other',
        value,
      })),
      4
    );
    const ages = normalizeRows(
      Object.entries(ageTotals).map(([key, value]) => ({
        key,
        label: key,
        value,
      })),
      10
    );

    const available = Boolean(countries.length || genders.length || ages.length);
    return {
      ...base,
      available,
      countries,
      genders,
      ages,
      message: available
        ? null
        : 'YouTube demographics need youtubeanalytics.readonly — reconnect YouTube under Settings → Socials.',
    };
  } catch (error) {
    console.warn('[demographics/youtube]', error);
    return {
      ...base,
      message:
        error instanceof Error
          ? error.message
          : 'YouTube Analytics demographics unavailable',
    };
  }
}

// ---------------------------------------------------------------------------
// Pinterest — best-effort organic analytics / ads audience insights
// ---------------------------------------------------------------------------
async function fetchPinterestDemographics(
  accessToken: string
): Promise<PlatformDemographicsSlice> {
  const base: PlatformDemographicsSlice = {
    platform: 'pinterest',
    available: false,
    countries: [],
    cities: [],
    genders: [],
    ages: [],
    active_hours: emptyHours(),
    message: null,
  };

  try {
    // Organic user analytics (account-level) — metrics vary by app access.
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const url = new URL('https://api.pinterest.com/v5/user_account/analytics');
    url.searchParams.set('start_date', fmt(start));
    url.searchParams.set('end_date', fmt(end));
    url.searchParams.set(
      'metric_types',
      'IMPRESSION,PIN_CLICK,OUTBOUND_CLICK,SAVE'
    );

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    const data = (await res.json()) as {
      all?: { summary_metrics?: Record<string, number> };
      message?: string;
      code?: number;
    };

    if (!res.ok) {
      // Ads audience insights require an ad_account_id — not available for pure organic.
      return {
        ...base,
        message:
          data.message ||
          'Pinterest organic demographics are limited. Full age/gender/location needs a Pinterest Ads account + ads scopes.',
      };
    }

    // Organic analytics endpoint returns performance totals, not geo/age splits.
    // Surface an honest empty state so the UI can still list Pinterest as connected.
    return {
      ...base,
      message:
        'Pinterest connected. Audience age/gender/location requires Pinterest Ads Audience Insights (ad account). Organic API only returns engagement totals.',
    };
  } catch (error) {
    console.warn('[demographics/pinterest]', error);
    return {
      ...base,
      message: error instanceof Error ? error.message : 'Pinterest demographics failed',
    };
  }
}

// ---------------------------------------------------------------------------
// TikTok — official Display API has no demographics
// ---------------------------------------------------------------------------
function tiktokDemographicsStub(): PlatformDemographicsSlice {
  return {
    platform: 'tiktok',
    available: false,
    countries: [],
    cities: [],
    genders: [],
    ages: [],
    active_hours: emptyHours(),
    message:
      'TikTok Display API does not expose audience age, gender, or location. Follower totals still appear in Followers per account.',
  };
}

/** Load tokens for the workspace and fetch demographics from every connected API. */
export async function fetchMultiPlatformDemographics(input: {
  userId: string;
  workspaceId: string;
}): Promise<MultiPlatformDemographics> {
  const tokens = await loadWorkspaceTokens(input.userId, input.workspaceId);
  const byPlatform = new Map<string, TokenRow>();
  for (const row of tokens) {
    if (!byPlatform.has(row.platform)) byPlatform.set(row.platform, row);
  }

  const slices: PlatformDemographicsSlice[] = [];

  const ig = byPlatform.get('instagram');
  if (ig?.access_token && ig.platform_user_id) {
    try {
      const demo = await fetchInstagramAudienceDemographics(
        ig.platform_user_id,
        ig.access_token
      );
      slices.push({
        platform: 'instagram',
        available: demo.available,
        message: demo.message,
        countries: demo.countries,
        cities: demo.cities,
        genders: demo.genders,
        ages: demo.ages,
        active_hours: demo.active_hours,
      });
    } catch (error) {
      slices.push({
        platform: 'instagram',
        available: false,
        countries: [],
        cities: [],
        genders: [],
        ages: [],
        active_hours: emptyHours(),
        message:
          error instanceof Error ? error.message : 'Instagram demographics failed',
      });
    }
  }

  const fb = byPlatform.get('facebook');
  if (fb?.access_token) {
    const pageId = fb.page_id || fb.platform_user_id;
    if (pageId) {
      slices.push(await fetchFacebookPageDemographics(pageId, fb.access_token));
    }
  }

  const yt = byPlatform.get('youtube');
  if (yt?.access_token && yt.platform_user_id) {
    slices.push(
      await fetchYouTubeDemographics(yt.platform_user_id, yt.access_token)
    );
  }

  const pin = byPlatform.get('pinterest');
  if (pin?.access_token) {
    slices.push(await fetchPinterestDemographics(pin.access_token));
  }

  if (byPlatform.has('tiktok')) {
    slices.push(tiktokDemographicsStub());
  }

  const withData = slices.filter((s) => s.available);
  const countries = mergeRows(withData.map((s) => s.countries));
  const cities = mergeRows(withData.map((s) => s.cities));
  const genders = mergeRows(withData.map((s) => s.genders), 4);
  const ages = mergeRows(withData.map((s) => s.ages), 10);
  const active_hours = mergeHours(withData.map((s) => s.active_hours));
  const available = withData.length > 0;

  return {
    source: available
      ? withData.some((s) => s.platform === 'instagram')
        ? 'engaged_audience'
        : 'followers'
      : 'none',
    countries,
    cities,
    genders,
    ages,
    active_hours,
    available,
    message: available
      ? null
      : slices.length === 0
        ? 'Connect Instagram, Facebook, YouTube, Pinterest, or TikTok under Settings → Socials to load audience demographics.'
        : 'No demographic breakdowns returned yet. Instagram (100+ followers) and YouTube Analytics usually unlock age, gender, and location first.',
    by_platform: slices,
    platforms_with_data: withData.map((s) => s.platform),
  };
}

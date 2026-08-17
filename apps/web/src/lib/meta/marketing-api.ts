/**
 * Meta Marketing API (Graph v20.0) — ad accounts, campaigns, status & budget.
 */

const MARKETING_GRAPH = 'https://graph.facebook.com/v20.0';

export type MetaAdAccount = {
  id: string;
  account_id: string;
  name: string;
  currency: string;
  account_status: number | null;
};

export type MetaCampaignInsights = {
  spend: number;
  impressions: number;
  clicks: number;
  cpc: number;
  conversions?: number;
  purchase_roas?: number;
};

export type MetaInsightDay = {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  cpc: number;
  conversions: number;
  purchase_roas: number;
};

export type MetaCampaignRemote = {
  id: string;
  name: string;
  status: string;
  effective_status?: string | null;
  objective: string | null;
  daily_budget: number | null;
  ad_account_id: string;
  insights: MetaCampaignInsights;
};

export type MetaAdSetRemote = {
  id: string;
  campaign_id: string;
  ad_account_id: string;
  name: string;
  status: string;
  daily_budget: number | null;
  targeting_summary: string | null;
  insights: MetaCampaignInsights;
};

export type MetaAdRemote = {
  id: string;
  adset_id: string;
  campaign_id: string;
  ad_account_id: string;
  name: string;
  status: string;
  creative_thumbnail: string | null;
  headline: string | null;
  insights: MetaCampaignInsights;
};

export type MetaCustomAudienceRemote = {
  id: string;
  name: string;
  subtype: string | null;
  description: string | null;
};

type GraphErrorBody = {
  error?: { message?: string; code?: number; error_subcode?: number };
};

async function marketingJson<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, init);
  const data = (await res.json()) as T & GraphErrorBody;
  if (!res.ok || data.error) {
    throw new Error(
      data.error?.message || `Meta Marketing API error (${res.status})`
    );
  }
  return data;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** Meta budgets are in the account's smallest currency unit (öre/cents). */
export function budgetMinorToMajor(minor: number | null | undefined): number {
  if (minor == null || !Number.isFinite(minor)) return 0;
  return Math.round(minor) / 100;
}

export function budgetMajorToMinor(major: number): number {
  return Math.max(0, Math.round(major * 100));
}

function parseInsights(
  raw: { data?: Array<Record<string, unknown>> } | null | undefined
): MetaCampaignInsights {
  const row = raw?.data?.[0];
  if (!row) {
    return {
      spend: 0,
      impressions: 0,
      clicks: 0,
      cpc: 0,
      conversions: 0,
      purchase_roas: 0,
    };
  }
  const actions = Array.isArray(row.actions)
    ? (row.actions as Array<{ action_type?: string; value?: string | number }>)
    : [];
  const conversions = actions
    .filter((a) =>
      ['purchase', 'lead', 'complete_registration', 'omni_purchase'].includes(
        String(a.action_type || '')
      )
    )
    .reduce((s, a) => s + toNumber(a.value), 0);
  const roasRows = Array.isArray(row.purchase_roas)
    ? (row.purchase_roas as Array<{ value?: string | number }>)
    : [];
  const purchase_roas =
    roasRows.length > 0
      ? toNumber(roasRows[0]?.value)
      : toNumber(row.website_purchase_roas);
  return {
    spend: toNumber(row.spend),
    impressions: toNumber(row.impressions),
    clicks: toNumber(row.clicks),
    cpc: toNumber(row.cpc),
    conversions,
    purchase_roas,
  };
}

const INSIGHT_FIELDS =
  'spend,impressions,clicks,cpc,actions,purchase_roas';

function normalizeActId(adAccountId: string): string {
  return adAccountId.startsWith('act_')
    ? adAccountId
    : `act_${adAccountId}`;
}

/** GET /me/adaccounts — connected ad accounts for the user token. */
export async function fetchMetaAdAccounts(
  accessToken: string
): Promise<MetaAdAccount[]> {
  const url = new URL(`${MARKETING_GRAPH}/me/adaccounts`);
  url.searchParams.set(
    'fields',
    'id,account_id,name,currency,account_status'
  );
  url.searchParams.set('limit', '50');
  url.searchParams.set('access_token', accessToken);

  const json = await marketingJson<{ data?: Array<Record<string, unknown>> }>(
    url.toString()
  );

  return (json.data || []).map((row) => {
    const id = String(row.id || '');
    const accountId = String(row.account_id || id.replace(/^act_/, ''));
    return {
      id: id.startsWith('act_') ? id : `act_${accountId}`,
      account_id: accountId,
      name: String(row.name || `Ad Account ${accountId}`),
      currency: String(row.currency || 'SEK'),
      account_status:
        row.account_status != null ? Number(row.account_status) : null,
    };
  });
}

/**
 * GET /{ad-account-id}/campaigns with insights nested fields.
 * daily_budget comes back in minor units (cents).
 */
export async function fetchMetaCampaignsForAccount(
  adAccountId: string,
  accessToken: string
): Promise<MetaCampaignRemote[]> {
  const actId = normalizeActId(adAccountId);
  const url = new URL(
    `${MARKETING_GRAPH}/${encodeURIComponent(actId)}/campaigns`
  );
  url.searchParams.set(
    'fields',
    [
      'id',
      'name',
      'status',
      'effective_status',
      'objective',
      'daily_budget',
      `insights.date_preset(last_30d){${INSIGHT_FIELDS}}`,
    ].join(',')
  );
  url.searchParams.set('limit', '100');
  url.searchParams.set('access_token', accessToken);

  const json = await marketingJson<{ data?: Array<Record<string, unknown>> }>(
    url.toString()
  );

  return (json.data || []).map((row) => {
    const dailyRaw = row.daily_budget != null ? toNumber(row.daily_budget) : null;
    return {
      id: String(row.id),
      name: String(row.name || 'Untitled campaign'),
      status: String(row.status || 'PAUSED').toUpperCase(),
      effective_status: row.effective_status
        ? String(row.effective_status)
        : null,
      objective: row.objective != null ? String(row.objective) : null,
      daily_budget: dailyRaw,
      ad_account_id: actId,
      insights: parseInsights(
        row.insights as { data?: Array<Record<string, unknown>> } | undefined
      ),
    };
  });
}

/** GET /{ad-account-id}/adsets */
export async function fetchMetaAdSetsForAccount(
  adAccountId: string,
  accessToken: string
): Promise<MetaAdSetRemote[]> {
  const actId = normalizeActId(adAccountId);
  const url = new URL(
    `${MARKETING_GRAPH}/${encodeURIComponent(actId)}/adsets`
  );
  url.searchParams.set(
    'fields',
    [
      'id',
      'name',
      'status',
      'campaign_id',
      'daily_budget',
      'targeting',
      `insights.date_preset(last_30d){${INSIGHT_FIELDS}}`,
    ].join(',')
  );
  url.searchParams.set('limit', '200');
  url.searchParams.set('access_token', accessToken);

  const json = await marketingJson<{ data?: Array<Record<string, unknown>> }>(
    url.toString()
  );

  return (json.data || []).map((row) => {
    const targeting = row.targeting as Record<string, unknown> | undefined;
    const geo = targeting?.geo_locations as
      | { countries?: string[] }
      | undefined;
    const countries = geo?.countries;
    const ageMin = targeting?.age_min != null ? Number(targeting.age_min) : null;
    const ageMax = targeting?.age_max != null ? Number(targeting.age_max) : null;
    const summaryParts: string[] = [];
    if (countries?.length) summaryParts.push(countries.join(', '));
    if (ageMin != null && ageMax != null) {
      summaryParts.push(`Ages ${ageMin}–${ageMax}`);
    }
    return {
      id: String(row.id),
      campaign_id: String(row.campaign_id || ''),
      ad_account_id: actId,
      name: String(row.name || 'Untitled ad set'),
      status: String(row.status || 'PAUSED').toUpperCase(),
      daily_budget:
        row.daily_budget != null ? toNumber(row.daily_budget) : null,
      targeting_summary: summaryParts.length ? summaryParts.join(' · ') : null,
      insights: parseInsights(
        row.insights as { data?: Array<Record<string, unknown>> } | undefined
      ),
    };
  });
}

/** GET /{ad-account-id}/ads */
export async function fetchMetaAdsForAccount(
  adAccountId: string,
  accessToken: string
): Promise<MetaAdRemote[]> {
  const actId = normalizeActId(adAccountId);
  const url = new URL(`${MARKETING_GRAPH}/${encodeURIComponent(actId)}/ads`);
  url.searchParams.set(
    'fields',
    [
      'id',
      'name',
      'status',
      'adset_id',
      'campaign_id',
      'creative{thumbnail_url,title,body}',
      `insights.date_preset(last_30d){${INSIGHT_FIELDS}}`,
    ].join(',')
  );
  url.searchParams.set('limit', '200');
  url.searchParams.set('access_token', accessToken);

  const json = await marketingJson<{ data?: Array<Record<string, unknown>> }>(
    url.toString()
  );

  return (json.data || []).map((row) => {
    const creative = row.creative as Record<string, unknown> | undefined;
    return {
      id: String(row.id),
      adset_id: String(row.adset_id || ''),
      campaign_id: String(row.campaign_id || ''),
      ad_account_id: actId,
      name: String(row.name || 'Untitled ad'),
      status: String(row.status || 'PAUSED').toUpperCase(),
      creative_thumbnail: creative?.thumbnail_url
        ? String(creative.thumbnail_url)
        : null,
      headline: creative?.title ? String(creative.title) : null,
      insights: parseInsights(
        row.insights as { data?: Array<Record<string, unknown>> } | undefined
      ),
    };
  });
}

/** GET /{ad-account-id}/customaudiences */
export async function fetchMetaCustomAudiences(
  adAccountId: string,
  accessToken: string
): Promise<MetaCustomAudienceRemote[]> {
  const actId = normalizeActId(adAccountId);
  const url = new URL(
    `${MARKETING_GRAPH}/${encodeURIComponent(actId)}/customaudiences`
  );
  url.searchParams.set('fields', 'id,name,subtype,description');
  url.searchParams.set('limit', '50');
  url.searchParams.set('access_token', accessToken);

  try {
    const json = await marketingJson<{ data?: Array<Record<string, unknown>> }>(
      url.toString()
    );
    return (json.data || []).map((row) => ({
      id: String(row.id),
      name: String(row.name || 'Audience'),
      subtype: row.subtype != null ? String(row.subtype) : null,
      description: row.description != null ? String(row.description) : null,
    }));
  } catch (error) {
    console.warn('[marketing-api] customaudiences failed', error);
    return [];
  }
}

/** Account-level daily insights for trend charts. */
export async function fetchMetaAccountInsightSeries(
  adAccountId: string,
  accessToken: string,
  since: string,
  until: string
): Promise<MetaInsightDay[]> {
  const actId = normalizeActId(adAccountId);
  const url = new URL(
    `${MARKETING_GRAPH}/${encodeURIComponent(actId)}/insights`
  );
  url.searchParams.set('fields', INSIGHT_FIELDS);
  url.searchParams.set('time_increment', '1');
  url.searchParams.set(
    'time_range',
    JSON.stringify({ since, until })
  );
  url.searchParams.set('level', 'account');
  url.searchParams.set('access_token', accessToken);

  try {
    const json = await marketingJson<{ data?: Array<Record<string, unknown>> }>(
      url.toString()
    );
    return (json.data || []).map((row) => {
      const parsed = parseInsights({ data: [row] });
      return {
        date: String(row.date_start || since).slice(0, 10),
        spend: parsed.spend,
        impressions: parsed.impressions,
        clicks: parsed.clicks,
        cpc: parsed.cpc,
        conversions: parsed.conversions || 0,
        purchase_roas: parsed.purchase_roas || 0,
      };
    });
  } catch (error) {
    console.warn('[marketing-api] insight series failed', error);
    return [];
  }
}

/** POST /{object-id} — set ACTIVE or PAUSED (campaign / adset / ad). */
export async function updateMetaObjectStatus(
  objectId: string,
  accessToken: string,
  status: 'ACTIVE' | 'PAUSED'
): Promise<void> {
  const url = new URL(`${MARKETING_GRAPH}/${encodeURIComponent(objectId)}`);
  url.searchParams.set('status', status);
  url.searchParams.set('access_token', accessToken);
  await marketingJson<{ success?: boolean }>(url.toString(), { method: 'POST' });
}

/** POST /{campaign-id} — set ACTIVE or PAUSED. */
export async function updateMetaCampaignStatus(
  campaignId: string,
  accessToken: string,
  status: 'ACTIVE' | 'PAUSED'
): Promise<void> {
  return updateMetaObjectStatus(campaignId, accessToken, status);
}

/** POST /{object-id} — update daily_budget (minor units). */
export async function updateMetaObjectDailyBudget(
  objectId: string,
  accessToken: string,
  dailyBudgetMinor: number
): Promise<void> {
  const url = new URL(`${MARKETING_GRAPH}/${encodeURIComponent(objectId)}`);
  url.searchParams.set(
    'daily_budget',
    String(Math.max(0, Math.round(dailyBudgetMinor)))
  );
  url.searchParams.set('access_token', accessToken);
  await marketingJson<{ success?: boolean }>(url.toString(), { method: 'POST' });
}

/** POST /{campaign-id} — update daily_budget (minor units). */
export async function updateMetaCampaignDailyBudget(
  campaignId: string,
  accessToken: string,
  dailyBudgetMinor: number
): Promise<void> {
  return updateMetaObjectDailyBudget(campaignId, accessToken, dailyBudgetMinor);
}

export type CreateMetaCampaignInput = {
  adAccountId: string;
  name: string;
  objective:
    | 'OUTCOME_SALES'
    | 'OUTCOME_LEADS'
    | 'OUTCOME_TRAFFIC'
    | 'OUTCOME_ENGAGEMENT';
  status?: 'ACTIVE' | 'PAUSED';
  dailyBudgetMinor?: number;
  specialAdCategories?: string[];
};

/** POST /act_…/campaigns — create a campaign shell. */
export async function createMetaCampaign(
  accessToken: string,
  input: CreateMetaCampaignInput
): Promise<{ id: string }> {
  const actId = normalizeActId(input.adAccountId);
  const url = new URL(
    `${MARKETING_GRAPH}/${encodeURIComponent(actId)}/campaigns`
  );
  url.searchParams.set('name', input.name);
  url.searchParams.set('objective', input.objective);
  url.searchParams.set('status', input.status || 'PAUSED');
  url.searchParams.set(
    'special_ad_categories',
    JSON.stringify(input.specialAdCategories || [])
  );
  if (input.dailyBudgetMinor != null) {
    url.searchParams.set(
      'daily_budget',
      String(Math.max(0, Math.round(input.dailyBudgetMinor)))
    );
  }
  url.searchParams.set('access_token', accessToken);
  return marketingJson<{ id: string }>(url.toString(), { method: 'POST' });
}

/** POST /act_…/adsets — create an ad set (simplified targeting). */
export async function createMetaAdSet(
  accessToken: string,
  input: {
    adAccountId: string;
    campaignId: string;
    name: string;
    dailyBudgetMinor: number;
    countries: string[];
    ageMin: number;
    ageMax: number;
    status?: 'ACTIVE' | 'PAUSED';
    /** Optional Meta Pixel id for website custom audiences / optimization. */
    pixelId?: string | null;
  }
): Promise<{ id: string }> {
  const actId = normalizeActId(input.adAccountId);
  const url = new URL(
    `${MARKETING_GRAPH}/${encodeURIComponent(actId)}/adsets`
  );
  const targeting = {
    geo_locations: { countries: input.countries.length ? input.countries : ['SE'] },
    age_min: input.ageMin,
    age_max: input.ageMax,
  };
  url.searchParams.set('name', input.name);
  url.searchParams.set('campaign_id', input.campaignId);
  url.searchParams.set('billing_event', 'IMPRESSIONS');
  url.searchParams.set('optimization_goal', 'REACH');
  url.searchParams.set(
    'daily_budget',
    String(Math.max(100, Math.round(input.dailyBudgetMinor)))
  );
  url.searchParams.set('bid_strategy', 'LOWEST_COST_WITHOUT_CAP');
  url.searchParams.set('targeting', JSON.stringify(targeting));
  url.searchParams.set('status', input.status || 'PAUSED');
  url.searchParams.set('access_token', accessToken);
  return marketingJson<{ id: string }>(url.toString(), { method: 'POST' });
}

export { MARKETING_GRAPH };

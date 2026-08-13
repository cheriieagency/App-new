/**
 * Meta Graph API helpers (Instagram Content Publishing + Facebook Page posts).
 * Uses Graph API v19.0.
 */

const GRAPH_BASE = 'https://graph.facebook.com/v19.0';

async function graphJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = (await res.json()) as T & { error?: { message?: string; code?: number } };
  if (!res.ok || (data as { error?: unknown }).error) {
    const msg =
      (data as { error?: { message?: string } }).error?.message ||
      `Graph API error (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export type PublishResult = {
  id: string;
  containerId?: string;
};

/**
 * Publish an image post to an Instagram Business account.
 * 1) Create media container → 2) Publish container.
 * `imageUrl` must be a public HTTPS URL (e.g. Supabase Storage).
 */
export async function publishInstagramPost(
  igUserId: string,
  accessToken: string,
  imageUrl: string,
  caption: string
): Promise<PublishResult> {
  const created = await graphJson<{ id: string }>(
    `${GRAPH_BASE}/${encodeURIComponent(igUserId)}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
        access_token: accessToken,
      }),
    }
  );
  if (!created.id) throw new Error('Instagram media container missing id');

  const published = await graphJson<{ id: string }>(
    `${GRAPH_BASE}/${encodeURIComponent(igUserId)}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: created.id,
        access_token: accessToken,
      }),
    }
  );

  return { id: published.id, containerId: created.id };
}

/**
 * Publish a photo post to a Facebook Page.
 */
export async function publishFacebookPagePost(
  pageId: string,
  pageAccessToken: string,
  imageUrl: string,
  caption: string
): Promise<PublishResult> {
  const url = new URL(`${GRAPH_BASE}/${encodeURIComponent(pageId)}/photos`);
  url.searchParams.set('url', imageUrl);
  url.searchParams.set('caption', caption);
  url.searchParams.set('access_token', pageAccessToken);

  const published = await graphJson<{ id: string; post_id?: string }>(url.toString(), {
    method: 'POST',
  });

  return { id: published.post_id || published.id };
}

export type InstagramInsights = {
  impressions?: number;
  reach?: number;
  profile_views?: number;
  follower_count?: number;
  raw: unknown;
};

/**
 * Fetch Instagram Business account insights (impressions, reach, profile_views).
 */
export async function fetchInstagramInsights(
  igUserId: string,
  accessToken: string
): Promise<InstagramInsights> {
  const url = new URL(`${GRAPH_BASE}/${encodeURIComponent(igUserId)}/insights`);
  url.searchParams.set('metric', 'impressions,reach,profile_views');
  url.searchParams.set('period', 'day');
  url.searchParams.set('access_token', accessToken);

  const data = await graphJson<{
    data?: Array<{ name: string; values?: Array<{ value: number }> }>;
  }>(url.toString());

  const out: InstagramInsights = { raw: data };
  for (const metric of data.data ?? []) {
    const value = metric.values?.[metric.values.length - 1]?.value;
    if (typeof value !== 'number') continue;
    if (metric.name === 'impressions') out.impressions = value;
    if (metric.name === 'reach') out.reach = value;
    if (metric.name === 'profile_views') out.profile_views = value;
  }
  return out;
}

export type DemoBreakdownRow = { key: string; label: string; value: number; pct: number };

export type InstagramAudienceDemographics = {
  source: 'engaged_audience' | 'followers' | 'none';
  countries: DemoBreakdownRow[];
  cities: DemoBreakdownRow[];
  genders: DemoBreakdownRow[];
  ages: DemoBreakdownRow[];
  /** Average relative activity per hour 0–23 (local). */
  active_hours: number[];
  available: boolean;
  message?: string | null;
};

type GraphBreakdownResult = {
  dimension_values?: string[];
  value?: number;
};

type GraphInsightMetric = {
  name?: string;
  period?: string;
  values?: Array<{ value?: unknown; end_time?: string }>;
  total_value?: {
    value?: number;
    breakdowns?: Array<{
      dimension_keys?: string[];
      results?: GraphBreakdownResult[];
    }>;
  };
};

function normalizeDemoRows(
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

async function fetchFollowerDemographicBreakdown(
  igUserId: string,
  accessToken: string,
  metric: 'follower_demographics' | 'engaged_audience_demographics',
  breakdown: 'age' | 'gender' | 'city' | 'country'
): Promise<Array<{ key: string; label: string; value: number }>> {
  const url = new URL(`${GRAPH_BASE}/${encodeURIComponent(igUserId)}/insights`);
  url.searchParams.set('metric', metric);
  url.searchParams.set('period', 'lifetime');
  url.searchParams.set('timeframe', 'this_month');
  url.searchParams.set('breakdown', breakdown);
  url.searchParams.set('metric_type', 'total_value');
  url.searchParams.set('access_token', accessToken);

  try {
    const data = await graphJson<{ data?: GraphInsightMetric[] }>(url.toString());
    const metricRow = data.data?.[0];
    const results = metricRow?.total_value?.breakdowns?.[0]?.results ?? [];
    return results
      .map((r) => {
        const key = String(r.dimension_values?.[0] ?? '').trim();
        const value = Number(r.value) || 0;
        return { key, label: key, value };
      })
      .filter((r) => r.key && r.value > 0);
  } catch (error) {
    console.warn(`[graph] ${metric}/${breakdown} failed`, error);
    return [];
  }
}

/** Legacy lifetime audience_* metrics (still available on some tokens). */
async function fetchLegacyAudienceMetrics(
  igUserId: string,
  accessToken: string
): Promise<{
  countries: Array<{ key: string; label: string; value: number }>;
  cities: Array<{ key: string; label: string; value: number }>;
  genders: Array<{ key: string; label: string; value: number }>;
  ages: Array<{ key: string; label: string; value: number }>;
}> {
  const url = new URL(`${GRAPH_BASE}/${encodeURIComponent(igUserId)}/insights`);
  url.searchParams.set(
    'metric',
    'audience_country,audience_city,audience_gender_age'
  );
  url.searchParams.set('period', 'lifetime');
  url.searchParams.set('access_token', accessToken);

  type Row = { key: string; label: string; value: number };
  const empty: {
    countries: Row[];
    cities: Row[];
    genders: Row[];
    ages: Row[];
  } = { countries: [], cities: [], genders: [], ages: [] };
  try {
    const data = await graphJson<{ data?: GraphInsightMetric[] }>(url.toString());
    const out: typeof empty = {
      countries: [],
      cities: [],
      genders: [],
      ages: [],
    };

    for (const metric of data.data ?? []) {
      const raw = metric.values?.[metric.values.length - 1]?.value;
      if (!raw || typeof raw !== 'object') continue;
      const map = raw as Record<string, number>;

      if (metric.name === 'audience_country') {
        out.countries = Object.entries(map).map(([key, value]) => ({
          key,
          label: key,
          value: Number(value) || 0,
        }));
      }
      if (metric.name === 'audience_city') {
        out.cities = Object.entries(map).map(([key, value]) => ({
          key,
          label: key,
          value: Number(value) || 0,
        }));
      }
      if (metric.name === 'audience_gender_age') {
        const genderTotals: Record<string, number> = { F: 0, M: 0, U: 0 };
        const ageTotals: Record<string, number> = {};
        for (const [key, value] of Object.entries(map)) {
          const n = Number(value) || 0;
          const [gender, age] = key.split('.');
          if (gender) genderTotals[gender] = (genderTotals[gender] || 0) + n;
          if (age) ageTotals[age] = (ageTotals[age] || 0) + n;
        }
        out.genders = Object.entries(genderTotals).map(([key, value]) => ({
          key,
          label: key === 'F' ? 'Women' : key === 'M' ? 'Men' : 'Other',
          value,
        }));
        out.ages = Object.entries(ageTotals).map(([key, value]) => ({
          key,
          label: key,
          value,
        }));
      }
    }
    return out;
  } catch (error) {
    console.warn('[graph] legacy audience_* failed', error);
    return empty;
  }
}

async function fetchOnlineFollowersHours(
  igUserId: string,
  accessToken: string
): Promise<number[]> {
  const hours = Array.from({ length: 24 }, () => 0);
  const url = new URL(`${GRAPH_BASE}/${encodeURIComponent(igUserId)}/insights`);
  url.searchParams.set('metric', 'online_followers');
  url.searchParams.set('period', 'lifetime');
  url.searchParams.set('access_token', accessToken);

  try {
    const data = await graphJson<{ data?: GraphInsightMetric[] }>(url.toString());
    const raw = data.data?.[0]?.values?.[data.data[0].values.length - 1]?.value;
    if (!raw || typeof raw !== 'object') return hours;

    // Shape A: { "0": 12, "1": 18, ... } hour → count
    // Shape B: { "0": { "0": 1, "1": 2 }, ... } day → hour → count
    const obj = raw as Record<string, unknown>;
    const first = Object.values(obj)[0];
    if (typeof first === 'number') {
      for (let h = 0; h < 24; h++) {
        hours[h] = Number(obj[String(h)]) || 0;
      }
      return hours;
    }
    if (first && typeof first === 'object') {
      for (const day of Object.values(obj)) {
        if (!day || typeof day !== 'object') continue;
        for (let h = 0; h < 24; h++) {
          hours[h] += Number((day as Record<string, number>)[String(h)]) || 0;
        }
      }
      return hours;
    }
  } catch (error) {
    console.warn('[graph] online_followers failed', error);
  }
  return hours;
}

const COUNTRY_LABELS: Record<string, string> = {
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  IS: 'Iceland',
  GB: 'United Kingdom',
  US: 'United States',
  DE: 'Germany',
  FR: 'France',
  ES: 'Spain',
  IT: 'Italy',
  NL: 'Netherlands',
  PL: 'Poland',
  BR: 'Brazil',
  AU: 'Australia',
  CA: 'Canada',
};

function labelCountry(code: string): string {
  return COUNTRY_LABELS[code.toUpperCase()] || code;
}

function labelGender(code: string): string {
  const c = code.toUpperCase();
  if (c === 'F' || c === 'FEMALE') return 'Women';
  if (c === 'M' || c === 'MALE') return 'Men';
  return 'Other';
}

/**
 * Audience demographics for Analytics → Audience.
 * Prefers engaged viewers; falls back to follower demographics / legacy metrics.
 * Requires Instagram Business/Creator + typically 100+ followers.
 */
export async function fetchInstagramAudienceDemographics(
  igUserId: string,
  accessToken: string
): Promise<InstagramAudienceDemographics> {
  const emptyHours = Array.from({ length: 24 }, () => 0);

  const [engagedCountries, engagedCities, engagedGenders, engagedAges] =
    await Promise.all([
      fetchFollowerDemographicBreakdown(
        igUserId,
        accessToken,
        'engaged_audience_demographics',
        'country'
      ),
      fetchFollowerDemographicBreakdown(
        igUserId,
        accessToken,
        'engaged_audience_demographics',
        'city'
      ),
      fetchFollowerDemographicBreakdown(
        igUserId,
        accessToken,
        'engaged_audience_demographics',
        'gender'
      ),
      fetchFollowerDemographicBreakdown(
        igUserId,
        accessToken,
        'engaged_audience_demographics',
        'age'
      ),
    ]);

  let source: InstagramAudienceDemographics['source'] = 'none';
  let countries = engagedCountries;
  let cities = engagedCities;
  let genders = engagedGenders;
  let ages = engagedAges;

  if (countries.length || cities.length || genders.length || ages.length) {
    source = 'engaged_audience';
  } else {
    const [fCountries, fCities, fGenders, fAges] = await Promise.all([
      fetchFollowerDemographicBreakdown(
        igUserId,
        accessToken,
        'follower_demographics',
        'country'
      ),
      fetchFollowerDemographicBreakdown(
        igUserId,
        accessToken,
        'follower_demographics',
        'city'
      ),
      fetchFollowerDemographicBreakdown(
        igUserId,
        accessToken,
        'follower_demographics',
        'gender'
      ),
      fetchFollowerDemographicBreakdown(
        igUserId,
        accessToken,
        'follower_demographics',
        'age'
      ),
    ]);
    countries = fCountries;
    cities = fCities;
    genders = fGenders;
    ages = fAges;
    if (countries.length || cities.length || genders.length || ages.length) {
      source = 'followers';
    }
  }

  if (source === 'none') {
    const legacy = await fetchLegacyAudienceMetrics(igUserId, accessToken);
    countries = legacy.countries;
    cities = legacy.cities;
    genders = legacy.genders;
    ages = legacy.ages;
    if (countries.length || cities.length || genders.length || ages.length) {
      source = 'followers';
    }
  }

  const active_hours = await fetchOnlineFollowersHours(igUserId, accessToken);
  const hasHours = active_hours.some((n) => n > 0);
  const available =
    source !== 'none' || hasHours;

  return {
    source,
    countries: normalizeDemoRows(
      countries.map((c) => ({ ...c, label: labelCountry(c.key) }))
    ),
    cities: normalizeDemoRows(cities),
    genders: normalizeDemoRows(
      genders.map((g) => ({ ...g, label: labelGender(g.key) })),
      4
    ),
    ages: normalizeDemoRows(
      ages.map((a) => ({ ...a, label: a.key })),
      10
    ),
    active_hours: hasHours ? active_hours : emptyHours,
    available,
    message: available
      ? null
      : 'Demographics require an Instagram Business/Creator account with 100+ followers and insight permissions.',
  };
}

export type InstagramProfile = {
  id: string;
  username?: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
  media_count?: number;
  biography?: string;
};

/** IG Business profile fields used after OAuth sync. */
export async function fetchInstagramProfile(
  igUserId: string,
  accessToken: string
): Promise<InstagramProfile> {
  const url = new URL(`${GRAPH_BASE}/${encodeURIComponent(igUserId)}`);
  url.searchParams.set(
    'fields',
    'id,username,name,profile_picture_url,followers_count,media_count,biography'
  );
  url.searchParams.set('access_token', accessToken);
  return graphJson<InstagramProfile>(url.toString());
}

export type InstagramMediaItem = {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
  /** Nested insights when requested (impressions / reach). */
  insights?: {
    data?: Array<{
      name?: string;
      values?: Array<{ value?: number }>;
    }>;
  };
  /** Flattened from insights when available. */
  impressions?: number;
  reach?: number;
};

function flattenIgInsights(item: InstagramMediaItem): InstagramMediaItem {
  let impressions = 0;
  let reach = 0;
  for (const metric of item.insights?.data ?? []) {
    const value = Number(metric.values?.[0]?.value) || 0;
    if (metric.name === 'impressions') impressions = value;
    if (metric.name === 'reach') reach = value;
  }
  return { ...item, impressions, reach };
}

/** Recent Instagram media (posts / reels) for Planner + Analytics. */
export async function fetchInstagramMedia(
  igUserId: string,
  accessToken: string,
  limit = 25
): Promise<InstagramMediaItem[]> {
  const withInsights =
    'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,insights.metric(impressions,reach)';
  const basic =
    'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count';

  async function load(fields: string) {
    const url = new URL(`${GRAPH_BASE}/${encodeURIComponent(igUserId)}/media`);
    url.searchParams.set('fields', fields);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('access_token', accessToken);
    const data = await graphJson<{ data?: InstagramMediaItem[] }>(url.toString());
    return (data.data ?? []).map(flattenIgInsights);
  }

  try {
    return await load(withInsights);
  } catch (error) {
    console.warn('[graph] IG media+insights failed, retrying without insights', error);
    return load(basic);
  }
}

export type FacebookPagePostItem = {
  id: string;
  message?: string;
  created_time?: string;
  full_picture?: string;
  permalink_url?: string;
  status_type?: string;
  shares?: { count?: number };
  likes?: { summary?: { total_count?: number } };
  comments?: { summary?: { total_count?: number } };
  insights?: {
    data?: Array<{
      name?: string;
      values?: Array<{ value?: number }>;
    }>;
  };
  /** Flattened unique impressions when insights are present. */
  impressions?: number;
  attachments?: {
    data?: Array<{
      media_type?: string;
      type?: string;
      media?: { image?: { src?: string }; source?: string };
    }>;
  };
};

function flattenFbInsights(item: FacebookPagePostItem): FacebookPagePostItem {
  let impressions = 0;
  for (const metric of item.insights?.data ?? []) {
    if (
      metric.name === 'post_impressions_unique' ||
      metric.name === 'post_impressions'
    ) {
      impressions = Number(metric.values?.[0]?.value) || impressions;
    }
  }
  return { ...item, impressions };
}

const FB_POST_FIELDS_WITH_INSIGHTS = [
  'id',
  'message',
  'created_time',
  'full_picture',
  'permalink_url',
  'status_type',
  'shares',
  'likes.summary(true)',
  'comments.summary(true)',
  'attachments{media_type,type,media}',
  'insights.metric(post_impressions_unique)',
].join(',');

const FB_POST_FIELDS_BASIC = [
  'id',
  'message',
  'created_time',
  'full_picture',
  'permalink_url',
  'status_type',
  'shares',
  'likes.summary(true)',
  'comments.summary(true)',
  'attachments{media_type,type,media}',
].join(',');

async function fetchFacebookEdge(
  pageId: string,
  edge: 'published_posts' | 'feed',
  pageAccessToken: string,
  fields: string,
  limit: number
): Promise<FacebookPagePostItem[]> {
  const url = new URL(
    `${GRAPH_BASE}/${encodeURIComponent(pageId)}/${edge}`
  );
  url.searchParams.set('fields', fields);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('access_token', pageAccessToken);
  const data = await graphJson<{ data?: FacebookPagePostItem[] }>(url.toString());
  return (data.data ?? []).map(flattenFbInsights);
}

/** Recent Facebook Page posts for Analytics → Posts (needs Page token + pages_read_engagement). */
export async function fetchFacebookPagePosts(
  pageId: string,
  pageAccessToken: string,
  limit = 25
): Promise<FacebookPagePostItem[]> {
  // Prefer published_posts + insights; fall back to /feed or fields without insights.
  try {
    const posts = await fetchFacebookEdge(
      pageId,
      'published_posts',
      pageAccessToken,
      FB_POST_FIELDS_WITH_INSIGHTS,
      limit
    );
    if (posts.length > 0) return posts;
  } catch (error) {
    console.warn('[graph] published_posts+insights failed', error);
  }

  try {
    const posts = await fetchFacebookEdge(
      pageId,
      'published_posts',
      pageAccessToken,
      FB_POST_FIELDS_BASIC,
      limit
    );
    if (posts.length > 0) return posts;
  } catch (error) {
    console.warn('[graph] published_posts basic failed', error);
  }

  try {
    return await fetchFacebookEdge(
      pageId,
      'feed',
      pageAccessToken,
      FB_POST_FIELDS_BASIC,
      limit
    );
  } catch (error) {
    console.warn('[graph] /feed failed', error);
    return [];
  }
}

export type InstagramComment = {
  id: string;
  text?: string;
  username?: string;
  timestamp?: string;
  like_count?: number;
};

/** Comments on a media item — used to seed Social Inbox after connect. */
export async function fetchInstagramMediaComments(
  mediaId: string,
  accessToken: string,
  limit = 20
): Promise<InstagramComment[]> {
  const url = new URL(`${GRAPH_BASE}/${encodeURIComponent(mediaId)}/comments`);
  url.searchParams.set('fields', 'id,text,username,timestamp,like_count');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('access_token', accessToken);
  try {
    const data = await graphJson<{ data?: InstagramComment[] }>(url.toString());
    return data.data ?? [];
  } catch (error) {
    console.warn('[graph] fetchInstagramMediaComments failed', mediaId, error);
    return [];
  }
}

/** Reply to an Instagram media comment (Inbox reply). */
export async function replyToInstagramComment(
  commentId: string,
  message: string,
  accessToken: string
): Promise<{ id: string }> {
  const url = new URL(`${GRAPH_BASE}/${encodeURIComponent(commentId)}/replies`);
  const body = new URLSearchParams();
  body.set('message', message);
  body.set('access_token', accessToken);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok || !json.id) {
    throw new Error(json.error?.message || 'Failed to reply to Instagram comment');
  }
  return { id: json.id };
}

// ---------------------------------------------------------------------------
// Instagram Messaging (DMs via Page conversations API)
// ---------------------------------------------------------------------------

export type InstagramDmMessage = {
  id: string;
  message?: string;
  created_time?: string;
  from?: { id?: string; username?: string; name?: string; email?: string };
};

export type InstagramDmConversation = {
  id: string;
  updated_time?: string;
  participants?: {
    data?: Array<{ id?: string; username?: string; name?: string }>;
  };
  messages?: { data?: InstagramDmMessage[] };
  /** Instagram-scoped ID of the other party (for replies). */
  recipient_id?: string;
  recipient_name?: string;
  recipient_username?: string;
};

/**
 * List Instagram DM conversations for a Page linked to an IG Professional account.
 * Requires Page access token + `instagram_manage_messages`.
 */
export async function fetchInstagramDmConversations(
  pageId: string,
  pageAccessToken: string,
  limit = 20,
  /** Instagram Business Account id — exclude from "other participant". */
  igUserId?: string | null
): Promise<InstagramDmConversation[]> {
  const url = new URL(
    `${GRAPH_BASE}/${encodeURIComponent(pageId)}/conversations`
  );
  url.searchParams.set('platform', 'instagram');
  url.searchParams.set(
    'fields',
    [
      'id',
      'updated_time',
      'participants{id,username,name}',
      'messages.limit(12){id,message,from,created_time}',
    ].join(',')
  );
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('access_token', pageAccessToken);

  try {
    const data = await graphJson<{ data?: InstagramDmConversation[] }>(
      url.toString()
    );
    const selfIds = new Set(
      [pageId, igUserId].filter(Boolean).map((id) => String(id))
    );
    return (data.data ?? []).map((conv) => {
      const participants = conv.participants?.data ?? [];
      // Prefer the participant that isn't the Page / IG business account.
      const other =
        participants.find((p) => p.id && !selfIds.has(p.id)) ||
        participants[0];
      return {
        ...conv,
        recipient_id: other?.id,
        recipient_name: other?.name || other?.username || 'Instagram user',
        recipient_username: other?.username,
      };
    });
  } catch (error) {
    console.warn('[graph] Instagram DM conversations failed', error);
    throw error;
  }
}

/** Inspect which scopes a user/page token actually carries (no token echoed). */
export async function debugMetaTokenScopes(
  inputToken: string
): Promise<{ isValid: boolean; scopes: string[] }> {
  const appId = process.env.META_APP_ID?.trim();
  const appSecret = process.env.META_APP_SECRET?.trim();
  if (!appId || !appSecret || !inputToken) {
    return { isValid: false, scopes: [] };
  }
  try {
    const url = new URL(`${GRAPH_BASE}/debug_token`);
    url.searchParams.set('input_token', inputToken);
    url.searchParams.set('access_token', `${appId}|${appSecret}`);
    const data = await graphJson<{
      data?: { is_valid?: boolean; scopes?: string[] };
    }>(url.toString());
    return {
      isValid: Boolean(data.data?.is_valid),
      scopes: Array.isArray(data.data?.scopes) ? data.data!.scopes! : [],
    };
  } catch (error) {
    console.warn('[graph] debug_token failed', error);
    return { isValid: false, scopes: [] };
  }
}

/**
 * Send an Instagram DM via the Page messages endpoint.
 * Recipient must have messaged the business within the 24h window (or Human Agent).
 */
export async function sendInstagramDm(input: {
  pageId: string;
  pageAccessToken: string;
  recipientId: string;
  message: string;
}): Promise<{ id: string }> {
  const url = new URL(
    `${GRAPH_BASE}/${encodeURIComponent(input.pageId)}/messages`
  );
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: input.recipientId },
      message: { text: input.message },
      messaging_product: 'instagram',
      access_token: input.pageAccessToken,
    }),
  });
  const json = (await res.json()) as {
    message_id?: string;
    id?: string;
    error?: { message?: string };
  };
  if (!res.ok || !(json.message_id || json.id)) {
    throw new Error(
      json.error?.message ||
        'Failed to send Instagram DM — reconnect with messaging permissions'
    );
  }
  return { id: String(json.message_id || json.id) };
}

/**
 * Private Reply to an Instagram comment → opens a DM thread (Comment-to-DM).
 * CRITICAL: recipient MUST be `{ comment_id }` (not user id) to bypass the 24h window.
 * Uses Graph API v21.0 as required for Instagram messaging private replies.
 */
export async function sendInstagramPrivateReply(input: {
  /** Instagram Business Account id (preferred) or linked Page id. */
  igOrPageId: string;
  accessToken: string;
  commentId: string;
  message: string;
}): Promise<{ id: string }> {
  const messagingUrl = `https://graph.facebook.com/v21.0/${encodeURIComponent(
    input.igOrPageId
  )}/messages`;

  const dispatchPayload = {
    recipient: {
      // MUST use comment_id — user id hits the 24h messaging window block.
      comment_id: input.commentId,
    },
    message: {
      text: input.message,
    },
  };

  const res = await fetch(messagingUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dispatchPayload),
  });

  const json = (await res.json()) as {
    message_id?: string;
    id?: string;
    error?: { message?: string; code?: number; error_subcode?: number };
  };

  if (!res.ok || !(json.message_id || json.id)) {
    throw new Error(
      json.error?.message ||
        'Failed to send Comment-to-DM private reply'
    );
  }
  return { id: String(json.message_id || json.id) };
}

/**
 * Send a DM to an Instagram-scoped user id (fallback when private reply fails).
 */
export async function sendInstagramDmToUser(input: {
  igUserId: string;
  accessToken: string;
  recipientId: string;
  message: string;
}): Promise<{ id: string }> {
  const url = new URL(
    `${GRAPH_BASE}/${encodeURIComponent(input.igUserId)}/messages`
  );
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${input.accessToken}`,
    },
    body: JSON.stringify({
      recipient: { id: input.recipientId },
      message: { text: input.message },
      messaging_product: 'instagram',
    }),
  });
  const json = (await res.json()) as {
    message_id?: string;
    id?: string;
    error?: { message?: string };
  };
  if (!res.ok || !(json.message_id || json.id)) {
    throw new Error(
      json.error?.message || 'Failed to send Instagram DM to user'
    );
  }
  return { id: String(json.message_id || json.id) };
}

export { GRAPH_BASE };

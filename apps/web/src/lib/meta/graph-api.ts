/**
 * Meta Graph API helpers (Instagram Content Publishing + Facebook Page posts).
 * Uses Graph API v19.0.
 */

import { toVerifiedPublishMediaUrl } from '@/lib/media/proxy-url';
import {
  defaultAnalyticsRange,
  rangeToUnix,
} from '@/lib/analytics/period';

const GRAPH_BASE = 'https://graph.facebook.com/v19.0';
/** Status polling uses v20 — required for reliable status_code on containers. */
const GRAPH_STATUS_BASE = 'https://graph.facebook.com/v20.0';

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

export type InstagramMediaKind = 'image' | 'video';

type GraphErrorBody = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

type GraphContainerBody = GraphErrorBody & {
  id?: string;
  creation_id?: string;
  publish_id?: string;
  status_code?: string;
  status?: string;
};

function headersToRecord(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function graphErrorMessage(data: GraphErrorBody, status: number): string {
  const err = data.error;
  if (!err?.message) return `Graph API error (${status})`;
  const extra = [
    err.code != null ? `code ${err.code}` : null,
    err.error_subcode != null ? `subcode ${err.error_subcode}` : null,
    err.fbtrace_id ? `trace ${err.fbtrace_id}` : null,
  ]
    .filter(Boolean)
    .join(', ');
  return extra ? `${err.message} (${extra})` : err.message;
}

function extractContainerId(data: GraphContainerBody): string | null {
  const raw = data.id || data.creation_id || data.publish_id;
  const id = typeof raw === 'string' ? raw.trim() : '';
  return id || null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function looksLikeVideoUrl(url: string, kind?: InstagramMediaKind): boolean {
  if (kind === 'video') return true;
  if (kind === 'image') return false;
  return /\.(mp4|mov|m4v|webm)(\?|#|$)/i.test(url);
}

/**
 * POST/GET Graph with full diagnostics — never treat a missing container id as success.
 */
async function graphPublishRequest(
  url: string,
  init: RequestInit | undefined,
  step: string
): Promise<{ data: GraphContainerBody; headers: Record<string, string>; status: number }> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (error) {
    console.error(`[meta/${step}] network failure`, {
      url: url.split('?')[0],
      error: error instanceof Error ? error.message : error,
    });
    throw new Error(
      `Failed to ${step}: network error (${error instanceof Error ? error.message : 'fetch failed'})`
    );
  }

  const responseHeaders = headersToRecord(res.headers);
  const rawText = await res.text();
  let data: GraphContainerBody = {};
  try {
    data = rawText ? (JSON.parse(rawText) as GraphContainerBody) : {};
  } catch {
    data = { error: { message: rawText.slice(0, 400) || `Non-JSON Graph response (${res.status})` } };
  }

  if (!res.ok || data.error) {
    console.error(`[meta/${step}] Graph API failed`, {
      url: url.split('?')[0],
      status: res.status,
      payload: init?.body ? String(init.body).slice(0, 800) : null,
      responseHeaders,
      responseBody: data,
    });
    throw new Error(`Instagram: ${graphErrorMessage(data, res.status)}`);
  }

  return { data, headers: responseHeaders, status: res.status };
}

/**
 * Poll Instagram media container until status_code === FINISHED.
 * Prevents Graph 9007 / subcode 2207027 ("Media ID is not available").
 *
 * Flow: mandatory 3s sleep after container creation → poll every 4s → max 12 attempts.
 */
async function waitForInstagramContainerReady(
  containerId: string,
  accessToken: string
): Promise<void> {
  const maxAttempts = 12;
  const pollDelayMs = 4000;
  const initialSleepMs = 3000;

  // Safety buffer — Meta often returns IN_PROGRESS immediately after container create.
  await sleep(initialSleepMs);

  let lastStatus = '';
  let lastStatusCode = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const url = new URL(
      `${GRAPH_STATUS_BASE}/${encodeURIComponent(containerId)}`
    );
    url.searchParams.set('fields', 'status_code,status');
    url.searchParams.set('access_token', accessToken);

    const { data } = await graphPublishRequest(
      url.toString(),
      { method: 'GET' },
      'container status'
    );

    lastStatusCode = String(data.status_code || '').trim();
    lastStatus = String(data.status || '').trim();
    const statusCode = lastStatusCode.toUpperCase();

    console.info('[meta/container status]', {
      containerId,
      attempt,
      maxAttempts,
      status_code: lastStatusCode,
      status: lastStatus,
    });

    if (statusCode === 'FINISHED') {
      return;
    }

    if (statusCode === 'ERROR' || statusCode === 'EXPIRED') {
      throw new Error(
        `Instagram media not ready — container status ${statusCode || 'ERROR'}` +
          (lastStatus ? ` (${lastStatus})` : '') +
          `. Container ${containerId} cannot be published.`
      );
    }

    if (attempt < maxAttempts) {
      await sleep(pollDelayMs);
    }
  }

  throw new Error(
    `Instagram media not ready after ${maxAttempts} status checks (~${Math.round(
      (initialSleepMs + maxAttempts * pollDelayMs) / 1000
    )}s). ` +
      `Last status_code: "${lastStatusCode || 'unknown'}"` +
      (lastStatus ? `, status: "${lastStatus}"` : '') +
      `. Meta error 9007 usually means the container was published before FINISHED — retry in a moment.`
  );
}

export type InstagramPublishOptions = {
  mediaKind?: InstagramMediaKind;
  /** Up to 3 Instagram usernames (no @) invited as collaborators. */
  collaborators?: string[];
  /** Facebook Places / Instagram location id for tagging. */
  locationId?: string | null;
  /** Posted via /{media-id}/comments right after media_publish. */
  firstComment?: string | null;
};

/**
 * Publish an image or video/reel to an Instagram Business account.
 * 1) Create media container → 2) Poll until FINISHED → 3) media_publish.
 * Optionally attaches collaborators + location_id, then posts first_comment.
 * `mediaUrl` must be a public HTTPS URL (e.g. Supabase Storage).
 */
export async function publishInstagramPost(
  igUserId: string,
  accessToken: string,
  imageUrl: string,
  caption: string,
  mediaKindOrOptions?: InstagramMediaKind | InstagramPublishOptions
): Promise<PublishResult & { firstCommentId?: string; firstCommentError?: string }> {
  const options: InstagramPublishOptions =
    typeof mediaKindOrOptions === 'string' || mediaKindOrOptions == null
      ? { mediaKind: mediaKindOrOptions }
      : mediaKindOrOptions;

  const mediaUrl = toVerifiedPublishMediaUrl(imageUrl.trim());
  if (!mediaUrl) {
    throw new Error('Instagram: media URL is empty');
  }

  const isVideo = looksLikeVideoUrl(mediaUrl, options.mediaKind);
  const collaborators = (options.collaborators || [])
    .map((u) => String(u).trim().replace(/^@+/, '').toLowerCase())
    .filter(Boolean)
    .slice(0, 3);
  const locationId = String(options.locationId || '').trim() || null;

  const payload: Record<string, unknown> = {
    caption,
    access_token: accessToken,
  };
  if (isVideo) {
    payload.media_type = 'REELS';
    payload.video_url = mediaUrl;
  } else {
    payload.image_url = mediaUrl;
  }
  if (collaborators.length) {
    payload.collaborators = collaborators;
  }
  if (locationId) {
    payload.location_id = locationId;
  }

  let created: GraphContainerBody;
  try {
    const result = await graphPublishRequest(
      `${GRAPH_BASE}/${encodeURIComponent(igUserId)}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      'create media container'
    );
    created = result.data;
  } catch (error) {
    console.error('[meta/create media container] threw', {
      igUserId,
      isVideo,
      mediaUrl: mediaUrl.slice(0, 180),
      error: error instanceof Error ? error.message : error,
    });
    throw error instanceof Error
      ? error
      : new Error('Instagram: unknown publish error');
  }

  const containerId = extractContainerId(created);
  if (!containerId) {
    console.error('[meta/create media container] missing id', {
      igUserId,
      isVideo,
      mediaUrl: mediaUrl.slice(0, 180),
      payloadKeys: Object.keys(payload).filter((k) => k !== 'access_token'),
      responseBody: created,
    });
    throw new Error(
      'Instagram did not return a media container id. Reconnect Instagram under Settings → Socials.'
    );
  }

  // Always poll — images can also return 9007 if published before FINISHED.
  await waitForInstagramContainerReady(containerId, accessToken);

  const published = await graphPublishRequest(
    `${GRAPH_BASE}/${encodeURIComponent(igUserId)}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: accessToken,
      }),
    },
    'media_publish'
  );

  const publishedId = extractContainerId(published.data);
  if (!publishedId) {
    console.error('[meta/media_publish] missing published id', {
      containerId,
      responseBody: published.data,
      responseHeaders: published.headers,
    });
    throw new Error(
      'Failed to publish Instagram media: media id not available after media_publish'
    );
  }

  const firstComment = String(options.firstComment || '').trim();
  if (!firstComment) {
    return { id: publishedId, containerId };
  }

  try {
    const comment = await postInstagramMediaComment(
      publishedId,
      firstComment,
      accessToken
    );
    return { id: publishedId, containerId, firstCommentId: comment.id };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to post first comment';
    console.warn('[meta/first_comment] non-fatal', {
      publishedId,
      message,
    });
    return {
      id: publishedId,
      containerId,
      firstCommentError: message,
    };
  }
}

/** Post a top-level comment on published Instagram media (first-comment workflow). */
export async function postInstagramMediaComment(
  mediaId: string,
  message: string,
  accessToken: string
): Promise<{ id: string }> {
  const text = message.trim();
  if (!text) throw new Error('Instagram: first comment is empty');

  const result = await graphPublishRequest(
    `${GRAPH_BASE}/${encodeURIComponent(mediaId)}/comments`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        access_token: accessToken,
      }),
    },
    'media comments'
  );
  const id = extractContainerId(result.data);
  if (!id) {
    throw new Error('Instagram did not return a comment id for first comment');
  }
  return { id };
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
  const mediaUrl = toVerifiedPublishMediaUrl(imageUrl.trim());
  const url = new URL(`${GRAPH_BASE}/${encodeURIComponent(pageId)}/photos`);
  url.searchParams.set('url', mediaUrl);
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
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  raw: unknown;
};

type GraphInsightRow = {
  name?: string;
  values?: Array<{ value?: number }>;
  total_value?: { value?: number };
};

/** Prefer Meta `total_value`, otherwise SUM every daily bucket (not only the last day). */
function readInsightNumber(row: GraphInsightRow): number {
  const total = row.total_value?.value;
  if (typeof total === 'number' && Number.isFinite(total)) return total;
  return (row.values ?? []).reduce((sum, item) => sum + (Number(item.value) || 0), 0);
}

async function igInsightsQuery(
  igUserId: string,
  accessToken: string,
  params: Record<string, string>
): Promise<GraphInsightRow[]> {
  const url = new URL(`${GRAPH_BASE}/${encodeURIComponent(igUserId)}/insights`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set('access_token', accessToken);
  const data = await graphJson<{ data?: GraphInsightRow[] }>(url.toString());
  return data.data ?? [];
}

function mergeIgInsightRow(out: InstagramInsights, row: GraphInsightRow) {
  const value = readInsightNumber(row);
  if (!row.name || !Number.isFinite(value)) return;
  if (row.name === 'views' || row.name === 'impressions') {
    out.impressions = Math.max(out.impressions ?? 0, value);
  }
  if (row.name === 'reach') out.reach = Math.max(out.reach ?? 0, value);
  if (row.name === 'profile_views' || row.name === 'profile_links_taps') {
    out.profile_views = Math.max(out.profile_views ?? 0, value);
  }
  if (row.name === 'likes') out.likes = Math.max(out.likes ?? 0, value);
  if (row.name === 'comments') out.comments = Math.max(out.comments ?? 0, value);
  if (row.name === 'shares') out.shares = Math.max(out.shares ?? 0, value);
  if (row.name === 'saves' || row.name === 'saved') {
    out.saves = Math.max(out.saves ?? 0, value);
  }
  if (row.name === 'follower_count') out.follower_count = value;
}

/**
 * Instagram account insights for a calendar window (reach + views of ALL content,
 * not only posts published in-range). `views` requires metric_type=total_value.
 */
export async function fetchInstagramInsights(
  igUserId: string,
  accessToken: string,
  range?: { from: string; to: string }
): Promise<InstagramInsights> {
  const { from, to } = range ?? defaultAnalyticsRange();
  const { since, until } = rangeToUnix(from, to);
  const sinceUntil = { since: String(since), until: String(until) };
  const out: InstagramInsights = { raw: null };
  const rawChunks: unknown[] = [];

  const queries: Array<Record<string, string>> = [
    { metric: 'views', period: 'day', metric_type: 'total_value', ...sinceUntil },
    { metric: 'reach', period: 'day', metric_type: 'total_value', ...sinceUntil },
    {
      metric: 'likes,comments,shares,saves,total_interactions,accounts_engaged',
      period: 'day',
      metric_type: 'total_value',
      ...sinceUntil,
    },
    { metric: 'reach', period: 'day', ...sinceUntil },
    { metric: 'profile_views', period: 'day', metric_type: 'total_value', ...sinceUntil },
    { metric: 'reach,views,profile_views', period: 'day', ...sinceUntil },
  ];

  const results = await Promise.allSettled(
    queries.map((params) => igInsightsQuery(igUserId, accessToken, params))
  );

  let lastError: unknown = null;
  let anyOk = false;
  for (const result of results) {
    if (result.status === 'rejected') {
      lastError = result.reason;
      continue;
    }
    anyOk = true;
    rawChunks.push(result.value);
    for (const row of result.value) mergeIgInsightRow(out, row);
  }

  out.raw = rawChunks;
  if (anyOk) return out;

  throw lastError instanceof Error
    ? lastError
    : new Error('Instagram insights unavailable');
}

export type FacebookPageInsights = {
  reach: number;
  impressions: number;
  engaged: number;
  raw: unknown;
};

async function fbPageInsightsQuery(
  pageId: string,
  pageAccessToken: string,
  metric: string,
  since: string,
  until: string
): Promise<GraphInsightRow[]> {
  const url = new URL(`${GRAPH_BASE}/${encodeURIComponent(pageId)}/insights`);
  url.searchParams.set('metric', metric);
  url.searchParams.set('period', 'day');
  url.searchParams.set('since', since);
  url.searchParams.set('until', until);
  url.searchParams.set('access_token', pageAccessToken);
  const data = await graphJson<{ data?: GraphInsightRow[] }>(url.toString());
  return data.data ?? [];
}

/** Facebook Page reach / impressions for the selected calendar window. */
export async function fetchFacebookPageInsights(
  pageId: string,
  pageAccessToken: string,
  range?: { from: string; to: string }
): Promise<FacebookPageInsights> {
  const { from, to } = range ?? defaultAnalyticsRange();
  const { since, until } = rangeToUnix(from, to);
  const sinceS = String(since);
  const untilS = String(until);
  const metricSets = [
    'page_impressions_unique,page_impressions,page_post_engagements',
    'page_posts_impressions_unique,page_posts_impressions',
    'page_impressions',
  ];

  const out: FacebookPageInsights = {
    reach: 0,
    impressions: 0,
    engaged: 0,
    raw: null,
  };
  const rawChunks: unknown[] = [];
  const results = await Promise.allSettled(
    metricSets.map((metric) =>
      fbPageInsightsQuery(pageId, pageAccessToken, metric, sinceS, untilS)
    )
  );

  for (const result of results) {
    if (result.status === 'rejected') continue;
    rawChunks.push(result.value);
    for (const row of result.value) {
      const value = readInsightNumber(row);
      if (!row.name || value <= 0) continue;
      if (
        row.name === 'page_impressions_unique' ||
        row.name === 'page_posts_impressions_unique'
      ) {
        out.reach = Math.max(out.reach, value);
      }
      if (
        row.name === 'page_impressions' ||
        row.name === 'page_posts_impressions'
      ) {
        out.impressions = Math.max(out.impressions, value);
      }
      if (row.name === 'page_post_engagements') {
        out.engaged = Math.max(out.engaged, value);
      }
    }
  }

  if (out.reach <= 0 && out.impressions > 0) out.reach = out.impressions;
  out.raw = rawChunks;
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
  /** Nested insights when requested (views / reach). */
  insights?: {
    data?: Array<{
      name?: string;
      values?: Array<{ value?: number }>;
      total_value?: { value?: number };
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
    const value =
      Number(metric.total_value?.value) ||
      Number(metric.values?.[0]?.value) ||
      0;
    if (
      metric.name === 'impressions' ||
      metric.name === 'views' ||
      metric.name === 'plays'
    ) {
      impressions = Math.max(impressions, value);
    }
    if (metric.name === 'reach') reach = Math.max(reach, value);
  }
  return { ...item, impressions, reach };
}

/** Recent Instagram media (posts / reels) for Planner + Analytics. */
export async function fetchInstagramMedia(
  igUserId: string,
  accessToken: string,
  limit = 50
): Promise<InstagramMediaItem[]> {
  // `impressions` is deprecated on IG media and rejects the whole nested field.
  const insightFieldAttempts = [
    'insights.metric(views,reach,total_interactions,saved,shares)',
    'insights.metric(views,reach,total_interactions)',
    'insights.metric(views,reach)',
    'insights.metric(reach)',
  ];
  const basic =
    'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count';

  async function load(fields: string) {
    const url = new URL(`${GRAPH_BASE}/${encodeURIComponent(igUserId)}/media`);
    url.searchParams.set('fields', fields);
    url.searchParams.set('limit', String(Math.min(Math.max(limit, 1), 100)));
    url.searchParams.set('access_token', accessToken);
    const data = await graphJson<{ data?: InstagramMediaItem[] }>(url.toString());
    return (data.data ?? []).map(flattenIgInsights);
  }

  for (const insights of insightFieldAttempts) {
    try {
      return await load(`${basic},${insights}`);
    } catch (error) {
      console.warn('[graph] IG media+insights failed, retrying', error);
    }
  }
  return load(basic);
}

export type InstagramStoryItem = {
  id: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  impressions?: number;
  reach?: number;
  replies?: number;
  exits?: number;
  taps_forward?: number;
  taps_back?: number;
};

/**
 * Active Instagram Stories (≈24h window) + per-story insights when available.
 * GET /{ig-user-id}/stories
 */
export async function fetchInstagramStories(
  igUserId: string,
  accessToken: string,
  limit = 25
): Promise<InstagramStoryItem[]> {
  const url = new URL(`${GRAPH_BASE}/${encodeURIComponent(igUserId)}/stories`);
  url.searchParams.set(
    'fields',
    'id,media_type,media_url,thumbnail_url,permalink,timestamp'
  );
  url.searchParams.set('limit', String(Math.min(Math.max(limit, 1), 50)));
  url.searchParams.set('access_token', accessToken);

  let stories: InstagramStoryItem[] = [];
  try {
    const data = await graphJson<{ data?: InstagramStoryItem[] }>(url.toString());
    stories = data.data ?? [];
  } catch (error) {
    console.warn('[graph] IG stories list failed', error);
    return [];
  }

  const withInsights = await Promise.all(
    stories.map(async (story) => {
      try {
        const insightUrl = new URL(
          `${GRAPH_BASE}/${encodeURIComponent(story.id)}/insights`
        );
        insightUrl.searchParams.set(
          'metric',
          'impressions,reach,replies,exits,taps_forward,taps_back'
        );
        insightUrl.searchParams.set('access_token', accessToken);
        const insightData = await graphJson<{
          data?: Array<{ name?: string; values?: Array<{ value?: number }> }>;
        }>(insightUrl.toString());
        const flat: Record<string, number> = {};
        for (const metric of insightData.data ?? []) {
          if (metric.name) {
            flat[metric.name] = Number(metric.values?.[0]?.value) || 0;
          }
        }
        return {
          ...story,
          impressions: flat.impressions || 0,
          reach: flat.reach || 0,
          replies: flat.replies || 0,
          exits: flat.exits || 0,
          taps_forward: flat.taps_forward || 0,
          taps_back: flat.taps_back || 0,
        } satisfies InstagramStoryItem;
      } catch {
        return { ...story, impressions: 0, reach: 0, replies: 0 };
      }
    })
  );

  return withInsights;
}

export type FacebookPageStoryItem = {
  post_id: string;
  status?: string;
  creation_time?: string | number;
  media_type?: string;
  media_id?: string;
  url?: string;
  /** Best-effort thumbnail / media preview when resolvable. */
  media_url?: string | null;
  impressions?: number;
  reach?: number;
  replies?: number;
};

/**
 * Facebook Page Stories via Page Stories API.
 * GET /{page-id}/stories — published + archived; we keep PUBLISHED for the live tab.
 * Docs: https://developers.facebook.com/docs/page-stories-api/
 */
export async function fetchFacebookPageStories(
  pageId: string,
  pageAccessToken: string,
  limit = 25
): Promise<FacebookPageStoryItem[]> {
  const url = new URL(`${GRAPH_BASE}/${encodeURIComponent(pageId)}/stories`);
  url.searchParams.set('limit', String(Math.min(Math.max(limit, 1), 50)));
  url.searchParams.set('access_token', pageAccessToken);
  // Prefer currently live / published stories when the API accepts the filter.
  url.searchParams.set('status', 'PUBLISHED');

  let stories: FacebookPageStoryItem[] = [];
  try {
    const data = await graphJson<{ data?: FacebookPageStoryItem[] }>(url.toString());
    stories = (data.data ?? []).filter((s) => Boolean(s?.post_id));
  } catch (error) {
    // Some tokens reject `status` — retry without it, then filter client-side.
    console.warn('[graph] FB stories list failed (with status)', error);
    try {
      const fallback = new URL(
        `${GRAPH_BASE}/${encodeURIComponent(pageId)}/stories`
      );
      fallback.searchParams.set('limit', String(Math.min(Math.max(limit, 1), 50)));
      fallback.searchParams.set('access_token', pageAccessToken);
      const data = await graphJson<{ data?: FacebookPageStoryItem[] }>(
        fallback.toString()
      );
      stories = (data.data ?? [])
        .filter((s) => Boolean(s?.post_id))
        .filter(
          (s) =>
            !s.status ||
            String(s.status).toUpperCase() === 'PUBLISHED' ||
            String(s.status).toUpperCase() === 'PUBLISHING'
        );
    } catch (retryError) {
      console.warn('[graph] FB stories list failed', retryError);
      return [];
    }
  }

  const withInsights = await Promise.all(
    stories.slice(0, limit).map(async (story) => {
      let impressions = 0;
      let reach = 0;
      let replies = 0;
      let mediaUrl: string | null = null;

      // Story insights — try current + legacy metric names (Meta is migrating June 2026).
      const metricSets = [
        'PAGE_STORY_TOTAL_MEDIA_VIEW_UNIQUE,PAGE_STORY_IMPRESSIONS_BY_STORY_ID,PAGE_STORY_IMPRESSIONS_BY_STORY_ID_UNIQUE',
        'story_total_media_view_unique,story_media_view',
        'PAGE_STORY_IMPRESSIONS_BY_STORY_ID,PAGE_STORY_IMPRESSIONS_BY_STORY_ID_UNIQUE',
      ];
      for (const metric of metricSets) {
        try {
          const insightUrl = new URL(
            `${GRAPH_BASE}/${encodeURIComponent(story.post_id)}/insights`
          );
          insightUrl.searchParams.set('metric', metric);
          insightUrl.searchParams.set('access_token', pageAccessToken);
          const insightData = await graphJson<{
            data?: Array<{ name?: string; values?: Array<{ value?: number }> }>;
          }>(insightUrl.toString());
          const flat: Record<string, number> = {};
          for (const row of insightData.data ?? []) {
            if (row.name) {
              flat[row.name] = Number(row.values?.[0]?.value) || 0;
            }
          }
          impressions = Math.max(
            impressions,
            flat.PAGE_STORY_IMPRESSIONS_BY_STORY_ID || 0,
            flat.story_media_view || 0,
            flat.PAGE_STORY_IMPRESSIONS_BY_STORY_ID_UNIQUE || 0
          );
          reach = Math.max(
            reach,
            flat.PAGE_STORY_TOTAL_MEDIA_VIEW_UNIQUE || 0,
            flat.PAGE_STORY_IMPRESSIONS_BY_STORY_ID_UNIQUE || 0,
            flat.story_total_media_view_unique || 0
          );
          if (impressions > 0 || reach > 0) break;
        } catch {
          /* try next metric set */
        }
      }

      // Best-effort media preview from photo/video id.
      if (story.media_id) {
        try {
          const mediaUrlReq = new URL(
            `${GRAPH_BASE}/${encodeURIComponent(story.media_id)}`
          );
          mediaUrlReq.searchParams.set(
            'fields',
            'picture,source,images,thumbnails'
          );
          mediaUrlReq.searchParams.set('access_token', pageAccessToken);
          const media = await graphJson<{
            picture?: string;
            source?: string;
            images?: Array<{ source?: string }>;
            thumbnails?: { data?: Array<{ uri?: string }> };
          }>(mediaUrlReq.toString());
          mediaUrl =
            media.picture ||
            media.images?.[0]?.source ||
            media.thumbnails?.data?.[0]?.uri ||
            media.source ||
            null;
        } catch {
          /* ignore preview failures */
        }
      }

      return {
        ...story,
        media_url: mediaUrl,
        impressions,
        reach,
        replies,
      } satisfies FacebookPageStoryItem;
    })
  );

  return withInsights;
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
    const name = String(metric.name || '');
    // Prefer current Meta metrics; keep legacy names for older Graph responses.
    if (
      name === 'post_media_view' ||
      name === 'post_total_media_view' ||
      name === 'post_total_media_view_unique' ||
      name === 'post_impressions' ||
      name === 'post_impressions_unique'
    ) {
      const value = Number(metric.values?.[0]?.value) || 0;
      if (value > impressions) impressions = value;
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
  // post_impressions was deprecated — post_media_view is the current replacement.
  'insights.metric(post_media_view)',
].join(',');

const FB_POST_FIELDS_WITH_INSIGHTS_LEGACY = [
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
  'insights.metric(post_impressions)',
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
  // Prefer published_posts + current insights; fall back to legacy / basic / feed.
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
    console.warn('[graph] published_posts+post_media_view failed', error);
  }

  try {
    const posts = await fetchFacebookEdge(
      pageId,
      'published_posts',
      pageAccessToken,
      FB_POST_FIELDS_WITH_INSIGHTS_LEGACY,
      limit
    );
    if (posts.length > 0) return posts;
  } catch (error) {
    console.warn('[graph] published_posts+insights legacy failed', error);
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
  // Public comment replies use Graph v21.0 + Bearer (same as private replies).
  const commentReplyUrl = `https://graph.facebook.com/v21.0/${encodeURIComponent(
    commentId
  )}/replies`;
  const res = await fetch(commentReplyUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
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
 * CRITICAL:
 * - recipient MUST be `{ comment_id }` (not user id) to bypass the 24h window.
 * - Target MUST be the Facebook Page id (`/{page-id}/messages`) with a Page Access Token.
 *   Using Instagram Business Account id → Meta Error #3.
 */
export async function sendInstagramPrivateReply(input: {
  /** Facebook Page id (required for Private Reply). */
  igOrPageId: string;
  accessToken: string;
  commentId: string;
  message: string;
}): Promise<{ id: string }> {
  const targetId = String(input.igOrPageId || '').trim();
  const messagingUrl = `https://graph.facebook.com/v21.0/${encodeURIComponent(
    targetId
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

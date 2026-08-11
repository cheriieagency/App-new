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

export { GRAPH_BASE };

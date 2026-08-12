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
};

/** Recent Instagram media (posts / reels) for Planner + Analytics. */
export async function fetchInstagramMedia(
  igUserId: string,
  accessToken: string,
  limit = 25
): Promise<InstagramMediaItem[]> {
  const url = new URL(`${GRAPH_BASE}/${encodeURIComponent(igUserId)}/media`);
  url.searchParams.set(
    'fields',
    'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count'
  );
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('access_token', accessToken);
  const data = await graphJson<{ data?: InstagramMediaItem[] }>(url.toString());
  return data.data ?? [];
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

export { GRAPH_BASE };

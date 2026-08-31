/**
 * Live published-post analytics for Instagram, Facebook Page, and TikTok.
 * Normalizes each API into UnifiedPostMetric for Analytics → Posts.
 */

import {
  fetchFacebookPagePosts,
  fetchInstagramMedia,
} from '@/lib/meta/graph-api';
import {
  ensureFreshTikTokAccessToken,
  fetchTikTokVideos,
} from '@/lib/tiktok/oauth';
import {
  loadWorkspaceSocialTokens,
  type WorkspaceSocialToken,
} from '@/lib/analytics/workspace-tokens';

export type UnifiedPostPlatform = 'instagram' | 'facebook' | 'tiktok';

export type UnifiedPostMetric = {
  id: string;
  platform: UnifiedPostPlatform;
  title: string;
  /** Full caption/message for hashtag extraction (not truncated). */
  caption?: string;
  mediaUrl?: string;
  permalink?: string;
  publishedAt: string;
  impressions: number;
  likes: number;
  comments: number;
  shares?: number;
  engagementRate: number;
  /** IMAGE | VIDEO | REELS | STATUS — used to split Posts vs Reels. */
  mediaType?: string;
};

export type PlatformAccountPill = {
  platform: UnifiedPostPlatform;
  connected: boolean;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  post_count: number;
  status: 'ok' | 'empty' | 'error' | 'disconnected';
  message?: string | null;
};

type TokenRow = WorkspaceSocialToken;

function roundEr(likes: number, comments: number, shares: number, denom: number) {
  if (denom <= 0) return 0;
  return Math.round(((likes + comments + shares) / denom) * 1000) / 10;
}

function titleFromCaption(caption: string | null | undefined, fallback: string) {
  const line = (caption || '').split('\n')[0]?.trim();
  if (!line) return fallback;
  return line.length > 72 ? `${line.slice(0, 72)}…` : line;
}

async function loadWorkspaceAccounts(
  userId: string,
  workspaceId: string
): Promise<TokenRow[]> {
  return loadWorkspaceSocialTokens({ userId, workspaceId });
}

async function fetchInstagramPosts(
  igUserId: string,
  token: string,
  limit = 50
): Promise<UnifiedPostMetric[]> {
  const media = await fetchInstagramMedia(igUserId, token, limit);
  return media.map((item) => {
    const likes = Number(item.like_count) || 0;
    const comments = Number(item.comments_count) || 0;
    const impressions = Math.max(
      Number(item.impressions) || 0,
      Number(item.reach) || 0,
      likes + comments,
      1
    );
    return {
      id: `instagram:${item.id}`,
      platform: 'instagram' as const,
      title: titleFromCaption(
        item.caption,
        `Instagram ${item.media_type || 'post'}`
      ),
      caption: item.caption || undefined,
      mediaUrl: item.thumbnail_url || item.media_url || undefined,
      permalink: item.permalink || undefined,
      publishedAt: item.timestamp || new Date(0).toISOString(),
      impressions,
      likes,
      comments,
      shares: 0,
      engagementRate: roundEr(likes, comments, 0, impressions),
      mediaType: item.media_type || 'IMAGE',
    };
  });
}

async function fetchFacebookPosts(
  pageId: string,
  token: string,
  limit = 50
): Promise<UnifiedPostMetric[]> {
  const posts = await fetchFacebookPagePosts(pageId, token, limit);
  return posts.map((item) => {
    const likes = Number(item.likes?.summary?.total_count) || 0;
    const comments = Number(item.comments?.summary?.total_count) || 0;
    const shares = Number(item.shares?.count) || 0;
    const impressions = Math.max(
      Number(item.impressions) || 0,
      likes + comments + shares,
      1
    );
    const att = item.attachments?.data?.[0];
    const raw = (att?.media_type || att?.type || item.status_type || '').toLowerCase();
    const mediaType = raw.includes('video')
      ? 'VIDEO'
      : item.full_picture
        ? 'IMAGE'
        : 'STATUS';
    return {
      id: `facebook:${item.id}`,
      platform: 'facebook' as const,
      title: titleFromCaption(item.message, 'Facebook post'),
      caption: item.message || undefined,
      mediaUrl:
        item.full_picture ||
        att?.media?.image?.src ||
        att?.media?.source ||
        undefined,
      permalink: item.permalink_url || undefined,
      publishedAt: item.created_time || new Date(0).toISOString(),
      impressions,
      likes,
      comments,
      shares,
      engagementRate: roundEr(likes, comments, shares, impressions),
      mediaType,
    };
  });
}

async function fetchTikTokPosts(
  token: string,
  ctx: {
    userId: string;
    workspaceId: string;
    refreshToken?: string | null;
    expiresAt?: string | null;
    limit?: number;
  }
): Promise<UnifiedPostMetric[]> {
  const accessToken = await ensureFreshTikTokAccessToken({
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
    accessToken: token,
    refreshToken: ctx.refreshToken,
    expiresAt: ctx.expiresAt,
  });
  const videos = await fetchTikTokVideos(accessToken, ctx.limit ?? 20);
  return videos.map((item) => {
    const likes = Number(item.like_count) || 0;
    const comments = Number(item.comment_count) || 0;
    const shares = Number(item.share_count) || 0;
    const views = Number(item.view_count) || 0;
    const impressions = Math.max(views, likes + comments + shares, 1);
    const caption = item.video_description || item.title || null;
    const publishedAt =
      typeof item.create_time === 'number'
        ? new Date(item.create_time * 1000).toISOString()
        : new Date(0).toISOString();
    return {
      id: `tiktok:${item.id}`,
      platform: 'tiktok' as const,
      title: titleFromCaption(caption, 'TikTok video'),
      caption: caption || undefined,
      mediaUrl: item.cover_image_url || undefined,
      permalink: item.share_url || undefined,
      publishedAt,
      impressions,
      likes,
      comments,
      shares,
      engagementRate: roundEr(likes, comments, shares, impressions),
      mediaType: 'VIDEO',
    };
  });
}

export type LivePostsAnalytics = {
  posts: UnifiedPostMetric[];
  accounts: PlatformAccountPill[];
  sort: 'engagementRate' | 'publishedAt';
};

export type UnifiedPostFetchLimits = {
  instagram?: number;
  facebook?: number;
  tiktok?: number;
};

/** Pull + normalize live posts for the active workspace. */
export async function fetchLiveUnifiedPosts(input: {
  userId: string;
  workspaceId: string;
  sort?: 'engagementRate' | 'publishedAt';
  postLimits?: UnifiedPostFetchLimits;
}): Promise<LivePostsAnalytics> {
  const sort = input.sort || 'engagementRate';
  const limits = input.postLimits ?? {};
  const igLimit = limits.instagram ?? 50;
  const fbLimit = limits.facebook ?? 50;
  const tiktokLimit = limits.tiktok ?? 20;
  const rows = await loadWorkspaceAccounts(input.userId, input.workspaceId);
  const byPlatform = new Map<string, TokenRow>();
  for (const row of rows) {
    if (!byPlatform.has(row.platform)) byPlatform.set(row.platform, row);
  }

  function tokenRowFor(platform: UnifiedPostPlatform): TokenRow | undefined {
    const direct = byPlatform.get(platform);
    if (direct?.access_token) return direct;
    if (platform === 'tiktok') {
      const business = byPlatform.get('tiktok_business');
      if (business?.access_token) return business;
    }
    return direct;
  }

  const posts: UnifiedPostMetric[] = [];
  const accounts: PlatformAccountPill[] = [];

  const platforms: UnifiedPostPlatform[] = ['instagram', 'facebook', 'tiktok'];

  await Promise.all(
    platforms.map(async (platform) => {
      const row = tokenRowFor(platform);
      if (!row?.access_token) {
        accounts.push({
          platform,
          connected: false,
          handle: null,
          display_name: null,
          avatar_url: null,
          post_count: 0,
          status: 'disconnected',
          message: 'Connect account or publish content to view analytics',
        });
        return;
      }

      const handle =
        row.handle ||
        (platform === 'facebook' ? row.page_name : null) ||
        null;
      const displayName =
        row.display_name ||
        row.page_name ||
        handle ||
        platform;

      try {
        let batch: UnifiedPostMetric[] = [];
        if (platform === 'instagram' && row.platform_user_id) {
          batch = await fetchInstagramPosts(
            row.platform_user_id,
            row.access_token,
            igLimit
          );
        } else if (platform === 'facebook') {
          const pageId = row.page_id || row.platform_user_id;
          if (!pageId) throw new Error('Facebook Page id missing');
          batch = await fetchFacebookPosts(pageId, row.access_token, fbLimit);
        } else if (platform === 'tiktok') {
          batch = await fetchTikTokPosts(row.access_token, {
            userId: input.userId,
            workspaceId: input.workspaceId,
            refreshToken: row.refresh_token,
            expiresAt: row.expires_at,
            limit: tiktokLimit,
          });
        }

        posts.push(...batch);
        accounts.push({
          platform,
          connected: true,
          handle,
          display_name: displayName,
          avatar_url: row.avatar_url,
          post_count: batch.length,
          status: batch.length > 0 ? 'ok' : 'empty',
          message:
            batch.length > 0
              ? null
              : 'Connect account or publish content to view analytics',
        });
      } catch (error) {
        console.warn(`[unified-posts] ${platform} failed`, error);
        accounts.push({
          platform,
          connected: true,
          handle,
          display_name: displayName,
          avatar_url: row.avatar_url,
          post_count: 0,
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Connect account or publish content to view analytics',
        });
      }
    })
  );

  posts.sort((a, b) => {
    if (sort === 'publishedAt') {
      return (
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
    }
    if (b.engagementRate !== a.engagementRate) {
      return b.engagementRate - a.engagementRate;
    }
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  // Keep account pills in a stable Instagram → Facebook → TikTok order.
  accounts.sort(
    (a, b) => platforms.indexOf(a.platform) - platforms.indexOf(b.platform)
  );

  return { posts, accounts, sort };
}

/** Active Instagram + Facebook Stories for Analytics → Stories. */
export async function fetchLiveStories(input: {
  userId: string;
  workspaceId: string;
}): Promise<LivePostsAnalytics> {
  const rows = await loadWorkspaceAccounts(input.userId, input.workspaceId);
  const ig = rows.find((r) => r.platform === 'instagram' && r.access_token);
  const fb = rows.find((r) => r.platform === 'facebook' && r.access_token);
  const accounts: PlatformAccountPill[] = [];
  const posts: UnifiedPostMetric[] = [];

  // --- Instagram Stories (GET /{ig-user-id}/stories, ~24h window) ---
  if (!ig?.access_token || !ig.platform_user_id) {
    accounts.push({
      platform: 'instagram',
      connected: false,
      handle: null,
      display_name: null,
      avatar_url: null,
      post_count: 0,
      status: 'disconnected',
      message: 'Connect Instagram to load Stories analytics',
    });
  } else {
    const handle = ig.handle || null;
    try {
      const { fetchInstagramStories } = await import('@/lib/meta/graph-api');
      const stories = await fetchInstagramStories(
        ig.platform_user_id,
        ig.access_token,
        25
      );
      for (const story of stories) {
        const impressions = Math.max(
          Number(story.impressions) || 0,
          Number(story.reach) || 0,
          1
        );
        const replies = Number(story.replies) || 0;
        posts.push({
          id: `instagram-story:${story.id}`,
          platform: 'instagram',
          title: `Story ${story.media_type || 'STORY'}`,
          mediaUrl: story.thumbnail_url || story.media_url || undefined,
          permalink: story.permalink || undefined,
          publishedAt: story.timestamp || new Date().toISOString(),
          impressions,
          likes: 0,
          comments: replies,
          shares: Number(story.taps_forward) || 0,
          engagementRate: roundEr(0, replies, 0, impressions),
          mediaType: story.media_type || 'STORY',
        });
      }
      const igCount = posts.filter((p) => p.platform === 'instagram').length;
      accounts.push({
        platform: 'instagram',
        connected: true,
        handle,
        display_name: ig.display_name || handle,
        avatar_url: ig.avatar_url,
        post_count: igCount,
        status: igCount > 0 ? 'ok' : 'empty',
        message:
          igCount > 0
            ? null
            : 'No active Instagram Stories right now (Meta only returns the ~24h window)',
      });
    } catch (error) {
      console.warn('[unified-posts] IG stories failed', error);
      accounts.push({
        platform: 'instagram',
        connected: true,
        handle,
        display_name: ig.display_name || handle,
        avatar_url: ig.avatar_url,
        post_count: 0,
        status: 'error',
        message:
          error instanceof Error ? error.message : 'Failed to load Instagram Stories',
      });
    }
  }

  // --- Facebook Page Stories (GET /{page-id}/stories — Page Stories API) ---
  const fbPageId = fb?.page_id || fb?.platform_user_id || null;
  if (!fb?.access_token || !fbPageId) {
    accounts.push({
      platform: 'facebook',
      connected: false,
      handle: null,
      display_name: null,
      avatar_url: null,
      post_count: 0,
      status: 'disconnected',
      message: 'Connect Facebook to load Page Stories analytics',
    });
  } else {
    const handle = fb.handle || fb.page_name || null;
    try {
      const { fetchFacebookPageStories } = await import('@/lib/meta/graph-api');
      const stories = await fetchFacebookPageStories(
        fbPageId,
        fb.access_token,
        25
      );
      for (const story of stories) {
        const impressions = Math.max(
          Number(story.impressions) || 0,
          Number(story.reach) || 0,
          1
        );
        const created =
          typeof story.creation_time === 'number'
            ? new Date(story.creation_time * 1000).toISOString()
            : typeof story.creation_time === 'string' &&
                /^\d+$/.test(story.creation_time)
              ? new Date(Number(story.creation_time) * 1000).toISOString()
              : story.creation_time
                ? new Date(String(story.creation_time)).toISOString()
                : new Date().toISOString();
        posts.push({
          id: `facebook-story:${story.post_id}`,
          platform: 'facebook',
          title: `Story ${story.media_type || 'STORY'}`,
          mediaUrl: story.media_url || undefined,
          permalink: story.url || undefined,
          publishedAt: created,
          impressions,
          likes: 0,
          comments: Number(story.replies) || 0,
          shares: 0,
          engagementRate: roundEr(0, Number(story.replies) || 0, 0, impressions),
          mediaType: story.media_type || 'STORY',
        });
      }
      const fbCount = posts.filter((p) => p.platform === 'facebook').length;
      accounts.push({
        platform: 'facebook',
        connected: true,
        handle,
        display_name: fb.display_name || fb.page_name || handle,
        avatar_url: fb.avatar_url,
        post_count: fbCount,
        status: fbCount > 0 ? 'ok' : 'empty',
        message:
          fbCount > 0
            ? null
            : 'No published Facebook Page Stories right now',
      });
    } catch (error) {
      console.warn('[unified-posts] FB stories failed', error);
      accounts.push({
        platform: 'facebook',
        connected: true,
        handle,
        display_name: fb.display_name || fb.page_name || handle,
        avatar_url: fb.avatar_url,
        post_count: 0,
        status: 'error',
        message:
          error instanceof Error ? error.message : 'Failed to load Facebook Stories',
      });
    }
  }

  // Stable Instagram → Facebook order for the Stories tab.
  accounts.sort((a, b) => {
    const order = ['instagram', 'facebook'];
    return order.indexOf(a.platform) - order.indexOf(b.platform);
  });

  return { posts, accounts, sort: 'publishedAt' };
}

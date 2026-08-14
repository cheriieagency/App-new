/**
 * Multi-platform post/media aggregator for Analytics → Posts / Reels.
 * Instagram (Graph media) + Facebook Page posts + TikTok video.list.
 */

import {
  fetchFacebookPagePosts,
  fetchInstagramMedia,
  type FacebookPagePostItem,
  type InstagramMediaItem,
} from '@/lib/meta/graph-api';
import {
  ensureFreshTikTokAccessToken,
  fetchTikTokVideos,
  type TikTokVideoItem,
} from '@/lib/tiktok/oauth';
import { loadWorkspaceSocialTokens } from '@/lib/analytics/workspace-tokens';

export type AnalyticsMediaPlatform = 'instagram' | 'facebook' | 'tiktok';

/** Normalized media row returned by GET /api/analytics. */
export type AnalyticsMediaItem = {
  id: string;
  platform: AnalyticsMediaPlatform;
  caption?: string | null;
  media_type?: string | null;
  media_url?: string | null;
  thumbnail_url?: string | null;
  permalink?: string | null;
  like_count?: number | null;
  comments_count?: number | null;
  shares_count?: number | null;
  view_count?: number | null;
  timestamp?: string | null;
};

function fromInstagram(item: InstagramMediaItem): AnalyticsMediaItem {
  return {
    id: `instagram:${item.id}`,
    platform: 'instagram',
    caption: item.caption ?? null,
    media_type: item.media_type ?? 'IMAGE',
    media_url: item.media_url ?? null,
    thumbnail_url: item.thumbnail_url ?? item.media_url ?? null,
    permalink: item.permalink ?? null,
    like_count: item.like_count ?? 0,
    comments_count: item.comments_count ?? 0,
    shares_count: 0,
    view_count: item.impressions ?? item.reach ?? null,
    timestamp: item.timestamp ?? null,
  };
}

function facebookMediaType(item: FacebookPagePostItem): string {
  const att = item.attachments?.data?.[0];
  const raw = (att?.media_type || att?.type || item.status_type || '').toLowerCase();
  if (raw.includes('video')) return 'VIDEO';
  if (raw.includes('photo') || raw.includes('image') || item.full_picture) {
    return 'IMAGE';
  }
  return 'STATUS';
}

function fromFacebook(item: FacebookPagePostItem): AnalyticsMediaItem {
  const att = item.attachments?.data?.[0];
  const thumb =
    item.full_picture ||
    att?.media?.image?.src ||
    att?.media?.source ||
    null;
  return {
    id: `facebook:${item.id}`,
    platform: 'facebook',
    caption: item.message ?? null,
    media_type: facebookMediaType(item),
    media_url: thumb,
    thumbnail_url: thumb,
    permalink: item.permalink_url ?? null,
    like_count: item.likes?.summary?.total_count ?? 0,
    comments_count: item.comments?.summary?.total_count ?? 0,
    shares_count: item.shares?.count ?? 0,
    view_count: item.impressions ?? null,
    timestamp: item.created_time ?? null,
  };
}

function fromTikTok(item: TikTokVideoItem): AnalyticsMediaItem {
  const caption = item.video_description || item.title || null;
  const created =
    typeof item.create_time === 'number'
      ? new Date(item.create_time * 1000).toISOString()
      : null;
  return {
    id: `tiktok:${item.id}`,
    platform: 'tiktok',
    caption,
    // TikTok posts are short-form video — surface under Reels.
    media_type: 'VIDEO',
    media_url: item.cover_image_url ?? null,
    thumbnail_url: item.cover_image_url ?? null,
    permalink: item.share_url ?? null,
    like_count: item.like_count ?? 0,
    comments_count: item.comment_count ?? 0,
    shares_count: item.share_count ?? 0,
    view_count: item.view_count ?? null,
    timestamp: created,
  };
}

/** Sum engagement / views across multi-platform media for overview KPIs. */
export function aggregateMediaMetrics(media: AnalyticsMediaItem[]) {
  let likes = 0;
  let comments = 0;
  let shares = 0;
  let views = 0;
  for (const item of media) {
    likes += Number(item.like_count) || 0;
    comments += Number(item.comments_count) || 0;
    shares += Number(item.shares_count) || 0;
    views += Number(item.view_count) || 0;
  }
  return { likes, comments, shares, views };
}

/** Fetch recent posts from every connected API that exposes a media list. */
export async function fetchMultiPlatformMedia(input: {
  userId: string;
  workspaceId: string;
  /** Optional IG media already synced — avoids a second Graph call. */
  instagramMedia?: InstagramMediaItem[] | null;
}): Promise<AnalyticsMediaItem[]> {
  const tokens = await loadWorkspaceSocialTokens({
    userId: input.userId,
    workspaceId: input.workspaceId,
  });
  const byPlatform = new Map(tokens.map((row) => [row.platform, row]));

  const out: AnalyticsMediaItem[] = [];

  const ig = byPlatform.get('instagram');
  if (ig?.access_token && ig.platform_user_id) {
    try {
      const media =
        input.instagramMedia && input.instagramMedia.length > 0
          ? input.instagramMedia
          : await fetchInstagramMedia(ig.platform_user_id, ig.access_token, 25);
      out.push(...media.map(fromInstagram));
    } catch (error) {
      console.warn('[analytics/media] Instagram failed', error);
    }
  }

  const fb = byPlatform.get('facebook');
  if (fb?.access_token) {
    const pageId = fb.page_id || fb.platform_user_id;
    if (pageId) {
      try {
        const posts = await fetchFacebookPagePosts(pageId, fb.access_token, 25);
        out.push(...posts.map(fromFacebook));
      } catch (error) {
        console.warn('[analytics/media] Facebook failed', error);
      }
    }
  }

  const tt = byPlatform.get('tiktok');
  if (tt?.access_token) {
    try {
      const token = await ensureFreshTikTokAccessToken({
        userId: input.userId,
        workspaceId: input.workspaceId,
        accessToken: tt.access_token,
        refreshToken: tt.refresh_token,
        expiresAt: tt.expires_at,
      });
      const videos = await fetchTikTokVideos(token, 20);
      out.push(...videos.map(fromTikTok));
    } catch (error) {
      console.warn('[analytics/media] TikTok failed', error);
    }
  }

  // Newest first for stable ranking input.
  return out.sort((a, b) => {
    const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return tb - ta;
  });
}

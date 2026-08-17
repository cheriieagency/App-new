/**
 * Derive project goal progress from live Analytics media.
 * Prefers posts tagged with the campaign; falls back to workspace totals.
 */

import type { AnalyticsMediaItem } from '@/lib/analytics/media';
import type {
  CampaignGoalMetric,
  PlannerPost,
} from '@/lib/mock-content-planner';

export type CampaignGoalProgressResult = {
  current: number;
  matchedPosts: number;
  matchedMedia: number;
  /** campaign = scoped to tagged posts; workspace = full analytics rollup */
  scope: 'campaign' | 'workspace';
};

function stripPlatformPrefix(id: string): string {
  const i = id.indexOf(':');
  return i >= 0 ? id.slice(i + 1) : id;
}

/** Platform media ids embedded in Meta-synced planner posts (meta-ig-{id}). */
export function plannerPostPlatformIds(post: PlannerPost): string[] {
  const ids: string[] = [];
  const idMatch = post.id.match(/^meta-(?:ig|fb|tt|tiktok)-(.+)$/i);
  if (idMatch?.[1]) ids.push(idMatch[1]);
  for (const item of post.media_items ?? []) {
    const m = item.id?.match(/^meta-m-(.+)$/i);
    if (m?.[1]) ids.push(m[1]);
  }
  return ids;
}

function normalizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`.replace(/\/$/, '');
  } catch {
    return url.split('?')[0] || url;
  }
}

function captionKey(text: string | null | undefined): string {
  return (text || '')
    .split('\n')[0]
    ?.trim()
    .slice(0, 48)
    .toLowerCase() || '';
}

export function mediaMatchesCampaignPost(
  media: AnalyticsMediaItem,
  post: PlannerPost
): boolean {
  const mediaRaw = stripPlatformPrefix(media.id);
  const platformIds = plannerPostPlatformIds(post);
  if (platformIds.some((id) => id === mediaRaw || media.id.endsWith(`:${id}`))) {
    return true;
  }

  const postUrls = [
    normalizeUrl(post.media_url),
    ...(post.media_items ?? []).map((m) => normalizeUrl(m.url)),
  ].filter(Boolean) as string[];
  const mediaUrls = [
    normalizeUrl(media.media_url),
    normalizeUrl(media.thumbnail_url),
    normalizeUrl(media.permalink),
  ].filter(Boolean) as string[];
  if (postUrls.some((u) => mediaUrls.includes(u))) return true;

  // Soft match: same calendar day + similar caption (for manually published posts).
  const postCap = captionKey(post.caption || post.title);
  const mediaCap = captionKey(media.caption);
  if (postCap && mediaCap && postCap === mediaCap) {
    const postDay = (post.published_at || post.scheduled_at || '').slice(0, 10);
    const mediaDay = (media.timestamp || '').slice(0, 10);
    if (postDay && mediaDay && postDay === mediaDay) return true;
  }

  return false;
}

function metricValue(
  media: AnalyticsMediaItem,
  metric: CampaignGoalMetric
): number {
  if (metric === 'engagement') {
    return (
      (Number(media.like_count) || 0) +
      (Number(media.comments_count) || 0) +
      (Number(media.shares_count) || 0)
    );
  }
  return Number(media.view_count) || 0;
}

function sumMedia(
  media: AnalyticsMediaItem[],
  metric: CampaignGoalMetric
): number {
  return media.reduce((sum, item) => sum + metricValue(item, metric), 0);
}

/**
 * Live progress for a project goal.
 * - If the project has tagged posts → sum matching analytics media only.
 * - Otherwise → workspace analytics total (same source as Analytics overview).
 */
export function computeCampaignGoalProgress(input: {
  metric: CampaignGoalMetric;
  campaignPosts: PlannerPost[];
  media: AnalyticsMediaItem[];
}): CampaignGoalProgressResult {
  const { metric, campaignPosts: tagged, media } = input;

  if (tagged.length === 0) {
    return {
      current: sumMedia(media, metric),
      matchedPosts: 0,
      matchedMedia: media.length,
      scope: 'workspace',
    };
  }

  const matchedMedia = media.filter((m) =>
    tagged.some((p) => mediaMatchesCampaignPost(m, p))
  );

  // Tagged posts exist but none matched yet (not published / not synced) → 0 scoped.
  if (matchedMedia.length === 0) {
    return {
      current: 0,
      matchedPosts: tagged.length,
      matchedMedia: 0,
      scope: 'campaign',
    };
  }

  const matchedPostIds = new Set(
    tagged
      .filter((p) => matchedMedia.some((m) => mediaMatchesCampaignPost(m, p)))
      .map((p) => p.id)
  );

  return {
    current: sumMedia(matchedMedia, metric),
    matchedPosts: matchedPostIds.size,
    matchedMedia: matchedMedia.length,
    scope: 'campaign',
  };
}

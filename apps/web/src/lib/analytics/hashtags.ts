/**
 * Aggregate hashtag performance from live IG / Facebook / TikTok captions.
 */

import {
  fetchLiveUnifiedPosts,
  type UnifiedPostMetric,
} from '@/lib/analytics/unified-posts';

export type HashtagStat = {
  tag: string;
  posts: number;
  reach: number;
  engagementRate: number;
  trend: number;
};

export type HashtagKpis = {
  uniqueTags: number;
  avgReachLift: number;
  taggedPosts: number;
};

export type HashtagAnalyticsResult = {
  kpis: HashtagKpis;
  hashtags: HashtagStat[];
};

/** Extract unique hashtags from a caption (Unicode letters + Nordic / Hebrew ranges). */
export function extractHashtagsFromCaption(caption: string | null | undefined): string[] {
  if (!caption) return [];
  // Prefer Unicode property escapes; fall back for older runtimes.
  let matches: string[] | null = null;
  try {
    matches = caption.match(/#[\p{L}\p{N}_]+/gu);
  } catch {
    matches = caption.match(/#[\w\u00C0-\u024F\u0590-\u05ff]+/g);
  }
  if (!matches?.length) return [];
  const unique = new Set(
    matches.map((m) => {
      const raw = m.startsWith('#') ? m : `#${m}`;
      return raw.toLowerCase();
    })
  );
  return [...unique];
}

function aggregateFromPosts(posts: UnifiedPostMetric[]): HashtagAnalyticsResult {
  const accountAvgEr =
    posts.length > 0
      ? posts.reduce((s, p) => s + (p.engagementRate || 0), 0) / posts.length
      : 0;

  const tagged = posts.filter(
    (p) => extractHashtagsFromCaption(p.caption || p.title).length > 0
  );
  const untagged = posts.filter(
    (p) => extractHashtagsFromCaption(p.caption || p.title).length === 0
  );

  const avgReachTagged =
    tagged.length > 0
      ? tagged.reduce((s, p) => s + (p.impressions || 0), 0) / tagged.length
      : 0;
  const avgReachUntagged =
    untagged.length > 0
      ? untagged.reduce((s, p) => s + (p.impressions || 0), 0) / untagged.length
      : avgReachTagged;

  // If baseline (untagged) reach is extremely small, even normal tagged
  // numbers create absurdly large lift percentages. Treat those cases as
  // "no stable baseline" instead of displaying thousands of %.
  const MIN_BASELINE_IMPRESSIONS = 20;
  const avgReachLift =
    avgReachUntagged >= MIN_BASELINE_IMPRESSIONS
      ? Math.round(
          ((avgReachTagged - avgReachUntagged) / avgReachUntagged) * 1000
        ) / 10
      : 0;

  type Acc = {
    tag: string;
    posts: number;
    reach: number;
    erSum: number;
  };
  const map = new Map<string, Acc>();

  for (const post of posts) {
    const tags = extractHashtagsFromCaption(post.caption || post.title);
    if (tags.length === 0) continue;
    for (const tag of tags) {
      const prev = map.get(tag) || { tag, posts: 0, reach: 0, erSum: 0 };
      prev.posts += 1;
      prev.reach += post.impressions || 0;
      prev.erSum += post.engagementRate || 0;
      map.set(tag, prev);
    }
  }

  const hashtags: HashtagStat[] = [...map.values()]
    .map((h) => {
      const engagementRate =
        h.posts > 0 ? Math.round((h.erSum / h.posts) * 10) / 10 : 0;
      const trend =
        accountAvgEr > 0
          ? Math.round(((engagementRate - accountAvgEr) / accountAvgEr) * 1000) / 10
          : 0;
      return {
        tag: h.tag,
        posts: h.posts,
        reach: h.reach,
        engagementRate,
        trend,
      };
    })
    .sort((a, b) => b.posts - a.posts || b.reach - a.reach);

  return {
    kpis: {
      uniqueTags: hashtags.length,
      avgReachLift,
      taggedPosts: tagged.length,
    },
    hashtags,
  };
}

/** Live hashtag analytics for the active workspace (optional date window). */
export async function fetchHashtagAnalytics(input: {
  userId: string;
  workspaceId: string;
  from?: string | null;
  to?: string | null;
}): Promise<HashtagAnalyticsResult> {
  const { posts } = await fetchLiveUnifiedPosts({
    userId: input.userId,
    workspaceId: input.workspaceId,
    sort: 'publishedAt',
  });
  const from = String(input.from || '').slice(0, 10);
  const to = String(input.to || '').slice(0, 10);
  const ranged =
    /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to)
      ? posts.filter((p) => {
          const day = String(p.publishedAt || '').slice(0, 10);
          return day >= from && day <= to;
        })
      : posts;
  return aggregateFromPosts(ranged);
}

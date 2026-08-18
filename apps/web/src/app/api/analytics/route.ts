/**
 * GET /api/analytics?workspaceId=…
 * Aggregates ALL social_accounts for the active workspace + Meta Graph insights/media
 * when Instagram is connected. Never 500s on empty accounts.
 */

import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
  listLiveSocialAccountsForUser,
} from '@/lib/social/persist';
import {
  getMetaSyncSnapshot,
  syncMetaDataForUser,
} from '@/lib/meta/sync';
import { fetchMultiPlatformDemographics } from '@/lib/analytics/demographics';
import {
  aggregateMediaMetrics,
  fetchMultiPlatformMedia,
  type AnalyticsMediaItem,
} from '@/lib/analytics/media';
import { isIsoInRange, parseAnalyticsRange } from '@/lib/analytics/period';
import { fetchWorkspacePeriodInsights } from '@/lib/analytics/period-insights';

const PLATFORMS = ['instagram', 'facebook', 'youtube', 'linkedin', 'tiktok'] as const;

type PlatformKey = (typeof PLATFORMS)[number];

function onboardingFallback(reason: string, workspaceId: string | null = null) {
  return {
    ok: true,
    source: 'onboarding_fallback',
    connected: false,
    reason,
    workspace_id: workspaceId,
    message:
      'No connected social accounts found for this workspace. Connect Instagram, Facebook, TikTok, YouTube, or LinkedIn under Settings → Socials.',
    cta: {
      label: 'Connect social accounts',
      href: '/admin/settings/socials',
    },
    metrics: {
      reach: 0,
      impressions: 0,
      likes: 0,
      comments: 0,
      followers: 0,
      profile_views: 0,
      engagement_rate: 0,
      accounts: 0,
    },
    totals: {
      followers: 0,
      accounts: 0,
      reach: 0,
      impressions: 0,
      likes: 0,
      comments: 0,
      engagement_rate: 0,
    },
    by_platform: Object.fromEntries(
      PLATFORMS.map((p) => [
        p,
        { connected: false, followers: 0, handle: null, display_name: null, avatar_url: null },
      ])
    ),
    accounts: [],
    media: [],
    hashtags: [],
    insights: null,
    instagram: null,
    demographics: null,
  };
}

/** Pull #tags from captions and rank by usage + engagement proxy. */
function extractHashtags(
  media: Array<{
    caption?: string | null;
    like_count?: number | null;
    comments_count?: number | null;
  }>
) {
  const map = new Map<
    string,
    { tag: string; posts: number; likes: number; comments: number }
  >();
  for (const item of media) {
    const caption = item.caption || '';
    const matches = caption.match(/#[\p{L}\p{N}_]+/gu) || [];
    const unique = [...new Set(matches.map((m) => m.toLowerCase()))];
    for (const raw of unique) {
      const tag = raw.startsWith('#') ? raw : `#${raw}`;
      const prev = map.get(tag) || { tag, posts: 0, likes: 0, comments: 0 };
      prev.posts += 1;
      prev.likes += item.like_count ?? 0;
      prev.comments += item.comments_count ?? 0;
      map.set(tag, prev);
    }
  }
  return [...map.values()]
    .map((h) => {
      const reach = Math.max(h.likes + h.comments, h.likes * 8, h.posts);
      const er =
        reach > 0
          ? Math.round(((h.likes + h.comments) / reach) * 1000) / 10
          : 0;
      return { tag: h.tag, posts: h.posts, reach, er, trend: 0 };
    })
    .sort((a, b) => b.posts - a.posts || b.reach - a.reach)
    .slice(0, 40);
}

export async function GET(request: Request) {
  let workspaceId: string | null = null;
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return Response.json(
        { error: 'Unauthorized', ...onboardingFallback('unauthorized') },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const jar = await cookies();
    workspaceId =
      url.searchParams.get('workspaceId')?.trim() ||
      request.headers.get('x-workspace-id')?.trim() ||
      request.headers.get('x-active-workspace-id')?.trim() ||
      jar.get(ACTIVE_WORKSPACE_COOKIE)?.value ||
      jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value ||
      null;

    // Strict workspace scope — never mix another brand's API connections.
    const accounts = await listLiveSocialAccountsForUser({
      userId: session.user.id,
      workspaceId,
    });
    const connected = accounts.filter((a) => a.connected);

    if (connected.length === 0) {
      console.warn(
        '[Analytics API] No social accounts for workspace. Returning onboarding fallback.',
        { workspaceId, userId: session.user.id }
      );
      return Response.json(onboardingFallback('no_social_accounts', workspaceId));
    }

    const range = parseAnalyticsRange(
      url.searchParams.get('from'),
      url.searchParams.get('to')
    );

    let snapshot = getMetaSyncSnapshot(session.user.id);
    const hasIg = connected.some((a) => a.platform === 'instagram');

    if (hasIg && !snapshot) {
      try {
        snapshot = await syncMetaDataForUser(session.user.id);
      } catch (error) {
        console.warn(
          '[Analytics API] Meta sync failed — returning account shells without Graph metrics.',
          error
        );
      }
    }

    const followersFromAccounts = connected.reduce(
      (sum, a) => sum + (Number(a.follower_count) || 0),
      0
    );

    let insights: {
      reach: number;
      impressions: number;
      likes: number;
      comments: number;
      shares?: number;
      saves?: number;
      followers: number;
      profile_views: number;
    } = snapshot?.insights ?? {
      reach: 0,
      impressions: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      followers:
        connected.find((a) => a.platform === 'instagram')?.follower_count ?? 0,
      profile_views: 0,
    };

    // Prefer summed workspace followers across all APIs; fall back to IG insights.
    const totalFollowers =
      followersFromAccounts > 0
        ? followersFromAccounts
        : insights.followers || 0;

    const by_platform: Record<
      PlatformKey,
      {
        connected: boolean;
        followers: number;
        handle: string | null;
        display_name: string | null;
        avatar_url: string | null;
      }
    > = Object.fromEntries(
      PLATFORMS.map((p) => {
        const row = connected.find((a) => a.platform === p);
        return [
          p,
          {
            connected: Boolean(row),
            followers: Number(row?.follower_count) || 0,
            handle: row?.handle ?? null,
            display_name: row?.display_name ?? null,
            avatar_url: row?.avatar_url ?? null,
          },
        ];
      })
    ) as Record<
      PlatformKey,
      {
        connected: boolean;
        followers: number;
        handle: string | null;
        display_name: string | null;
        avatar_url: string | null;
      }
    >;

    // Prefer live IG snapshot followers when available.
    if (snapshot?.instagram?.followers_count != null && by_platform.instagram.connected) {
      by_platform.instagram.followers = snapshot.instagram.followers_count;
      by_platform.instagram.handle =
        snapshot.instagram.username
          ? `@${snapshot.instagram.username.replace(/^@/, '')}`
          : by_platform.instagram.handle;
      by_platform.instagram.display_name =
        snapshot.instagram.name || by_platform.instagram.display_name;
      by_platform.instagram.avatar_url =
        snapshot.instagram.profile_picture_url || by_platform.instagram.avatar_url;
    }

    // Posts / Reels + audience demographics: run in parallel (independent APIs).
    let media: AnalyticsMediaItem[] = (snapshot?.media ?? []).map((item) => ({
      id: item.id.startsWith('instagram:') ? item.id : `instagram:${item.id}`,
      platform: 'instagram' as const,
      caption: item.caption ?? null,
      media_type: item.media_type ?? null,
      media_url: item.media_url ?? null,
      thumbnail_url: item.thumbnail_url ?? item.media_url ?? null,
      permalink: item.permalink ?? null,
      like_count: item.like_count ?? 0,
      comments_count: item.comments_count ?? 0,
      shares_count: 0,
      view_count: null as number | null,
      timestamp: item.timestamp ?? null,
    }));
    let demographics = null as Awaited<
      ReturnType<typeof fetchMultiPlatformDemographics>
    > | null;

    if (workspaceId) {
      const [mediaResult, demoResult, periodResult] = await Promise.all([
        fetchMultiPlatformMedia({
          userId: session.user.id,
          workspaceId,
          instagramMedia: snapshot?.media ?? null,
        }).catch((error) => {
          console.warn('[Analytics API] multi-platform media failed', error);
          return null;
        }),
        fetchMultiPlatformDemographics({
          userId: session.user.id,
          workspaceId,
        }).catch((error) => {
          console.warn('[Analytics API] multi-platform demographics failed', error);
          return null;
        }),
        fetchWorkspacePeriodInsights({
          userId: session.user.id,
          workspaceId,
          from: range.from,
          to: range.to,
        }).catch((error) => {
          console.warn('[Analytics API] period insights failed', error);
          return null;
        }),
      ]);
      if (mediaResult) media = mediaResult;
      demographics =
        demoResult ??
        ((snapshot?.demographics as typeof demographics) ?? null);
      if (periodResult) {
        insights = {
          reach: periodResult.reach,
          impressions: periodResult.impressions,
          likes: periodResult.likes,
          comments: periodResult.comments,
          shares: periodResult.shares,
          saves: periodResult.saves,
          followers:
            connected.find((a) => a.platform === 'instagram')?.follower_count ??
            insights.followers ??
            0,
          profile_views: periodResult.profile_views,
        };
      }
    }

    const hashtags = extractHashtags(media);

    // Account insights = activity during the range (incl. older content).
    // Media rollup = posts published in-range (TikTok views / IG likes fallback).
    const rangedMedia = media.filter((item) =>
      isIsoInRange(item.timestamp, range.from, range.to)
    );
    const mediaTotals = aggregateMediaMetrics(rangedMedia);
    const likes =
      (insights.likes || 0) > 0 ? insights.likes : mediaTotals.likes;
    const comments =
      (insights.comments || 0) > 0 ? insights.comments : mediaTotals.comments;
    const shares =
      (insights.shares || 0) > 0 ? insights.shares! : mediaTotals.shares;
    const saves = insights.saves || 0;
    const impressions =
      (insights.impressions || 0) > 0
        ? insights.impressions
        : mediaTotals.views;
    const reach =
      (insights.reach || 0) > 0 ? insights.reach : impressions;
    const engagementTotal = likes + comments + shares + saves;
    const engagementRate =
      reach > 0
        ? Math.round((engagementTotal / reach) * 1000) / 10
        : 0;

    const metrics = {
      reach,
      impressions,
      likes,
      comments,
      shares,
      saves,
      followers: totalFollowers,
      profile_views: insights.profile_views || 0,
      engagement_rate: engagementRate,
      accounts: connected.length,
    };

    return Response.json({
      ok: true,
      source: snapshot ? 'workspace_meta_sync' : 'workspace_social_accounts',
      connected: true,
      workspace_id: workspaceId,
      range,
      accounts: connected.map((a) => ({
        platform: a.platform,
        handle: a.handle,
        display_name: a.display_name,
        avatar_url: a.avatar_url,
        follower_count: a.follower_count,
        connected: true,
      })),
      by_platform,
      metrics,
      totals: {
        followers: totalFollowers,
        accounts: connected.length,
        reach: metrics.reach,
        impressions: metrics.impressions,
        likes: metrics.likes,
        comments: metrics.comments,
        shares: metrics.shares,
        saves: metrics.saves,
        engagement_rate: metrics.engagement_rate,
      },
      insights,
      instagram: snapshot?.instagram ?? null,
      demographics,
      media,
      hashtags,
      synced_at: snapshot?.synced_at ?? null,
      planner_imported: snapshot?.planner_imported ?? 0,
      message: media.length
        ? null
        : hasIg
          ? 'Accounts connected. Instagram Graph insights pending — reconnect or open Social settings to sync.'
          : 'Accounts connected. Posts pull from Instagram, Facebook Page, and TikTok when those APIs return media.',
      cta: snapshot
        ? null
        : {
            label: 'Open Social settings',
            href: '/admin/settings/socials',
          },
    });
  } catch (error) {
    console.warn(
      '[Analytics API] Error — returning onboarding fallback.',
      error
    );
    return Response.json(onboardingFallback('analytics_error', workspaceId));
  }
}

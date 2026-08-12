/**
 * GET /api/analytics
 * Aggregates connected social_accounts + Meta sync insights for the Analytics UI.
 * Never 500s on empty accounts — returns a structured onboarding fallback instead.
 */

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { listLiveSocialAccountsForUser } from '@/lib/social/persist';
import {
  getMetaSyncSnapshot,
  syncMetaDataForUser,
} from '@/lib/meta/sync';

function onboardingFallback(reason: string) {
  return {
    ok: true,
    source: 'onboarding_fallback',
    connected: false,
    reason,
    message:
      'No connected social accounts found. Connect Instagram, Facebook, YouTube, or LinkedIn under Settings → Socials to load live analytics.',
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
      engagement_rate: 0,
    },
    accounts: [],
    media: [],
    insights: null,
    instagram: null,
  };
}

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return Response.json(
        { error: 'Unauthorized', ...onboardingFallback('unauthorized') },
        { status: 401 }
      );
    }

    const accounts = await listLiveSocialAccountsForUser({
      userId: session.user.id,
    });
    const connected = accounts.filter((a) => a.connected);

    if (connected.length === 0) {
      console.warn(
        '[Analytics API] No social accounts found for user. Returning onboarding fallback data.'
      );
      return Response.json(onboardingFallback('no_social_accounts'));
    }

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

    if (!snapshot && hasIg) {
      console.warn(
        '[Analytics API] No social accounts metrics available after sync. Returning onboarding fallback data.'
      );
    }

    const insights = snapshot?.insights ?? {
      reach: 0,
      impressions: 0,
      likes: 0,
      comments: 0,
      followers:
        connected.find((a) => a.platform === 'instagram')?.follower_count ?? 0,
      profile_views: 0,
    };

    const engagementTotal = (insights.likes || 0) + (insights.comments || 0);
    const reach = insights.reach || 0;

    return Response.json({
      ok: true,
      source: snapshot ? 'meta_sync' : 'social_accounts',
      connected: true,
      accounts: connected.map((a) => ({
        platform: a.platform,
        handle: a.handle,
        display_name: a.display_name,
        avatar_url: a.avatar_url,
        follower_count: a.follower_count,
        connected: true,
      })),
      metrics: {
        reach,
        impressions: insights.impressions || 0,
        likes: insights.likes || 0,
        comments: insights.comments || 0,
        followers: insights.followers || 0,
        engagement_rate:
          reach > 0
            ? Math.round((engagementTotal / reach) * 1000) / 10
            : 0,
      },
      insights,
      instagram: snapshot?.instagram ?? null,
      media: snapshot?.media ?? [],
      synced_at: snapshot?.synced_at ?? null,
      message: snapshot
        ? null
        : 'Accounts connected. Open Instagram sync or reconnect to pull Graph insights.',
      cta: snapshot
        ? null
        : {
            label: 'Open Social settings',
            href: '/admin/settings/socials',
          },
    });
  } catch (error) {
    console.warn(
      '[Analytics API] No social accounts found for user. Returning onboarding fallback data.',
      error
    );
    return Response.json(onboardingFallback('analytics_error'));
  }
}

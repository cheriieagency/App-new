/**
 * Account-level Instagram + Facebook insights for a calendar range.
 * Reach/views here include people seeing older content — not only posts published in-range.
 */

import { loadWorkspaceSocialTokens } from '@/lib/analytics/workspace-tokens';
import { chunkDateRange } from '@/lib/analytics/period';
import {
  fetchFacebookPageInsights,
  fetchInstagramInsights,
} from '@/lib/meta/graph-api';

export type PeriodInsightTotals = {
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  profile_views: number;
};

function emptyTotals(): PeriodInsightTotals {
  return {
    reach: 0,
    impressions: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    profile_views: 0,
  };
}

export async function fetchWorkspacePeriodInsights(input: {
  userId: string;
  workspaceId: string;
  from: string;
  to: string;
}): Promise<PeriodInsightTotals> {
  const tokens = await loadWorkspaceSocialTokens({
    userId: input.userId,
    workspaceId: input.workspaceId,
  });
  const ig = tokens.find((row) => row.platform === 'instagram');
  const fb = tokens.find((row) => row.platform === 'facebook');
  const totals = emptyTotals();
  const chunks = chunkDateRange(input.from, input.to);

  for (const chunk of chunks) {
    const jobs: Array<Promise<void>> = [];

    if (ig?.access_token && ig.platform_user_id) {
      jobs.push(
        (async () => {
          try {
            const row = await fetchInstagramInsights(
              ig.platform_user_id!,
              ig.access_token!,
              chunk
            );
            totals.reach += Number(row.reach) || 0;
            totals.impressions += Number(row.impressions) || 0;
            totals.likes += Number(row.likes) || 0;
            totals.comments += Number(row.comments) || 0;
            totals.shares += Number(row.shares) || 0;
            totals.saves += Number(row.saves) || 0;
            totals.profile_views += Number(row.profile_views) || 0;
          } catch (error) {
            console.warn('[analytics] Instagram period insights failed', error);
          }
        })()
      );
    }

    const pageId = fb?.page_id || fb?.platform_user_id;
    if (fb?.access_token && pageId) {
      jobs.push(
        (async () => {
          try {
            const row = await fetchFacebookPageInsights(
              pageId,
              fb.access_token!,
              chunk
            );
            totals.reach += Number(row.reach) || 0;
            totals.impressions += Number(row.impressions) || 0;
          } catch (error) {
            console.warn('[analytics] Facebook period insights failed', error);
          }
        })()
      );
    }

    await Promise.all(jobs);
  }

  return totals;
}

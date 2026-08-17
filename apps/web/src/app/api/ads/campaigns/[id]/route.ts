/**
 * PATCH /api/ads/campaigns/[id]
 * — Pause / activate campaign, or update daily budget via Meta Marketing API.
 * Demo campaigns (`demo-*`) update locally only.
 */

import { requireApiSession } from '@/lib/auth/require-api-session';
import { isDemoAdsId } from '@/lib/ads/demo-seed';
import {
  updateLocalCampaignBudget,
  updateLocalCampaignStatus,
} from '@/lib/ads/persist';
import {
  loadMetaAdsAccessToken,
  resolveAdsWorkspaceId,
} from '@/lib/ads/sync';
import {
  budgetMajorToMinor,
  updateMetaCampaignDailyBudget,
  updateMetaCampaignStatus,
} from '@/lib/meta/marketing-api';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  if (!process.env.DATABASE_URL?.trim()) {
    // Offline demo: accept optimistic UI without persistence.
    const { id: campaignId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      status?: string;
      daily_budget?: number;
      dailyBudget?: number;
    };
    return Response.json({
      ok: true,
      demo: true,
      campaign: {
        id: campaignId,
        status: body.status?.toUpperCase() || 'ACTIVE',
        daily_budget:
          typeof body.daily_budget === 'number'
            ? body.daily_budget
            : typeof body.dailyBudget === 'number'
              ? body.dailyBudget
              : 0,
      },
    });
  }

  const { id: campaignId } = await context.params;
  if (!campaignId?.trim()) {
    return Response.json({ error: 'campaign_required' }, { status: 400 });
  }

  try {
    const body = (await request.json()) as {
      workspaceId?: string;
      status?: string;
      daily_budget?: number;
      dailyBudget?: number;
    };
    const workspaceId = await resolveAdsWorkspaceId(
      request,
      body.workspaceId ?? null
    );
    if (!workspaceId) {
      return Response.json(
        { error: 'workspace_required', message: 'workspaceId required' },
        { status: 400 }
      );
    }

    const demo = isDemoAdsId(campaignId);
    const token = demo
      ? null
      : await loadMetaAdsAccessToken({
          userId: session.user.id,
          workspaceId,
        });

    if (!demo && !token) {
      return Response.json(
        {
          error: 'meta_not_connected',
          message: 'Connect Facebook with ads permissions to manage campaigns.',
        },
        { status: 400 }
      );
    }

    const statusRaw = body.status?.trim().toUpperCase();
    const budgetMajor =
      typeof body.daily_budget === 'number'
        ? body.daily_budget
        : typeof body.dailyBudget === 'number'
          ? body.dailyBudget
          : null;

    if (statusRaw === 'ACTIVE' || statusRaw === 'PAUSED') {
      if (!demo && token) {
        await updateMetaCampaignStatus(
          campaignId,
          token.accessToken,
          statusRaw
        );
      }
      const campaign = await updateLocalCampaignStatus({
        workspaceId,
        userId: session.user.id,
        campaignId,
        status: statusRaw,
      });
      return Response.json({ ok: true, demo, campaign });
    }

    if (budgetMajor != null && Number.isFinite(budgetMajor)) {
      if (!demo && token) {
        const minor = budgetMajorToMinor(budgetMajor);
        await updateMetaCampaignDailyBudget(
          campaignId,
          token.accessToken,
          minor
        );
      }
      const campaign = await updateLocalCampaignBudget({
        workspaceId,
        userId: session.user.id,
        campaignId,
        dailyBudget: budgetMajor,
      });
      return Response.json({ ok: true, demo, campaign });
    }

    return Response.json(
      {
        error: 'invalid_patch',
        message: 'Provide status (ACTIVE|PAUSED) or daily_budget.',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('[PATCH /api/ads/campaigns/[id]]', error);
    return Response.json(
      {
        ok: false,
        error: 'update_failed',
        message:
          error instanceof Error ? error.message : 'Failed to update campaign',
      },
      { status: 500 }
    );
  }
}

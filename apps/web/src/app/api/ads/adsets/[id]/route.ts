/**
 * PATCH /api/ads/adsets/[id] — pause/activate or update daily budget.
 */

import { requireApiSession } from '@/lib/auth/require-api-session';
import { isDemoAdsId } from '@/lib/ads/demo-seed';
import {
  updateLocalAdSetBudget,
  updateLocalAdSetStatus,
} from '@/lib/ads/persist';
import {
  loadMetaAdsAccessToken,
  resolveAdsWorkspaceId,
} from '@/lib/ads/sync';
import {
  budgetMajorToMinor,
  updateMetaObjectDailyBudget,
  updateMetaObjectStatus,
} from '@/lib/meta/marketing-api';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  const { id: adsetId } = await context.params;
  if (!adsetId?.trim()) {
    return Response.json({ error: 'adset_required' }, { status: 400 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    const body = (await request.json().catch(() => ({}))) as {
      status?: string;
      daily_budget?: number;
    };
    return Response.json({
      ok: true,
      demo: true,
      adset: {
        id: adsetId,
        status: body.status?.toUpperCase() || 'ACTIVE',
        daily_budget: body.daily_budget ?? 0,
      },
    });
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

    const demo = isDemoAdsId(adsetId);
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
          message: 'Connect Facebook with ads permissions to manage ad sets.',
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
        await updateMetaObjectStatus(adsetId, token.accessToken, statusRaw);
      }
      const adset = await updateLocalAdSetStatus({
        workspaceId,
        userId: session.user.id,
        adsetId,
        status: statusRaw,
      });
      return Response.json({ ok: true, demo, adset });
    }

    if (budgetMajor != null && Number.isFinite(budgetMajor)) {
      if (!demo && token) {
        await updateMetaObjectDailyBudget(
          adsetId,
          token.accessToken,
          budgetMajorToMinor(budgetMajor)
        );
      }
      const adset = await updateLocalAdSetBudget({
        workspaceId,
        userId: session.user.id,
        adsetId,
        dailyBudget: budgetMajor,
      });
      return Response.json({ ok: true, demo, adset });
    }

    return Response.json(
      {
        error: 'invalid_patch',
        message: 'Provide status (ACTIVE|PAUSED) or daily_budget.',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('[PATCH /api/ads/adsets/[id]]', error);
    return Response.json(
      {
        ok: false,
        error: 'update_failed',
        message:
          error instanceof Error ? error.message : 'Failed to update ad set',
      },
      { status: 500 }
    );
  }
}

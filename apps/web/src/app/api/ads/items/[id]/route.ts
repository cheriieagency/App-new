/**
 * PATCH /api/ads/items/[id] — pause/activate an individual Meta ad.
 * (Path avoids Next.js reserved `ads` segment collision with the parent router.)
 */

import { requireApiSession } from '@/lib/auth/require-api-session';
import { isDemoAdsId } from '@/lib/ads/demo-seed';
import { updateLocalAdStatus } from '@/lib/ads/persist';
import {
  loadMetaAdsAccessToken,
  resolveAdsWorkspaceId,
} from '@/lib/ads/sync';
import { updateMetaObjectStatus } from '@/lib/meta/marketing-api';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  const { id: adId } = await context.params;
  if (!adId?.trim()) {
    return Response.json({ error: 'ad_required' }, { status: 400 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json(
      {
        ok: false,
        demo: false,
        error: 'database_required',
        message: 'DATABASE_URL is required to update Meta ads.',
      },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as {
      workspaceId?: string;
      status?: string;
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

    const statusRaw = body.status?.trim().toUpperCase();
    if (statusRaw !== 'ACTIVE' && statusRaw !== 'PAUSED') {
      return Response.json(
        {
          error: 'invalid_patch',
          message: 'Provide status (ACTIVE|PAUSED).',
        },
        { status: 400 }
      );
    }

    const demo = isDemoAdsId(adId);
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
          message: 'Connect Facebook with ads permissions to manage ads.',
        },
        { status: 400 }
      );
    }

    if (!demo && token) {
      await updateMetaObjectStatus(adId, token.accessToken, statusRaw);
    }

    const ad = await updateLocalAdStatus({
      workspaceId,
      userId: session.user.id,
      adId,
      status: statusRaw,
    });
    return Response.json({ ok: true, demo, ad });
  } catch (error) {
    console.error('[PATCH /api/ads/items/[id]]', error);
    return Response.json(
      {
        ok: false,
        error: 'update_failed',
        message: error instanceof Error ? error.message : 'Failed to update ad',
      },
      { status: 500 }
    );
  }
}

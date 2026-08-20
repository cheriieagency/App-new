/**
 * POST /api/auth/tiktok/disconnect
 * Disconnect TikTok Profile (`platform: tiktok`) and/or Business (`tiktok_business`)
 * independently. Body: { workspaceId, kind?: 'profile' | 'business' | 'all', accountId? }
 */

import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { deleteSocialAccountRow } from '@/lib/social/persist';
import { deleteTikTokTokenForWorkspace } from '@/lib/tiktok/tokens-persist';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
} from '@/lib/social/oauth-workspace';

type DisconnectKind = 'profile' | 'business' | 'all';

function resolveKind(raw: unknown): DisconnectKind {
  const v = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (v === 'profile' || v === 'login_kit' || v === 'posting') return 'profile';
  if (v === 'business' || v === 'biz' || v === 'ads') return 'business';
  return 'all';
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const jar = await cookies();
  const workspaceId =
    (typeof body.workspaceId === 'string' && body.workspaceId.trim()) ||
    (typeof body.workspace_id === 'string' && body.workspace_id.trim()) ||
    jar.get(ACTIVE_WORKSPACE_COOKIE)?.value?.trim() ||
    jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value?.trim() ||
    null;

  const accountId =
    (typeof body.accountId === 'string' && body.accountId.trim()) ||
    (typeof body.account_id === 'string' && body.account_id.trim()) ||
    null;

  const platformUserId =
    (typeof body.platformUserId === 'string' && body.platformUserId.trim()) ||
    (typeof body.platform_user_id === 'string' &&
      body.platform_user_id.trim()) ||
    null;

  const kind = resolveKind(body.kind ?? body.connection ?? body.flow);
  const platformHint =
    typeof body.platform === 'string' ? body.platform.trim().toLowerCase() : '';

  const effectiveKind: DisconnectKind =
    platformHint === 'tiktok_business'
      ? 'business'
      : platformHint === 'tiktok'
        ? 'profile'
        : kind;

  if (!workspaceId && !accountId && !platformUserId) {
    return NextResponse.json(
      { error: 'workspaceId, accountId, or platformUserId required' },
      { status: 400 }
    );
  }

  try {
    const platforms: Array<'tiktok' | 'tiktok_business'> =
      effectiveKind === 'profile'
        ? ['tiktok']
        : effectiveKind === 'business'
          ? ['tiktok_business']
          : ['tiktok', 'tiktok_business'];

    const deletedIds: string[] = [];
    let anyDeleted = false;

    for (const platform of platforms) {
      const result = await deleteSocialAccountRow({
        userId: session.user.id,
        accountId: platforms.length === 1 ? accountId : null,
        platform,
        platformUserId: platforms.length === 1 ? platformUserId : null,
        workspaceId,
        preferWorkspaceScoped: Boolean(workspaceId),
      });
      if (result.deleted) {
        anyDeleted = true;
        deletedIds.push(...(result.deletedIds || []));
      }
    }

    if (workspaceId) {
      try {
        if (effectiveKind === 'profile') {
          await deleteTikTokTokenForWorkspace({
            workspaceId,
            userId: session.user.id,
            tokenSource: 'login_kit',
          });
        } else if (effectiveKind === 'business') {
          await deleteTikTokTokenForWorkspace({
            workspaceId,
            userId: session.user.id,
            tokenSource: 'business',
          });
        } else {
          await deleteTikTokTokenForWorkspace({
            workspaceId,
            userId: session.user.id,
          });
        }
      } catch (tokenError) {
        console.warn('[tiktok/disconnect] tiktok_tokens delete skipped', tokenError);
      }
    }

    return NextResponse.json({
      success: true,
      message: anyDeleted
        ? 'Account disconnected successfully'
        : 'Account already disconnected',
      ok: true,
      deleted: anyDeleted,
      deletedIds,
      platform: effectiveKind === 'business' ? 'tiktok_business' : 'tiktok',
      kind: effectiveKind,
      workspaceId,
    });
  } catch (error) {
    console.error('[tiktok/disconnect]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}

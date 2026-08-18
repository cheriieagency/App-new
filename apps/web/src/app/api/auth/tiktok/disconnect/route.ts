/**
 * POST /api/auth/tiktok/disconnect
 * Deletes the TikTok social_accounts row for session.user.id + active workspace.
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

  if (!workspaceId && !accountId && !platformUserId) {
    return NextResponse.json(
      { error: 'workspaceId, accountId, or platformUserId required' },
      { status: 400 }
    );
  }

  try {
    const result = await deleteSocialAccountRow({
      userId: session.user.id,
      accountId,
      platform: 'tiktok',
      platformUserId,
      workspaceId,
      preferWorkspaceScoped: Boolean(workspaceId),
    });

    if (workspaceId) {
      try {
        await deleteTikTokTokenForWorkspace({
          workspaceId,
          userId: session.user.id,
        });
      } catch (tokenError) {
        console.warn('[tiktok/disconnect] tiktok_tokens delete skipped', tokenError);
      }
    }

    // Already disconnected is success for the UI.
    if (!result.deleted) {
      return NextResponse.json({
        success: true,
        message: 'Account already disconnected',
        deleted: false,
        platform: 'tiktok',
        workspaceId,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Account disconnected successfully',
      ok: true,
      deleted: true,
      deletedIds: result.deletedIds,
      platform: 'tiktok',
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

/**
 * POST /api/auth/meta/disconnect
 * Meta-specific alias — same ownership rules as /api/auth/disconnect.
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { deleteSocialAccountRow } from '@/lib/social/persist';

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const platform = String(body.platform ?? '');
  const platformUserId =
    typeof body.platformUserId === 'string'
      ? body.platformUserId.trim()
      : typeof body.platform_user_id === 'string'
        ? body.platform_user_id.trim()
        : '';
  const accountId =
    typeof body.accountId === 'string'
      ? body.accountId.trim()
      : typeof body.account_id === 'string'
        ? body.account_id.trim()
        : '';
  const workspaceId =
    typeof body.workspaceId === 'string'
      ? body.workspaceId.trim()
      : typeof body.workspace_id === 'string'
        ? body.workspace_id.trim()
        : '';

  if (
    !accountId &&
    platform !== 'instagram' &&
    platform !== 'facebook'
  ) {
    return NextResponse.json(
      { error: 'platform must be instagram or facebook (or provide accountId)' },
      { status: 400 }
    );
  }

  try {
    const result = await deleteSocialAccountRow({
      userId: session.user.id,
      accountId: accountId || null,
      platform:
        platform === 'instagram' || platform === 'facebook'
          ? platform
          : null,
      platformUserId: platformUserId || null,
      workspaceId: workspaceId || null,
    });

    if (!result.deleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Account not found or already disconnected',
          deleted: false,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Account disconnected successfully',
      ok: true,
      deleted: true,
      deletedIds: result.deletedIds,
      platform: platform || null,
      platformUserId: platformUserId || null,
      accountId: accountId || null,
    });
  } catch (error) {
    console.error('[meta/disconnect]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/disconnect
 * Soft-disconnect a social_accounts row for the authenticated user.
 * Tokens are cleared; profile identity stays so reconnect restores the same slot.
 * Posts, projects, media, and other workspace data are never deleted.
 *
 * Accepts JSON body OR query string:
 *   accountId | platform + platformUserId | platform + workspaceId
 *
 * Always scopes the update with user_id = session.user.id.
 * For TikTok, prefers exact (user_id, platform=tiktok, workspace_id) matching.
 */

import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  deleteSocialAccountRow,
  type PersistablePlatform,
} from '@/lib/social/persist';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
} from '@/lib/social/oauth-workspace';

const ALLOWED: PersistablePlatform[] = [
  'youtube',
  'linkedin',
  'tiktok',
  'instagram',
  'facebook',
  'pinterest',
  'google',
];

type DisconnectParams = {
  accountId: string | null;
  platform: string | null;
  platformUserId: string | null;
  workspaceId: string | null;
};

function readParams(
  body: Record<string, unknown> | null,
  url: URL
): DisconnectParams {
  const fromBody = (key: string): string | null => {
    if (!body) return null;
    const v = body[key];
    return typeof v === 'string' && v.trim() ? v.trim() : null;
  };
  const fromQuery = (key: string): string | null => {
    const v = url.searchParams.get(key);
    return v?.trim() || null;
  };

  return {
    accountId:
      fromBody('accountId') ||
      fromBody('account_id') ||
      fromBody('id') ||
      fromQuery('accountId') ||
      fromQuery('account_id') ||
      fromQuery('id'),
    platform: fromBody('platform') || fromQuery('platform'),
    platformUserId:
      fromBody('platformUserId') ||
      fromBody('platform_user_id') ||
      fromBody('external_id') ||
      fromBody('externalId') ||
      fromQuery('platformUserId') ||
      fromQuery('platform_user_id'),
    workspaceId:
      fromBody('workspaceId') ||
      fromBody('workspace_id') ||
      fromQuery('workspaceId') ||
      fromQuery('workspace_id'),
  };
}

async function resolveActiveWorkspaceId(
  preferred: string | null
): Promise<string | null> {
  if (preferred?.trim()) return preferred.trim();
  const jar = await cookies();
  return (
    jar.get(ACTIVE_WORKSPACE_COOKIE)?.value?.trim() ||
    jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value?.trim() ||
    null
  );
}

async function handleDisconnect(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  const sessionUser = session?.user;
  if (!sessionUser?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  let body: Record<string, unknown> | null = null;
  if (request.method !== 'GET') {
    try {
      const raw = await request.json();
      if (raw && typeof raw === 'object') {
        body = raw as Record<string, unknown>;
      }
    } catch {
      body = null;
    }
  }

  const params = readParams(body, url);
  const platform = params.platform;

  if (
    !params.accountId &&
    !(platform && ALLOWED.includes(platform as PersistablePlatform))
  ) {
    return NextResponse.json(
      {
        error:
          'Provide accountId, or platform (instagram|facebook|tiktok|youtube|linkedin|pinterest|google) with platformUserId or workspaceId',
      },
      { status: 400 }
    );
  }

  if (
    platform &&
    !ALLOWED.includes(platform as PersistablePlatform) &&
    !params.accountId
  ) {
    return NextResponse.json(
      {
        error:
          'platform must be youtube, linkedin, tiktok, instagram, facebook, pinterest, or google',
      },
      { status: 400 }
    );
  }

  const p = (platform as PersistablePlatform | null) ?? null;
  // TikTok (and others): bind disconnect to active workspace cookie when omitted.
  const workspaceId = await resolveActiveWorkspaceId(params.workspaceId);

  try {
    const result = await deleteSocialAccountRow({
      userId: sessionUser.id,
      accountId: params.accountId,
      platform: p,
      platformUserId: params.platformUserId,
      workspaceId,
      // TikTok: prefer exact workspace-scoped row delete before broader fallbacks.
      preferWorkspaceScoped: p === 'tiktok',
    });

    if (!result.deleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Account not found or already disconnected',
          deleted: false,
          platform: p,
          accountId: params.accountId,
          workspaceId,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        'Account disconnected. Your content stays on your clikd: account — reconnect anytime to publish again.',
      ok: true,
      deleted: true,
      disconnected: true,
      deletedIds: result.deletedIds,
      platform: p,
      platformUserId: params.platformUserId,
      accountId: params.accountId,
      workspaceId,
    });
  } catch (error) {
    console.error('[auth/disconnect]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return handleDisconnect(request);
}

export async function DELETE(request: Request) {
  return handleDisconnect(request);
}

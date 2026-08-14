/**
 * GET /api/socials/accounts
 * Live social_accounts for the authenticated user only.
 */

import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
  listLiveSocialAccountsForUser,
  SOCIAL_PLATFORMS,
} from '@/lib/social/persist';
import { resolveStrictUserWorkspace } from '@/lib/social/resolve-user-workspace';
import type { ConnectedSocialAccount } from '@/lib/mock-content-planner';

function emptyAccounts(): ConnectedSocialAccount[] {
  return SOCIAL_PLATFORMS.map((platform) => ({
    platform,
    connected: false,
    handle: null,
    display_name: null,
    avatar_url: null,
    connected_at: null,
  }));
}

function okPayload(
  accounts: ConnectedSocialAccount[],
  workspaceId: string | null,
  extra?: Record<string, unknown>
) {
  const connected = accounts.filter((a) => a.connected);
  const hasIg = connected.some((a) => a.platform === 'instagram');
  const hasFb = connected.some((a) => a.platform === 'facebook');
  return {
    accounts,
    connected_count: connected.length,
    meta_connected: hasIg || hasFb,
    needs_ig_business: hasFb && !hasIg,
    workspace_id: workspaceId,
    source: 'social_accounts',
    ...extra,
  };
}

export async function GET(request: Request) {
  try {
    let session: Awaited<ReturnType<typeof auth.api.getSession>> = null;
    try {
      session = await auth.api.getSession({ headers: await headers() });
    } catch (error) {
      console.warn('[socials/accounts] session read failed', error);
    }

    const userId = session?.user?.id?.trim();
    if (!userId) {
      return Response.json(
        okPayload(emptyAccounts(), null, { error: 'Unauthorized' }),
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const jar = await cookies();
    const preferredWorkspaceId =
      url.searchParams.get('workspaceId')?.trim() ||
      request.headers.get('x-workspace-id')?.trim() ||
      request.headers.get('x-active-workspace-id')?.trim() ||
      jar.get(ACTIVE_WORKSPACE_COOKIE)?.value ||
      jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value ||
      null;

    let workspaceId: string | null = preferredWorkspaceId;
    try {
      const access = await resolveStrictUserWorkspace({
        userId,
        preferredWorkspaceId,
        email: session?.user?.email ?? null,
      });
      if (access.ok) {
        workspaceId = access.workspaceId;
      } else {
        console.warn(
          '[socials/accounts] workspace resolve soft-fail',
          access.error
        );
      }
    } catch (error) {
      console.warn('[socials/accounts] workspace resolve threw', error);
    }

    let accounts: ConnectedSocialAccount[] = emptyAccounts();
    try {
      accounts = await listLiveSocialAccountsForUser({
        userId,
        workspaceId,
      });
    } catch (error) {
      console.warn('[socials/accounts] list failed', error);
      accounts = emptyAccounts();
    }

    return Response.json(okPayload(accounts, workspaceId));
  } catch (error) {
    console.error('[socials/accounts]', error);
    return Response.json(
      okPayload(emptyAccounts(), null, { error: 'failed' }),
      { status: 500 }
    );
  }
}

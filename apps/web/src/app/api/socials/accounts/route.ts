/**
 * GET /api/socials/accounts
 * Live social_accounts for the authenticated user + active workspace.
 * Prefers the client-provided workspace id so Connected UI matches the sidebar.
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
    id: null,
    platform_user_id: null,
    workspace_id: null,
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
    connected_platforms: connected.map((a) => a.platform),
    source: 'social_accounts',
    ...extra,
  };
}

function hasAnyConnected(accounts: ConnectedSocialAccount[]): boolean {
  return accounts.some((a) => a.connected);
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

    // 1) Prefer exact active workspace from UI — matches where OAuth bound rows.
    let workspaceId: string | null = preferredWorkspaceId;
    let accounts: ConnectedSocialAccount[] = emptyAccounts();

    if (preferredWorkspaceId) {
      try {
        accounts = await listLiveSocialAccountsForUser({
          userId,
          workspaceId: preferredWorkspaceId,
        });
      } catch (error) {
        console.warn('[socials/accounts] preferred list failed', error);
      }
    }

    // 2) If preferred workspace has no connections, resolve owned workspace and retry.
    if (!hasAnyConnected(accounts)) {
      try {
        const access = await resolveStrictUserWorkspace({
          userId,
          preferredWorkspaceId,
          email: session?.user?.email ?? null,
        });
        if (access.ok) {
          workspaceId = access.workspaceId;
          if (access.workspaceId !== preferredWorkspaceId) {
            accounts = await listLiveSocialAccountsForUser({
              userId,
              workspaceId: access.workspaceId,
            });
          }
        }
      } catch (error) {
        console.warn('[socials/accounts] workspace resolve threw', error);
      }
    } else {
      workspaceId = preferredWorkspaceId;
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

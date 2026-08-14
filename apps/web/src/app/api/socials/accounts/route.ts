/**
 * GET /api/socials/accounts
 * Live social_accounts rows for the authenticated user (+ optional workspace).
 * Never returns another user's connections. Unauthenticated → 401.
 */

import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
  listLiveSocialAccountsForUser,
} from '@/lib/social/persist';
import { requireOwnedWorkspace } from '@/lib/social/workspace-access';

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id?.trim();
  if (!userId) {
    return Response.json(
      { error: 'Unauthorized', accounts: [] },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const jar = await cookies();
  const workspaceId =
    url.searchParams.get('workspaceId')?.trim() ||
    request.headers.get('x-workspace-id')?.trim() ||
    request.headers.get('x-active-workspace-id')?.trim() ||
    jar.get(ACTIVE_WORKSPACE_COOKIE)?.value ||
    jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value ||
    null;

  // Active workspace must belong to this user — never inherit another brand.
  if (workspaceId) {
    const access = await requireOwnedWorkspace(userId, workspaceId);
    if (!access.ok) {
      return Response.json(
        {
          error: access.error,
          accounts: [],
          connected_count: 0,
          meta_connected: false,
          needs_ig_business: false,
          workspace_id: workspaceId,
          source: 'social_accounts',
        },
        { status: access.status === 400 ? 400 : 403 }
      );
    }
  }

  // Strict equality: user_id = session.user.id (+ workspace_id when set).
  const accounts = await listLiveSocialAccountsForUser({
    userId,
    workspaceId,
  });

  const connected = accounts.filter((a) => a.connected);
  const hasIg = connected.some((a) => a.platform === 'instagram');
  const hasFb = connected.some((a) => a.platform === 'facebook');

  return Response.json({
    accounts,
    connected_count: connected.length,
    meta_connected: hasIg || hasFb,
    needs_ig_business: hasFb && !hasIg,
    workspace_id: workspaceId,
    source: 'social_accounts',
  });
}

import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  setSocialConnection,
  type ConnectedSocialAccount,
  type SocialPlatform,
} from '@/lib/mock-content-planner';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
  listLiveSocialAccountsForUser,
  SOCIAL_PLATFORMS,
} from '@/lib/social/persist';
import { resolveStrictUserWorkspace } from '@/lib/social/resolve-user-workspace';

function disconnectedStub(platform: SocialPlatform): ConnectedSocialAccount {
  return {
    platform,
    connected: false,
    handle: null,
    display_name: null,
    avatar_url: null,
    connected_at: null,
  };
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id?.trim();
  if (!userId) {
    return Response.json(
      { error: 'Unauthorized', accounts: [], demo: false },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const jar = await cookies();
  const preferredWorkspaceId =
    url.searchParams.get('workspaceId')?.trim() ||
    request.headers.get('x-workspace-id')?.trim() ||
    jar.get(ACTIVE_WORKSPACE_COOKIE)?.value ||
    jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value ||
    null;

  // Prefer UI workspace first so Connected cards match the sidebar.
  let workspaceId = preferredWorkspaceId;
  let accounts = preferredWorkspaceId
    ? await listLiveSocialAccountsForUser({
        userId,
        workspaceId: preferredWorkspaceId,
      })
    : SOCIAL_PLATFORMS.map(disconnectedStub);

  if (!accounts.some((a) => a.connected)) {
    const access = await resolveStrictUserWorkspace({
      userId,
      preferredWorkspaceId,
      email: session?.user?.email ?? null,
    });

    if (!access.ok) {
      return Response.json(
        {
          error: access.error,
          accounts: SOCIAL_PLATFORMS.map(disconnectedStub),
          demo: false,
          meta_connected: false,
          needs_ig_business: false,
          workspace_id: preferredWorkspaceId,
          source: 'social_accounts',
        },
        { status: access.status === 400 ? 400 : 403 }
      );
    }

    workspaceId = access.workspaceId;
    accounts = await listLiveSocialAccountsForUser({
      userId,
      workspaceId: access.workspaceId,
    });
  }

  const connected = accounts.filter((a) => a.connected);
  const hasIg = connected.some((a) => a.platform === 'instagram');
  const hasFb = connected.some((a) => a.platform === 'facebook');

  return Response.json({
    accounts,
    demo: false,
    meta_connected: hasIg || hasFb,
    needs_ig_business: hasFb && !hasIg,
    workspace_id: workspaceId,
    connected_platforms: connected.map((a) => a.platform),
    source: 'social_accounts',
  });
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const platform = body.platform as SocialPlatform;
    const connect = Boolean(body.connect);
    if (!platform) {
      return Response.json({ error: 'platform required' }, { status: 400 });
    }

    // Demo OAuth toggle only — live connects use /api/auth/*/login.
    const account = setSocialConnection(platform, connect);
    return Response.json({ account });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}

import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  setSocialConnection,
  type ConnectedSocialAccount,
  type SocialPlatform,
} from '@/lib/mock-content-planner';
import {
  ACTIVE_WORKSPACE_COOKIE,
  listLiveSocialAccountsForUser,
  SOCIAL_PLATFORMS,
} from '@/lib/social/persist';

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
  if (!session?.user) {
    return Response.json({
      accounts: SOCIAL_PLATFORMS.map(disconnectedStub),
      demo: true,
      meta_connected: false,
      needs_ig_business: false,
    });
  }

  const url = new URL(request.url);
  const jar = await cookies();
  const workspaceId =
    url.searchParams.get('workspaceId')?.trim() ||
    request.headers.get('x-workspace-id')?.trim() ||
    jar.get(ACTIVE_WORKSPACE_COOKIE)?.value ||
    null;

  // Authenticated: always read live social_accounts — no mock merge.
  const accounts = await listLiveSocialAccountsForUser({
    userId: session.user.id,
    workspaceId,
  });
  const connected = accounts.filter((a) => a.connected);
  const hasIg = connected.some((a) => a.platform === 'instagram');
  const hasFb = connected.some((a) => a.platform === 'facebook');

  return Response.json({
    accounts,
    demo: false,
    meta_connected: hasIg || hasFb,
    needs_ig_business: hasFb && !hasIg,
    workspace_id: workspaceId,
    source: 'social_accounts',
  });
}

export async function POST(request: Request) {
  try {
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

/**
 * GET /api/auth/callback/linkedin
 * LinkedIn OAuth callback → social_accounts bound to workspace_id → redirect.
 */

import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  LINKEDIN_OAUTH_STATE_COOKIE,
  exchangeLinkedInCode,
  fetchLinkedInProfile,
} from '@/lib/linkedin/oauth';
import { upsertOAuthSocialAccount } from '@/lib/social/oauth-accounts';
import { resolveOAuthWorkspaceId } from '@/lib/social/oauth-workspace';
import { resolveOwnedWorkspaceForOAuth } from '@/lib/social/workspace-access';

function clearState(res: NextResponse) {
  res.cookies.set(LINKEDIN_OAUTH_STATE_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');
  const origin = url.origin;

  const fail = (reason: string) => {
    const dest = new URL('/admin/settings/socials', origin);
    dest.searchParams.set('error', reason);
    const res = NextResponse.redirect(dest);
    clearState(res);
    return res;
  };

  if (oauthError) return fail(oauthError);
  if (!code) return fail('missing_code');

  const jar = await cookies();
  const expected = jar.get(LINKEDIN_OAUTH_STATE_COOKIE)?.value;
  if (!state || !expected || state !== expected) return fail('invalid_state');

  const workspaceId = resolveOAuthWorkspaceId({
    state,
    jarGet: (name) => jar.get(name)?.value,
  });
  if (!workspaceId) return fail('missing_workspace_id');

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    const signIn = new URL('/account/signin', origin);
    signIn.searchParams.set('callbackUrl', '/admin/settings/socials');
    return NextResponse.redirect(signIn);
  }

  const userId = session.user.id;
  const ownedWorkspaceId = await resolveOwnedWorkspaceForOAuth({
    userId,
    preferredWorkspaceId: workspaceId,
    email: session.user.email ?? null,
  });
  if (!ownedWorkspaceId) return fail('workspace_create_failed');

  try {
    const tokens = await exchangeLinkedInCode(code, origin);
    const profile = await fetchLinkedInProfile(tokens.access_token);

    await upsertOAuthSocialAccount({
      userId,
      platform: 'linkedin',
      externalId: profile.sub,
      handle: profile.email ? profile.email.split('@')[0] : null,
      displayName: profile.name,
      avatarUrl: profile.picture,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresIn: tokens.expires_in ?? null,
      workspaceId: ownedWorkspaceId,
    });

    const dest = new URL('/admin/settings/socials', origin);
    dest.searchParams.set('success', 'linkedin_connected');
    const res = NextResponse.redirect(dest);
    clearState(res);
    return res;
  } catch (error) {
    console.error('[linkedin/callback]', error);
    return fail('linkedin_oauth_failed');
  }
}

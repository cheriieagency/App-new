/**
 * GET /api/auth/callback/google
 * Exchange code → persist platform=google on social_accounts → redirect.
 */

import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  exchangeGoogleCode,
  fetchGoogleUserInfo,
} from '@/lib/google/oauth';
import { upsertOAuthSocialAccount } from '@/lib/social/oauth-accounts';
import { resolveOAuthWorkspaceId } from '@/lib/social/oauth-workspace';
import { ensureWorkspaceOwnedByUser } from '@/lib/social/workspace-access';
import { ensureSocialAccountsSchema } from '@/lib/social/persist';

function clearState(res: NextResponse) {
  res.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, '', {
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
    const dest = new URL('/admin/settings/integrations', origin);
    dest.searchParams.set('error', reason);
    const res = NextResponse.redirect(dest);
    clearState(res);
    return res;
  };

  if (oauthError) return fail(oauthError);
  if (!code) return fail('missing_code');

  const jar = await cookies();
  const expected = jar.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  if (!state || !expected || state !== expected) return fail('invalid_state');

  const workspaceId = resolveOAuthWorkspaceId({
    state,
    jarGet: (name) => jar.get(name)?.value,
  });
  if (!workspaceId) return fail('missing_workspace_id');

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    const signIn = new URL('/account/signin', origin);
    signIn.searchParams.set('callbackUrl', '/admin/settings/integrations');
    return NextResponse.redirect(signIn);
  }

  const userId = session.user.id;
  const workspaceAccess = await ensureWorkspaceOwnedByUser(userId, workspaceId);
  if (!workspaceAccess.ok) return fail(workspaceAccess.error);

  try {
    await ensureSocialAccountsSchema();
    const tokens = await exchangeGoogleCode(code, origin);
    const googleUser = await fetchGoogleUserInfo(tokens.access_token);

    await upsertOAuthSocialAccount({
      userId,
      platform: 'google',
      externalId: googleUser.id,
      handle: googleUser.email,
      displayName: googleUser.name || googleUser.email || 'Google Account',
      avatarUrl: googleUser.picture,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresIn: tokens.expires_in ?? null,
      workspaceId: workspaceAccess.workspaceId,
    });

    const dest = new URL('/admin/settings/integrations', origin);
    dest.searchParams.set('success', 'google_connected');
    const res = NextResponse.redirect(dest);
    clearState(res);
    return res;
  } catch (error) {
    console.error('[google/callback]', error);
    return fail('google_oauth_failed');
  }
}

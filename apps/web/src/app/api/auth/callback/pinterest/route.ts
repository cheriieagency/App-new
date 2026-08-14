/**
 * GET /api/auth/callback/pinterest
 * Pinterest OAuth callback → social_accounts (workspace-bound) → redirect.
 */

import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  PINTEREST_OAUTH_STATE_COOKIE,
  exchangePinterestCode,
  fetchPinterestUserAccount,
} from '@/lib/pinterest/oauth';
import { upsertOAuthSocialAccount } from '@/lib/social/oauth-accounts';
import { resolveOAuthWorkspaceId } from '@/lib/social/oauth-workspace';
import { ensureWorkspaceOwnedByUser } from '@/lib/social/workspace-access';

function clearState(res: NextResponse) {
  res.cookies.set(PINTEREST_OAUTH_STATE_COOKIE, '', {
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
  const expected = jar.get(PINTEREST_OAUTH_STATE_COOKIE)?.value;
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
  const workspaceAccess = await ensureWorkspaceOwnedByUser(userId, workspaceId);
  if (!workspaceAccess.ok) return fail(workspaceAccess.error);

  try {
    const tokens = await exchangePinterestCode(code, origin);
    const profile = await fetchPinterestUserAccount(tokens.access_token);
    const username = (profile.username || '').trim();
    if (!username) return fail('pinterest_missing_username');

    await upsertOAuthSocialAccount({
      userId,
      platform: 'pinterest',
      externalId: username,
      handle: `@${username.replace(/^@/, '')}`,
      displayName: username,
      avatarUrl: profile.profile_image ?? null,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresIn: tokens.expires_in ?? null,
      workspaceId: workspaceAccess.workspaceId,
    });

    const dest = new URL('/admin/settings/socials', origin);
    dest.searchParams.set('success', 'pinterest_connected');
    const res = NextResponse.redirect(dest);
    clearState(res);
    return res;
  } catch (error) {
    console.error('[pinterest/callback]', error);
    return fail('pinterest_oauth_failed');
  }
}

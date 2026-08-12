/**
 * GET /api/auth/callback/tiktok
 * TikTok OAuth callback → social_accounts (workspace-bound) → redirect.
 */

import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  TIKTOK_OAUTH_STATE_COOKIE,
  exchangeTikTokCode,
  fetchTikTokUserInfo,
} from '@/lib/tiktok/oauth';
import { upsertOAuthSocialAccount } from '@/lib/social/oauth-accounts';
import { resolveOAuthWorkspaceId } from '@/lib/social/oauth-workspace';

function clearState(res: NextResponse) {
  res.cookies.set(TIKTOK_OAUTH_STATE_COOKIE, '', {
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
  const expected = jar.get(TIKTOK_OAUTH_STATE_COOKIE)?.value;
  if (!state || !expected || state !== expected) return fail('invalid_state');

  const workspaceId = resolveOAuthWorkspaceId({
    state,
    jarGet: (name) => jar.get(name)?.value,
  });
  if (!workspaceId) return fail('missing_workspace_id');

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    const signIn = new URL('/account/signin', origin);
    signIn.searchParams.set('callbackUrl', '/admin/settings/socials');
    return NextResponse.redirect(signIn);
  }

  try {
    const tokens = await exchangeTikTokCode(code, origin);
    const profile = await fetchTikTokUserInfo(tokens.access_token);
    const openId = profile.open_id || tokens.open_id;
    if (!openId) return fail('tiktok_missing_open_id');

    const handle = profile.display_name
      ? `@${profile.display_name.replace(/^@/, '')}`
      : null;

    await upsertOAuthSocialAccount({
      userId: session.user.id,
      platform: 'tiktok',
      externalId: openId,
      handle,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      followersCount: profile.follower_count,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresIn: tokens.expires_in ?? null,
      workspaceId,
    });

    const dest = new URL('/admin/settings/socials', origin);
    dest.searchParams.set('success', 'tiktok_connected');
    const res = NextResponse.redirect(dest);
    clearState(res);
    return res;
  } catch (error) {
    console.error('[tiktok/callback]', error);
    return fail('tiktok_oauth_failed');
  }
}

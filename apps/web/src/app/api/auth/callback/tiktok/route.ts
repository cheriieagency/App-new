/**
 * GET /api/auth/callback/tiktok
 * TikTok OAuth callback → extract code/state → exchange at
 * https://open.tiktokapis.com/v2/oauth/token/ → redirect to settings or inbox.
 */

import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  TIKTOK_CODE_VERIFIER_COOKIE,
  TIKTOK_OAUTH_STATE_COOKIE,
  TIKTOK_RETURN_TO_COOKIE,
  exchangeTikTokCode,
  fetchTikTokUserInfo,
  getTikTokCallbackUrl,
  getTikTokSuccessRedirectPath,
} from '@/lib/tiktok/oauth';
import { upsertOAuthSocialAccount } from '@/lib/social/oauth-accounts';
import { resolveOAuthWorkspaceId } from '@/lib/social/oauth-workspace';
import { resolveOwnedWorkspaceForOAuth } from '@/lib/social/workspace-access';
import { oauthPopupCompleteResponse } from '@/lib/oauth/popup-callback';

function clearOAuthCookies(res: NextResponse) {
  const clear = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  };
  res.cookies.set(TIKTOK_OAUTH_STATE_COOKIE, '', clear);
  res.cookies.set(TIKTOK_CODE_VERIFIER_COOKIE, '', clear);
  res.cookies.set(TIKTOK_RETURN_TO_COOKIE, '', clear);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  // Query params from TikTok redirect (URLSearchParams already decodes once).
  const code = url.searchParams.get('code')?.trim() || null;
  const state = url.searchParams.get('state')?.trim() || null;
  const oauthError =
    url.searchParams.get('error') ||
    url.searchParams.get('error_type') ||
    null;
  const oauthErrorDesc = url.searchParams.get('error_description');
  const origin = url.origin;

  const jar = await cookies();
  const returnTo = jar.get(TIKTOK_RETURN_TO_COOKIE)?.value || 'settings';
  const successPath = getTikTokSuccessRedirectPath(returnTo);

  const fail = (reason: string, detail?: string | null) => {
    const dest = new URL(successPath, origin);
    dest.searchParams.set('error', reason);
    if (detail) dest.searchParams.set('detail', detail.slice(0, 160));
    const res = oauthPopupCompleteResponse({
      success: false,
      platform: 'tiktok',
      error: reason,
      detail: detail || undefined,
      continueHref: `${dest.pathname}${dest.search}`,
    });
    clearOAuthCookies(res);
    return res;
  };

  if (oauthError) {
    return fail(String(oauthError), oauthErrorDesc);
  }
  if (!code) return fail('missing_code');
  if (!state) return fail('missing_state');

  const expected = jar.get(TIKTOK_OAUTH_STATE_COOKIE)?.value;
  if (!expected || state !== expected) return fail('invalid_state');

  const codeVerifier = jar.get(TIKTOK_CODE_VERIFIER_COOKIE)?.value?.trim();
  if (!codeVerifier) return fail('missing_code_verifier');

  const workspaceId = resolveOAuthWorkspaceId({
    state,
    jarGet: (name) => jar.get(name)?.value,
  });
  if (!workspaceId) return fail('missing_workspace_id');

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    const signIn = new URL('/account/signin', origin);
    signIn.searchParams.set('callbackUrl', successPath);
    const res = NextResponse.redirect(signIn);
    clearOAuthCookies(res);
    return res;
  }

  const userId = session.user.id;
  const ownedWorkspaceId = await resolveOwnedWorkspaceForOAuth({
    userId,
    preferredWorkspaceId: workspaceId,
    email: session.user.email ?? null,
  });
  if (!ownedWorkspaceId) return fail('workspace_create_failed');

  try {
    // Exchange authorization code → access_token (same redirect_uri as authorize).
    const callbackUrl = getTikTokCallbackUrl(origin);
    console.info('[tiktok/callback] exchanging code', {
      redirect_uri: callbackUrl,
      has_code: Boolean(code),
      has_state: Boolean(state),
    });

    const tokens = await exchangeTikTokCode(code, origin, codeVerifier);
    const profile = await fetchTikTokUserInfo(tokens.access_token);
    const openId = profile.open_id || tokens.open_id;
    if (!openId) return fail('tiktok_missing_open_id');

    const handle = profile.display_name
      ? `@${profile.display_name.replace(/^@/, '')}`
      : null;

    await upsertOAuthSocialAccount({
      userId,
      platform: 'tiktok',
      externalId: openId,
      handle,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      followersCount: profile.follower_count,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresIn: tokens.expires_in ?? null,
      workspaceId: ownedWorkspaceId,
    });

    const dest = new URL(successPath, origin);
    dest.searchParams.set('success', 'tiktok_connected');
    const res = oauthPopupCompleteResponse({
      success: true,
      platform: 'tiktok',
      continueHref: `${dest.pathname}${dest.search}`,
    });
    clearOAuthCookies(res);
    return res;
  } catch (error) {
    console.error('[tiktok/callback]', error);
    return fail(
      'tiktok_oauth_failed',
      error instanceof Error ? error.message : null
    );
  }
}

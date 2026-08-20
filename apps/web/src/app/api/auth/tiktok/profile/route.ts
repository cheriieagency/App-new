/**
 * GET /api/auth/tiktok/profile
 * TikTok Login Kit OAuth — organic posting, profile info, video analytics.
 */

import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { tiktokEnv } from '@/lib/config/env';
import { TIKTOK_BUSINESS_FLOW_COOKIE } from '@/lib/tiktok/business-oauth';
import {
  TIKTOK_CODE_VERIFIER_COOKIE,
  TIKTOK_OAUTH_STATE_COOKIE,
  TIKTOK_RETURN_TO_COOKIE,
  buildTikTokLoginUrl,
  createTikTokPkce,
  getTikTokCallbackUrl,
  getTikTokSuccessRedirectPath,
} from '@/lib/tiktok/oauth';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
  appendWorkspaceToOAuthState,
  setActiveWorkspaceCookies,
} from '@/lib/social/oauth-workspace';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const jar = await cookies();
  const workspaceId =
    url.searchParams.get('workspaceId')?.trim() ||
    jar.get(ACTIVE_WORKSPACE_COOKIE)?.value ||
    jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value ||
    null;

  const returnToRaw =
    url.searchParams.get('returnTo') ||
    url.searchParams.get('return_to') ||
    'settings';
  const returnTo =
    returnToRaw.toLowerCase().includes('inbox') ? 'inbox' : 'settings';
  const failRedirect = getTikTokSuccessRedirectPath(returnTo);
  const forceSelect = url.searchParams.get('force') === 'true';

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    const signIn = new URL('/account/signin', request.url);
    const cb = new URL('/api/auth/tiktok/profile', url.origin);
    if (workspaceId) cb.searchParams.set('workspaceId', workspaceId);
    cb.searchParams.set('returnTo', returnTo);
    if (forceSelect) cb.searchParams.set('force', 'true');
    signIn.searchParams.set('callbackUrl', `${cb.pathname}?${cb.searchParams}`);
    return NextResponse.redirect(signIn);
  }

  if (!workspaceId) {
    const dest = new URL(failRedirect, request.url);
    dest.searchParams.set('error', 'missing_workspace_id');
    return NextResponse.redirect(dest);
  }

  if (!tiktokEnv.clientKey() || !tiktokEnv.clientSecret()) {
    const dest = new URL(failRedirect, request.url);
    dest.searchParams.set('error', 'tiktok_not_configured');
    dest.searchParams.set(
      'detail',
      'Set TIKTOK_CLIENT_KEY + TIKTOK_CLIENT_SECRET for profile posting'
    );
    return NextResponse.redirect(dest);
  }

  const cookieOpts = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10,
  };

  const state = appendWorkspaceToOAuthState(crypto.randomUUID(), workspaceId);
  const { codeVerifier, codeChallenge } = createTikTokPkce();
  try {
    const loginUrl = buildTikTokLoginUrl(state, url.origin, {
      forceSelectAccount: forceSelect,
      codeChallenge,
    });
    console.info('[auth/tiktok/profile] login kit authorize', {
      redirect_uri: getTikTokCallbackUrl(url.origin),
    });
    const res = NextResponse.redirect(loginUrl);
    res.cookies.set(TIKTOK_OAUTH_STATE_COOKIE, state, cookieOpts);
    res.cookies.set(TIKTOK_CODE_VERIFIER_COOKIE, codeVerifier, cookieOpts);
    res.cookies.set(TIKTOK_BUSINESS_FLOW_COOKIE, 'login_kit', cookieOpts);
    res.cookies.set(TIKTOK_RETURN_TO_COOKIE, returnTo, cookieOpts);
    setActiveWorkspaceCookies(res, workspaceId);
    return res;
  } catch (error) {
    console.error('[auth/tiktok/profile]', error);
    const dest = new URL(failRedirect, request.url);
    dest.searchParams.set('error', 'tiktok_oauth_failed');
    dest.searchParams.set(
      'detail',
      error instanceof Error ? error.message.slice(0, 160) : 'oauth_failed'
    );
    return NextResponse.redirect(dest);
  }
}

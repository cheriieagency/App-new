/**
 * GET /api/auth/tiktok/business
 * TikTok Business API OAuth — DM automation and Ad management.
 */

import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { tiktokEnv } from '@/lib/config/env';
import {
  TIKTOK_BUSINESS_FLOW_COOKIE,
  buildTikTokBusinessLoginUrl,
} from '@/lib/tiktok/business-oauth';
import {
  TIKTOK_OAUTH_STATE_COOKIE,
  TIKTOK_RETURN_TO_COOKIE,
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

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    const signIn = new URL('/account/signin', request.url);
    const cb = new URL('/api/auth/tiktok/business', url.origin);
    if (workspaceId) cb.searchParams.set('workspaceId', workspaceId);
    cb.searchParams.set('returnTo', returnTo);
    signIn.searchParams.set('callbackUrl', `${cb.pathname}?${cb.searchParams}`);
    return NextResponse.redirect(signIn);
  }

  if (!workspaceId) {
    const dest = new URL(failRedirect, request.url);
    dest.searchParams.set('error', 'missing_workspace_id');
    return NextResponse.redirect(dest);
  }

  if (!tiktokEnv.hasBusinessCredentials()) {
    const dest = new URL(failRedirect, request.url);
    dest.searchParams.set('error', 'tiktok_not_configured');
    dest.searchParams.set(
      'detail',
      'Set TIKTOK_BUSINESS_APP_ID + TIKTOK_BUSINESS_APP_SECRET'
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
  try {
    const loginUrl = buildTikTokBusinessLoginUrl(state, url.origin);
    console.info('[auth/tiktok/business] business authorize', {
      redirect_uri: getTikTokCallbackUrl(url.origin),
      app_id_set: Boolean(tiktokEnv.businessAppId()),
    });
    const res = NextResponse.redirect(loginUrl);
    res.cookies.set(TIKTOK_OAUTH_STATE_COOKIE, state, cookieOpts);
    res.cookies.set(TIKTOK_BUSINESS_FLOW_COOKIE, 'business', cookieOpts);
    res.cookies.set(TIKTOK_RETURN_TO_COOKIE, returnTo, cookieOpts);
    setActiveWorkspaceCookies(res, workspaceId);
    return res;
  } catch (error) {
    console.error('[auth/tiktok/business]', error);
    const dest = new URL(failRedirect, request.url);
    dest.searchParams.set('error', 'tiktok_oauth_failed');
    dest.searchParams.set(
      'detail',
      error instanceof Error ? error.message.slice(0, 160) : 'oauth_failed'
    );
    return NextResponse.redirect(dest);
  }
}

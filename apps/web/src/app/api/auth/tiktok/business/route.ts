/**
 * GET /api/auth/tiktok/business
 * TikTok Business API OAuth — DM automation and Ad management.
 */

import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { missingEnvKeys, tiktokEnv } from '@/lib/config/env';
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
import { oauthPopupCompleteResponse } from '@/lib/oauth/popup-callback';

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

  const failPopup = (reason: string, detail?: string) => {
    const dest = new URL(failRedirect, url.origin);
    dest.searchParams.set('error', reason);
    if (detail) dest.searchParams.set('detail', detail.slice(0, 160));
    return oauthPopupCompleteResponse({
      success: false,
      platform: 'tiktok_business',
      error: reason,
      detail: detail || reason,
      continueHref: `${dest.pathname}${dest.search}`,
    });
  };

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
    return failPopup(
      'missing_workspace_id',
      'Select a workspace before connecting TikTok Business'
    );
  }

  if (!tiktokEnv.hasBusinessCredentials()) {
    const missing = missingEnvKeys(
      'TIKTOK_BUSINESS_APP_ID',
      'TIKTOK_BUSINESS_APP_SECRET'
    );
    console.warn('[auth/tiktok/business] missing credentials', {
      missing,
      redirect_uri: getTikTokCallbackUrl(),
    });
    return failPopup(
      'tiktok_not_configured',
      missing.length
        ? `Missing ${missing.join(' + ')} in apps/web/.env.local (restart dev server after adding)`
        : 'Set TIKTOK_BUSINESS_APP_ID + TIKTOK_BUSINESS_APP_SECRET in .env.local and restart'
    );
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
    const redirectUri = getTikTokCallbackUrl();
    const loginUrl = buildTikTokBusinessLoginUrl(state);
    console.info('[auth/tiktok/business] business authorize', {
      redirect_uri: redirectUri,
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
    return failPopup(
      'tiktok_oauth_failed',
      error instanceof Error ? error.message.slice(0, 160) : 'oauth_failed'
    );
  }
}

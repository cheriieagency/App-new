/**
 * GET /api/auth/tiktok
 * TikTok Business OAuth entry — redirects to Business Portal authorize URL
 * using TIKTOK_BUSINESS_APP_ID. Falls back to Login Kit or mock connect when
 * Business secret is not yet available.
 *
 * Query: workspaceId, returnTo=settings|inbox, force=true
 */

import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { tiktokEnv } from '@/lib/config/env';
import {
  TIKTOK_BUSINESS_FLOW_COOKIE,
  buildTikTokBusinessLoginUrl,
  isTikTokBusinessMockMode,
} from '@/lib/tiktok/business-oauth';
import {
  TIKTOK_CODE_VERIFIER_COOKIE,
  TIKTOK_OAUTH_STATE_COOKIE,
  TIKTOK_RETURN_TO_COOKIE,
  buildTikTokLoginUrl,
  createTikTokPkce,
  getTikTokCallbackUrl,
  getTikTokSuccessRedirectPath,
} from '@/lib/tiktok/oauth';
import { upsertTikTokToken } from '@/lib/tiktok/tokens-persist';
import { upsertOAuthSocialAccount } from '@/lib/social/oauth-accounts';
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
    const cb = new URL('/api/auth/tiktok', url.origin);
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

  const cookieOpts = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10,
  };

  // ── Mock mode: Business secret missing → seed demo token for UI testing ──
  if (isTikTokBusinessMockMode() && !tiktokEnv.clientKey()) {
    const mockOpenId = `mock_tt_${session.user.id.slice(0, 8)}`;
    try {
      await upsertTikTokToken({
        workspaceId,
        userId: session.user.id,
        openId: mockOpenId,
        accessToken: `mock_access_${Date.now()}`,
        refreshToken: null,
        advertiserIds: [],
        scope: 'mock.inbox',
        tokenSource: 'mock',
        expiresIn: 60 * 60 * 24 * 30,
      });
      await upsertOAuthSocialAccount({
        userId: session.user.id,
        platform: 'tiktok',
        externalId: mockOpenId,
        handle: '@tiktok_mock',
        displayName: 'TikTok (Demo)',
        avatarUrl: null,
        followersCount: 0,
        accessToken: `mock_access_${Date.now()}`,
        refreshToken: null,
        expiresIn: 60 * 60 * 24 * 30,
        workspaceId,
      });
    } catch (error) {
      console.warn('[auth/tiktok] mock connect persist skipped', error);
    }

    const dest = new URL(failRedirect, request.url);
    dest.searchParams.set('success', 'tiktok_connected');
    dest.searchParams.set('demo', '1');
    const res = NextResponse.redirect(dest);
    setActiveWorkspaceCookies(res, workspaceId);
    return res;
  }

  // ── Business OAuth (preferred when TIKTOK_BUSINESS_APP_ID + SECRET set) ──
  if (tiktokEnv.hasBusinessCredentials()) {
    const state = appendWorkspaceToOAuthState(crypto.randomUUID(), workspaceId);
    try {
      const loginUrl = buildTikTokBusinessLoginUrl(state, url.origin);
      console.info('[auth/tiktok] business authorize', {
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
      console.error('[auth/tiktok] business', error);
      const dest = new URL(failRedirect, request.url);
      dest.searchParams.set('error', 'tiktok_oauth_failed');
      return NextResponse.redirect(dest);
    }
  }

  // ── Fallback: Login Kit (TIKTOK_CLIENT_KEY) when Business secret unset ──
  if (tiktokEnv.clientKey() && tiktokEnv.clientSecret()) {
    const state = appendWorkspaceToOAuthState(crypto.randomUUID(), workspaceId);
    const { codeVerifier, codeChallenge } = createTikTokPkce();
    try {
      const loginUrl = buildTikTokLoginUrl(state, url.origin, {
        forceSelectAccount: true,
        codeChallenge,
      });
      const res = NextResponse.redirect(loginUrl);
      res.cookies.set(TIKTOK_OAUTH_STATE_COOKIE, state, cookieOpts);
      res.cookies.set(TIKTOK_CODE_VERIFIER_COOKIE, codeVerifier, cookieOpts);
      res.cookies.set(TIKTOK_BUSINESS_FLOW_COOKIE, 'login_kit', cookieOpts);
      res.cookies.set(TIKTOK_RETURN_TO_COOKIE, returnTo, cookieOpts);
      setActiveWorkspaceCookies(res, workspaceId);
      return res;
    } catch (error) {
      console.error('[auth/tiktok] login_kit fallback', error);
      const dest = new URL(failRedirect, request.url);
      dest.searchParams.set('error', 'tiktok_oauth_failed');
      return NextResponse.redirect(dest);
    }
  }

  const dest = new URL(failRedirect, request.url);
  dest.searchParams.set('error', 'tiktok_not_configured');
  dest.searchParams.set(
    'detail',
    'Set TIKTOK_BUSINESS_APP_ID + TIKTOK_BUSINESS_SECRET (or Login Kit keys)'
  );
  return NextResponse.redirect(dest);
}

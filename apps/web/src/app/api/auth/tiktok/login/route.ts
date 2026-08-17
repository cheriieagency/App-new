/**
 * GET /api/auth/tiktok/login?workspaceId=…&force=true&returnTo=settings|inbox
 * Starts TikTok OAuth 2.0 bound to the active workspace (PKCE S256).
 *
 * Callback URL is always:
 *   `${NEXTAUTH_URL|BETTER_AUTH_URL|NEXT_PUBLIC_APP_URL}/api/auth/callback/tiktok`
 *
 * Query flags that force account re-selection / consent:
 *   - force=true
 *   - prompt=select_account | prompt=consent
 *   - returnTo=settings | inbox
 */

import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { missingEnvKeys, missingEnvResponse, tiktokEnv } from '@/lib/config/env';
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
  // Requires process.env.TIKTOK_CLIENT_KEY + TIKTOK_CLIENT_SECRET.
  const missing = missingEnvKeys(...tiktokEnv.requiredKeys);
  if (missing.length && !tiktokEnv.clientKey()) {
    return missingEnvResponse(missing, 'TikTok Developer API');
  }
  if (!tiktokEnv.clientKey() || !tiktokEnv.clientSecret()) {
    return missingEnvResponse(
      [...tiktokEnv.requiredKeys],
      'TikTok Developer API'
    );
  }

  const url = new URL(request.url);
  const jar = await cookies();
  const workspaceId =
    url.searchParams.get('workspaceId')?.trim() ||
    jar.get(ACTIVE_WORKSPACE_COOKIE)?.value ||
    jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value ||
    null;

  const promptParam = (url.searchParams.get('prompt') || '').trim().toLowerCase();
  const forceParam = (url.searchParams.get('force') || '').trim().toLowerCase();
  const forceSelectAccount =
    forceParam === '1' ||
    forceParam === 'true' ||
    promptParam === 'select_account' ||
    promptParam === 'consent';

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
    const cb = new URL('/api/auth/tiktok/login', url.origin);
    if (workspaceId) cb.searchParams.set('workspaceId', workspaceId);
    if (forceSelectAccount) cb.searchParams.set('force', 'true');
    cb.searchParams.set('returnTo', returnTo);
    signIn.searchParams.set('callbackUrl', `${cb.pathname}?${cb.searchParams}`);
    return NextResponse.redirect(signIn);
  }

  if (!workspaceId) {
    const dest = new URL(failRedirect, request.url);
    dest.searchParams.set('error', 'missing_workspace_id');
    return NextResponse.redirect(dest);
  }

  // CSRF nonce + workspace binding embedded in OAuth state.
  const state = appendWorkspaceToOAuthState(crypto.randomUUID(), workspaceId);
  const { codeVerifier, codeChallenge } = createTikTokPkce();
  const origin = url.origin;

  let loginUrl: string;
  try {
    loginUrl = buildTikTokLoginUrl(state, origin, {
      forceSelectAccount: true,
      codeChallenge,
    });
    console.info('[tiktok/login] authorize', {
      redirect_uri: getTikTokCallbackUrl(origin),
      client_key_set: Boolean(tiktokEnv.clientKey()),
      returnTo,
    });
  } catch (error) {
    console.error('[tiktok/login]', error);
    const dest = new URL(failRedirect, request.url);
    dest.searchParams.set('error', 'tiktok_oauth_failed');
    return NextResponse.redirect(dest);
  }

  const res = NextResponse.redirect(loginUrl);
  const cookieOpts = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10,
  };
  res.cookies.set(TIKTOK_OAUTH_STATE_COOKIE, state, cookieOpts);
  // PKCE verifier — required on token exchange in the callback.
  res.cookies.set(TIKTOK_CODE_VERIFIER_COOKIE, codeVerifier, cookieOpts);
  res.cookies.set(TIKTOK_RETURN_TO_COOKIE, returnTo, cookieOpts);
  setActiveWorkspaceCookies(res, workspaceId);
  return res;
}

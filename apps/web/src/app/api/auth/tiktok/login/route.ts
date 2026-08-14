/**
 * GET /api/auth/tiktok/login?workspaceId=…&force=true
 * Starts TikTok OAuth 2.0 bound to the active workspace (PKCE S256).
 *
 * Query flags that force account re-selection / consent:
 *   - force=true
 *   - prompt=select_account | prompt=consent
 */

import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { missingEnvKeys, missingEnvResponse, tiktokEnv } from '@/lib/config/env';
import {
  TIKTOK_CODE_VERIFIER_COOKIE,
  TIKTOK_OAUTH_STATE_COOKIE,
  buildTikTokLoginUrl,
  createTikTokPkce,
} from '@/lib/tiktok/oauth';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
  appendWorkspaceToOAuthState,
  setActiveWorkspaceCookies,
} from '@/lib/social/oauth-workspace';

export async function GET(request: Request) {
  const missing = missingEnvKeys(...tiktokEnv.requiredKeys);
  if (missing.length) {
    return missingEnvResponse(missing, 'TikTok Developer API');
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

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    const signIn = new URL('/account/signin', request.url);
    const cb = new URL('/api/auth/tiktok/login', url.origin);
    if (workspaceId) cb.searchParams.set('workspaceId', workspaceId);
    if (forceSelectAccount) cb.searchParams.set('force', 'true');
    signIn.searchParams.set('callbackUrl', `${cb.pathname}?${cb.searchParams}`);
    return NextResponse.redirect(signIn);
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
  } catch (error) {
    console.error('[tiktok/login]', error);
    const dest = new URL('/admin/settings/socials', request.url);
    dest.searchParams.set('error', 'tiktok_oauth_failed');
    return NextResponse.redirect(dest);
  }

  const res = NextResponse.redirect(loginUrl);
  res.cookies.set(TIKTOK_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10,
  });
  // PKCE verifier — required on token exchange in the callback.
  res.cookies.set(TIKTOK_CODE_VERIFIER_COOKIE, codeVerifier, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10,
  });
  if (workspaceId) setActiveWorkspaceCookies(res, workspaceId);
  return res;
}

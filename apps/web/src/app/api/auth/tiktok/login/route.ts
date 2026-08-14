/**
 * GET /api/auth/tiktok/login?workspaceId=…
 * Starts TikTok OAuth 2.0 bound to the active workspace.
 * Always forces account selection + consent (disable_auto_login + prompt=consent).
 */

import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { missingEnvKeys, missingEnvResponse, tiktokEnv } from '@/lib/config/env';
import {
  TIKTOK_OAUTH_STATE_COOKIE,
  buildTikTokLoginUrl,
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

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    const signIn = new URL('/account/signin', request.url);
    const cb = workspaceId
      ? `/api/auth/tiktok/login?workspaceId=${encodeURIComponent(workspaceId)}`
      : '/api/auth/tiktok/login';
    signIn.searchParams.set('callbackUrl', cb);
    return NextResponse.redirect(signIn);
  }

  // CSRF nonce + workspace binding embedded in OAuth state.
  const state = appendWorkspaceToOAuthState(crypto.randomUUID(), workspaceId);
  const origin = url.origin;

  let loginUrl: string;
  try {
    // Includes disable_auto_login=true & prompt=consent via buildTikTokLoginUrl.
    loginUrl = buildTikTokLoginUrl(state, origin);
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
  if (workspaceId) setActiveWorkspaceCookies(res, workspaceId);
  return res;
}

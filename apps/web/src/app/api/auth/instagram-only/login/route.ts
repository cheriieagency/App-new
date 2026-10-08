/**
 * GET /api/auth/instagram-only/login?workspaceId=…
 * Instagram Login API — connect IG without Facebook Pages.
 */

import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { missingEnvKeys } from '@/lib/config/env';
import {
  IG_ONLY_OAUTH_STATE_COOKIE,
  buildInstagramOnlyLoginUrl,
  getInstagramOnlyCallbackUrl,
  instagramAppId,
  instagramAppSecret,
  instagramOnlyOAuthCookieDomain,
} from '@/lib/instagram/oauth';
import { oauthPopupCompleteResponse } from '@/lib/oauth/popup-callback';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
  appendWorkspaceToOAuthState,
  setActiveWorkspaceCookies,
} from '@/lib/social/oauth-workspace';

function popupFail(origin: string, reason: string, detail?: string) {
  const dest = new URL('/admin/settings/socials', origin);
  dest.searchParams.set('error', reason);
  if (detail) dest.searchParams.set('detail', detail.slice(0, 180));
  return oauthPopupCompleteResponse({
    success: false,
    platform: 'instagram',
    error: reason,
    detail,
    continueHref: `${dest.pathname}${dest.search}`,
  });
}

function requestOrigin(request: Request): string {
  const headersList = request.headers;
  const forwardedHost = headersList.get('x-forwarded-host')?.split(',')[0]?.trim();
  const forwardedProto = headersList.get('x-forwarded-proto')?.split(',')[0]?.trim();
  if (forwardedHost) {
    const isLocal =
      forwardedHost.startsWith('localhost') ||
      forwardedHost.startsWith('127.0.0.1');
    const proto = forwardedProto || (isLocal ? 'http' : 'https');
    try {
      return new URL(`${proto}://${forwardedHost}`).origin;
    } catch {
      /* fall through */
    }
  }
  return new URL(request.url).origin;
}

export async function GET(request: Request) {
  const origin = requestOrigin(request);

  const missing = missingEnvKeys('INSTAGRAM_APP_ID', 'INSTAGRAM_APP_SECRET');
  if (missing.length || !instagramAppId() || !instagramAppSecret()) {
    return popupFail(
      origin,
      'missing_env',
      `Missing ${(missing.length ? missing : ['INSTAGRAM_APP_ID', 'INSTAGRAM_APP_SECRET']).join(', ')}. Add them to apps/web/.env.local.`
    );
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
    const cb = new URL('/api/auth/instagram-only/login', request.url);
    if (workspaceId) cb.searchParams.set('workspaceId', workspaceId);
    signIn.searchParams.set('callbackUrl', `${cb.pathname}?${cb.searchParams}`);
    return NextResponse.redirect(signIn);
  }

  if (!workspaceId) {
    return popupFail(origin, 'missing_workspace_id');
  }

  const state = appendWorkspaceToOAuthState(crypto.randomUUID(), workspaceId);

  let loginUrl: string;
  try {
    loginUrl = buildInstagramOnlyLoginUrl(state, origin);
    console.info('[instagram-only/login] authorize', {
      redirect_uri: getInstagramOnlyCallbackUrl(origin),
    });
  } catch (error) {
    console.error('[instagram-only/login]', error);
    return popupFail(
      origin,
      'instagram_oauth_failed',
      error instanceof Error ? error.message : 'failed_to_build_login_url'
    );
  }

  const res = NextResponse.redirect(loginUrl);
  const cookieDomain = instagramOnlyOAuthCookieDomain(origin);
  res.cookies.set(IG_ONLY_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' || origin.startsWith('https'),
    path: '/',
    maxAge: 60 * 10,
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  });
  setActiveWorkspaceCookies(res, workspaceId);
  return res;
}

/**
 * GET /api/auth/meta/login?target=instagram|facebook|both&workspaceId=…
 * Starts Meta OAuth bound to the active Team Workspace.
 */

import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { metaEnv, missingEnvKeys } from '@/lib/config/env';
import {
  META_OAUTH_SCOPES,
  META_OAUTH_STATE_COOKIE,
  buildMetaLoginUrl,
  encodeMetaOAuthState,
  metaOAuthCookieDomain,
  parseMetaOAuthTarget,
} from '@/lib/meta/oauth';
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
  return oauthPopupCompleteResponse({
    success: false,
    platform: 'meta',
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

  const missing = missingEnvKeys('META_APP_ID', 'META_APP_SECRET');
  if (missing.length || !metaEnv.appId() || !metaEnv.appSecret()) {
    return popupFail(
      origin,
      'missing_env',
      `Missing ${(missing.length ? missing : ['META_APP_ID', 'META_APP_SECRET']).join(', ')}. Add them to apps/web/.env.local.`
    );
  }

  const url = new URL(request.url);
  const target = parseMetaOAuthTarget(url.searchParams.get('target'));
  const jar = await cookies();
  const workspaceId =
    url.searchParams.get('workspaceId')?.trim() ||
    jar.get(ACTIVE_WORKSPACE_COOKIE)?.value ||
    jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value ||
    null;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    const signIn = new URL('/account/signin', request.url);
    const cb = new URL(`/api/auth/meta/login`, request.url);
    cb.searchParams.set('target', target);
    if (workspaceId) cb.searchParams.set('workspaceId', workspaceId);
    signIn.searchParams.set('callbackUrl', `${cb.pathname}?${cb.searchParams}`);
    return NextResponse.redirect(signIn);
  }

  if (!workspaceId) {
    return popupFail(origin, 'missing_workspace_id');
  }

  const nonce = crypto.randomUUID();
  const state = appendWorkspaceToOAuthState(
    encodeMetaOAuthState(nonce, target),
    workspaceId
  );

  let loginUrl: string;
  try {
    loginUrl = buildMetaLoginUrl(state, origin, target);
    // Re-assert the approved Advanced Access–safe scope set + force re-consent.
    const parsed = new URL(loginUrl);
    parsed.searchParams.set('scope', META_OAUTH_SCOPES.join(','));
    parsed.searchParams.set('auth_type', 'rerequest');
    parsed.searchParams.set('prompt', 'consent');
    loginUrl = parsed.toString();
  } catch (error) {
    console.error('[meta/login]', error);
    return popupFail(
      origin,
      'meta_fetch_failed',
      error instanceof Error ? error.message : 'failed_to_build_login_url'
    );
  }

  const res = NextResponse.redirect(loginUrl);
  const cookieDomain = metaOAuthCookieDomain(origin);
  res.cookies.set(META_OAUTH_STATE_COOKIE, state, {
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

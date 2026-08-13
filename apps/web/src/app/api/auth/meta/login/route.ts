/**
 * GET /api/auth/meta/login?target=instagram|facebook|both&workspaceId=…
 * Starts Meta OAuth bound to the active Team Workspace.
 */

import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { metaEnv, missingEnvResponse } from '@/lib/config/env';
import {
  META_OAUTH_SCOPES,
  META_OAUTH_STATE_COOKIE,
  buildMetaLoginUrl,
  encodeMetaOAuthState,
  parseMetaOAuthTarget,
} from '@/lib/meta/oauth';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
  appendWorkspaceToOAuthState,
  setActiveWorkspaceCookies,
} from '@/lib/social/oauth-workspace';

export async function GET(request: Request) {
  if (!metaEnv.appId() || !metaEnv.appSecret()) {
    return missingEnvResponse(['META_APP_ID', 'META_APP_SECRET'], 'Meta OAuth');
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

  const nonce = crypto.randomUUID();
  const state = appendWorkspaceToOAuthState(
    encodeMetaOAuthState(nonce, target),
    workspaceId
  );
  const origin = url.origin;

  let loginUrl: string;
  try {
    loginUrl = buildMetaLoginUrl(state, origin, target);
    // Re-assert scopes + rerequest so Meta prompts for pages_manage_metadata etc.
    const parsed = new URL(loginUrl);
    parsed.searchParams.set('scope', META_OAUTH_SCOPES.join(','));
    parsed.searchParams.set('auth_type', 'rerequest');
    parsed.searchParams.set('prompt', 'consent');
    loginUrl = parsed.toString();
  } catch (error) {
    console.error('[meta/login]', error);
    const dest = new URL('/admin/settings/socials', request.url);
    dest.searchParams.set('error', 'meta_fetch_failed');
    dest.searchParams.set('detail', 'failed_to_build_login_url');
    return NextResponse.redirect(dest);
  }

  const res = NextResponse.redirect(loginUrl);
  res.cookies.set(META_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10,
  });
  if (workspaceId) setActiveWorkspaceCookies(res, workspaceId);
  return res;
}

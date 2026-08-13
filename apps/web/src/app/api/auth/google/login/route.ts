/**
 * GET /api/auth/google/login?workspaceId=…
 * Starts Google OAuth for Drive + Calendar/Meet, bound to the active workspace.
 */

import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { googleEnv, missingEnvKeys, missingEnvResponse } from '@/lib/config/env';
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  buildGoogleLoginUrl,
} from '@/lib/google/oauth';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
  appendWorkspaceToOAuthState,
  setActiveWorkspaceCookies,
} from '@/lib/social/oauth-workspace';

export async function GET(request: Request) {
  const missing = missingEnvKeys(...googleEnv.oauthRequiredKeys);
  if (missing.length) {
    return missingEnvResponse(missing, 'Google (Drive / Calendar)');
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
      ? `/api/auth/google/login?workspaceId=${encodeURIComponent(workspaceId)}`
      : '/api/auth/google/login';
    signIn.searchParams.set('callbackUrl', cb);
    return NextResponse.redirect(signIn);
  }

  const state = appendWorkspaceToOAuthState(crypto.randomUUID(), workspaceId);
  const origin = url.origin;

  let loginUrl: string;
  try {
    loginUrl = buildGoogleLoginUrl(state, origin);
  } catch (error) {
    console.error('[google/login]', error);
    const dest = new URL('/admin/settings/integrations', request.url);
    dest.searchParams.set('error', 'google_oauth_failed');
    return NextResponse.redirect(dest);
  }

  const res = NextResponse.redirect(loginUrl);
  res.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10,
  });
  if (workspaceId) setActiveWorkspaceCookies(res, workspaceId);
  return res;
}

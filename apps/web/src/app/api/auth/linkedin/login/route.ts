/**
 * GET /api/auth/linkedin/login?workspaceId=…
 * Starts LinkedIn OAuth bound to the active workspace.
 */

import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { missingEnvKeys, missingEnvResponse, linkedinEnv } from '@/lib/config/env';
import {
  LINKEDIN_OAUTH_STATE_COOKIE,
  buildLinkedInLoginUrl,
} from '@/lib/linkedin/oauth';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
  appendWorkspaceToOAuthState,
  setActiveWorkspaceCookies,
} from '@/lib/social/oauth-workspace';

export async function GET(request: Request) {
  const missing = missingEnvKeys(...linkedinEnv.requiredKeys);
  if (missing.length) {
    return missingEnvResponse(missing, 'LinkedIn Share API');
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
      ? `/api/auth/linkedin/login?workspaceId=${encodeURIComponent(workspaceId)}`
      : '/api/auth/linkedin/login';
    signIn.searchParams.set('callbackUrl', cb);
    return NextResponse.redirect(signIn);
  }

  const state = appendWorkspaceToOAuthState(crypto.randomUUID(), workspaceId);
  const origin = url.origin;

  let loginUrl: string;
  try {
    loginUrl = buildLinkedInLoginUrl(state, origin);
  } catch (error) {
    console.error('[linkedin/login]', error);
    const dest = new URL('/admin/settings/socials', request.url);
    dest.searchParams.set('error', 'linkedin_oauth_failed');
    return NextResponse.redirect(dest);
  }

  const res = NextResponse.redirect(loginUrl);
  res.cookies.set(LINKEDIN_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10,
  });
  if (workspaceId) setActiveWorkspaceCookies(res, workspaceId);
  return res;
}

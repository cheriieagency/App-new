/**
 * GET /api/auth/pinterest/login?workspaceId=…
 * Starts Pinterest OAuth 2.0 bound to the active workspace.
 */

import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { missingEnvKeys, pinterestEnv } from '@/lib/config/env';
import {
  PINTEREST_OAUTH_STATE_COOKIE,
  buildPinterestLoginUrl,
} from '@/lib/pinterest/oauth';
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
    platform: 'pinterest',
    error: reason,
    detail,
    continueHref: `${dest.pathname}${dest.search}`,
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;

  const missing = missingEnvKeys(...pinterestEnv.requiredKeys);
  if (missing.length) {
    // Prefer popup HTML over JSON 503 so the opener can show a real error.
    return popupFail(
      origin,
      'missing_env',
      `Missing ${missing.join(', ')}. Add them to apps/web/.env.local.`
    );
  }

  const jar = await cookies();
  const workspaceId =
    url.searchParams.get('workspaceId')?.trim() ||
    jar.get(ACTIVE_WORKSPACE_COOKIE)?.value ||
    jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value ||
    null;

  if (!workspaceId) {
    return popupFail(origin, 'missing_workspace_id');
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    const signIn = new URL('/account/signin', request.url);
    signIn.searchParams.set(
      'callbackUrl',
      `/api/auth/pinterest/login?workspaceId=${encodeURIComponent(workspaceId)}`
    );
    return NextResponse.redirect(signIn);
  }

  // CSRF nonce + workspace binding embedded in OAuth state.
  const state = appendWorkspaceToOAuthState(crypto.randomUUID(), workspaceId);

  let loginUrl: string;
  try {
    loginUrl = buildPinterestLoginUrl(state, origin);
  } catch (error) {
    console.error('[pinterest/login]', error);
    return popupFail(origin, 'pinterest_oauth_failed');
  }

  const res = NextResponse.redirect(loginUrl);
  res.cookies.set(PINTEREST_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10,
  });
  setActiveWorkspaceCookies(res, workspaceId);
  return res;
}

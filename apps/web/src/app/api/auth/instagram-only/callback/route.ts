/**
 * GET /api/auth/instagram-only/callback
 *
 * Instagram Login API callback (no Facebook Page required):
 *  a) Receive authorization code
 *  b) POST api.instagram.com/oauth/access_token
 *  c) GET graph.instagram.com/me (id, username, name, profile_picture_url)
 *  d) Persist as connected Instagram account (token_source=instagram_login)
 */

import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  IG_ONLY_OAUTH_STATE_COOKIE,
  exchangeInstagramOnlyCode,
  exchangeInstagramOnlyLongLivedToken,
  fetchInstagramOnlyProfile,
  getInstagramOnlyCallbackUrl,
  INSTAGRAM_ONLY_OAUTH_SCOPES,
  instagramOnlyOAuthCookieDomain,
} from '@/lib/instagram/oauth';
import { oauthPopupCompleteResponse } from '@/lib/oauth/popup-callback';
import { upsertSocialAccountRow } from '@/lib/social/persist';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
  baseOAuthState,
  resolveOAuthWorkspaceId,
  setActiveWorkspaceCookies,
} from '@/lib/social/oauth-workspace';
import { resolveOwnedWorkspaceForOAuth } from '@/lib/social/workspace-access';

function resolveRequestOrigin(request: Request): string {
  const forwardedHost = request.headers
    .get('x-forwarded-host')
    ?.split(',')[0]
    ?.trim();
  const forwardedProto = request.headers
    .get('x-forwarded-proto')
    ?.split(',')[0]
    ?.trim();
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

function clearOAuthState(res: NextResponse, origin: string) {
  const cookieDomain = instagramOnlyOAuthCookieDomain(origin);
  res.cookies.set(IG_ONLY_OAUTH_STATE_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' || origin.startsWith('https'),
    path: '/',
    maxAge: 0,
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  });
}

function failRedirect(
  origin: string,
  reason: string,
  detail?: string
): NextResponse {
  const dest = new URL('/admin/settings/socials', origin);
  dest.searchParams.set('error', reason);
  if (detail) dest.searchParams.set('detail', detail.slice(0, 180));
  const res = oauthPopupCompleteResponse({
    success: false,
    platform: 'instagram',
    error: reason,
    detail,
    continueHref: `${dest.pathname}${dest.search}`,
  });
  clearOAuthState(res, origin);
  return res;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code')?.trim() || null;
  const state = url.searchParams.get('state')?.trim() || null;
  const oauthError =
    url.searchParams.get('error') ||
    url.searchParams.get('error_type') ||
    null;
  const oauthErrorDesc =
    url.searchParams.get('error_description') ||
    url.searchParams.get('error_message') ||
    null;
  const origin = resolveRequestOrigin(request);

  if (oauthError) {
    return failRedirect(
      origin,
      'instagram_oauth_failed',
      oauthErrorDesc || oauthError
    );
  }
  if (!code) {
    return failRedirect(origin, 'instagram_oauth_failed', 'missing_code');
  }

  const jar = await cookies();
  const expectedState = jar.get(IG_ONLY_OAUTH_STATE_COOKIE)?.value;
  if (
    !state ||
    !expectedState ||
    (state !== expectedState &&
      baseOAuthState(state) !== baseOAuthState(expectedState))
  ) {
    return failRedirect(
      origin,
      'instagram_oauth_failed',
      'invalid_state — retry Connect from the same host (www vs non-www)'
    );
  }

  const preferredWorkspaceId =
    resolveOAuthWorkspaceId({
      state,
      jarGet: (name) => jar.get(name)?.value,
    }) ||
    jar.get(ACTIVE_WORKSPACE_COOKIE)?.value ||
    jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value ||
    null;

  let session: Awaited<ReturnType<typeof auth.api.getSession>> = null;
  try {
    session = await auth.api.getSession({ headers: await headers() });
  } catch (error) {
    console.warn('[instagram-only/callback] session read failed', error);
  }

  const sessionUser = session?.user;
  const userId = sessionUser?.id?.trim();
  if (!sessionUser || !userId) {
    return failRedirect(origin, 'unauthorized', 'missing_session');
  }

  const workspaceId = await resolveOwnedWorkspaceForOAuth({
    userId,
    email: sessionUser.email ?? null,
    preferredWorkspaceId,
  });

  if (!workspaceId) {
    return failRedirect(
      origin,
      'instagram_oauth_failed',
      'workspace_create_failed'
    );
  }

  try {
    console.info('[instagram-only/callback] token exchange', {
      redirect_uri: getInstagramOnlyCallbackUrl(origin),
    });

    // b) Short-lived token from Instagram Login API
    const shortLived = await exchangeInstagramOnlyCode(code, origin);

    // Prefer long-lived (~60d); fall back to short-lived if exchange fails.
    let accessToken = shortLived.access_token;
    let expiresIn: number | null = 60 * 60; // ~1h short-lived default
    try {
      const longLived = await exchangeInstagramOnlyLongLivedToken(
        shortLived.access_token
      );
      accessToken = longLived.access_token;
      expiresIn = longLived.expires_in ?? 60 * 24 * 60 * 60;
    } catch (error) {
      console.warn(
        '[instagram-only/callback] long-lived exchange skipped',
        error
      );
    }

    // c) Profile via graph.instagram.com — never look up Facebook Pages
    const profile = await fetchInstagramOnlyProfile(accessToken);
    const igUserId = profile.id || String(shortLived.user_id);
    if (!igUserId) {
      return failRedirect(
        origin,
        'instagram_oauth_failed',
        'missing_instagram_user_id'
      );
    }

    const username = profile.username?.replace(/^@/, '') || null;
    const handle = username ? `@${username}` : null;
    const displayName = profile.name || username || 'Instagram';

    // d) Persist as Instagram — no Facebook Page lookup / page_id required
    await upsertSocialAccountRow({
      userId,
      platform: 'instagram',
      platformUserId: igUserId,
      platformUserName: displayName,
      accessToken,
      expiresIn,
      avatarUrl: profile.profile_picture_url ?? null,
      handle,
      workspaceId,
      pageId: null,
      pageName: null,
      meta: {
        auth_source: 'instagram_login',
        token_source: 'instagram_login',
        scope: INSTAGRAM_ONLY_OAUTH_SCOPES.join(','),
        // graph.instagram.com user token — not a Facebook Page token
        user_access_token: accessToken,
      },
    });

    const dest = new URL('/admin/settings/socials', origin);
    dest.searchParams.set('success', 'instagram_connected');
    dest.searchParams.set('source', 'instagram_login');
    if (preferredWorkspaceId && preferredWorkspaceId !== workspaceId) {
      dest.searchParams.set('workspace_fallback', workspaceId);
    }

    const res = oauthPopupCompleteResponse({
      success: true,
      platform: 'instagram',
      continueHref: `${dest.pathname}${dest.search}`,
    });
    clearOAuthState(res, origin);
    setActiveWorkspaceCookies(res, workspaceId);
    return res;
  } catch (error) {
    console.error('[instagram-only/callback]', error);
    return failRedirect(
      origin,
      'instagram_oauth_failed',
      error instanceof Error ? error.message : 'unknown_error'
    );
  }
}

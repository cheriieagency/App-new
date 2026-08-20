/**
 * GET /api/auth/callback/tiktok
 * Handles both:
 *  - TikTok Business OAuth (`auth_code` → Business token API → tiktok_tokens)
 *  - Login Kit (`code` + PKCE → open.tiktokapis.com → social_accounts + tiktok_tokens)
 */

import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  TIKTOK_BUSINESS_FLOW_COOKIE,
  exchangeTikTokBusinessAuthCode,
} from '@/lib/tiktok/business-oauth';
import {
  TIKTOK_CODE_VERIFIER_COOKIE,
  TIKTOK_OAUTH_STATE_COOKIE,
  TIKTOK_RETURN_TO_COOKIE,
  exchangeTikTokCode,
  fetchTikTokUserInfo,
  getTikTokCallbackUrl,
  getTikTokSuccessRedirectPath,
} from '@/lib/tiktok/oauth';
import { upsertTikTokToken } from '@/lib/tiktok/tokens-persist';
import { tikTokHasPostingScope } from '@/lib/tiktok/scopes';
import { upsertOAuthSocialAccount } from '@/lib/social/oauth-accounts';
import { resolveOAuthWorkspaceId } from '@/lib/social/oauth-workspace';
import { resolveOwnedWorkspaceForOAuth } from '@/lib/social/workspace-access';
import { oauthPopupCompleteResponse } from '@/lib/oauth/popup-callback';

function clearOAuthCookies(res: NextResponse) {
  const clear = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  };
  res.cookies.set(TIKTOK_OAUTH_STATE_COOKIE, '', clear);
  res.cookies.set(TIKTOK_CODE_VERIFIER_COOKIE, '', clear);
  res.cookies.set(TIKTOK_RETURN_TO_COOKIE, '', clear);
  res.cookies.set(TIKTOK_BUSINESS_FLOW_COOKIE, '', clear);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  // Business Portal returns `auth_code`; Login Kit returns `code`.
  const authCode =
    url.searchParams.get('auth_code')?.trim() ||
    url.searchParams.get('code')?.trim() ||
    null;
  const state = url.searchParams.get('state')?.trim() || null;
  const oauthError =
    url.searchParams.get('error') ||
    url.searchParams.get('error_type') ||
    null;
  const oauthErrorDesc = url.searchParams.get('error_description');
  const origin = url.origin;

  const jar = await cookies();
  const returnTo = jar.get(TIKTOK_RETURN_TO_COOKIE)?.value || 'settings';
  const successPath = getTikTokSuccessRedirectPath(returnTo);
  const flowHint = jar.get(TIKTOK_BUSINESS_FLOW_COOKIE)?.value || '';
  const isBusinessFlow =
    flowHint === 'business' ||
    Boolean(url.searchParams.get('auth_code')?.trim());

  const fail = (reason: string, detail?: string | null) => {
    const dest = new URL(successPath, origin);
    dest.searchParams.set('error', reason);
    if (detail) dest.searchParams.set('detail', detail.slice(0, 160));
    const res = oauthPopupCompleteResponse({
      success: false,
      platform: 'tiktok',
      error: reason,
      detail: detail || undefined,
      continueHref: `${dest.pathname}${dest.search}`,
    });
    clearOAuthCookies(res);
    return res;
  };

  if (oauthError) {
    return fail(String(oauthError), oauthErrorDesc);
  }
  if (!authCode) return fail('missing_code');
  if (!state) return fail('missing_state');

  const expected = jar.get(TIKTOK_OAUTH_STATE_COOKIE)?.value;
  if (!expected || state !== expected) return fail('invalid_state');

  const workspaceId = resolveOAuthWorkspaceId({
    state,
    jarGet: (name) => jar.get(name)?.value,
  });
  if (!workspaceId) return fail('missing_workspace_id');

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    const signIn = new URL('/account/signin', origin);
    signIn.searchParams.set('callbackUrl', successPath);
    const res = NextResponse.redirect(signIn);
    clearOAuthCookies(res);
    return res;
  }

  const userId = session.user.id;
  const ownedWorkspaceId = await resolveOwnedWorkspaceForOAuth({
    userId,
    preferredWorkspaceId: workspaceId,
    email: session.user.email ?? null,
  });
  if (!ownedWorkspaceId) return fail('workspace_create_failed');

  try {
    let loginKitScope: string | null = null;
    if (isBusinessFlow) {
      console.info('[tiktok/callback] business token exchange', {
        redirect_uri: getTikTokCallbackUrl(origin),
      });

      const tokens = await exchangeTikTokBusinessAuthCode(authCode);
      const openId =
        tokens.open_id ||
        tokens.advertiser_ids?.[0] ||
        `biz_${userId.slice(0, 8)}`;

      await upsertTikTokToken({
        workspaceId: ownedWorkspaceId,
        userId,
        openId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        advertiserIds: tokens.advertiser_ids ?? [],
        scope: tokens.scope,
        tokenSource: 'business',
        expiresIn: tokens.expires_in ?? 24 * 60 * 60,
      });

      await upsertOAuthSocialAccount({
        userId,
        platform: 'tiktok',
        externalId: openId,
        handle: '@tiktok_business',
        displayName: 'TikTok Business',
        avatarUrl: null,
        followersCount: null,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        expiresIn: tokens.expires_in ?? 24 * 60 * 60,
        workspaceId: ownedWorkspaceId,
        scope: Array.isArray(tokens.scope)
          ? tokens.scope.join(',')
          : tokens.scope?.toString() || 'business',
      });
    } else {
      const codeVerifier = jar.get(TIKTOK_CODE_VERIFIER_COOKIE)?.value?.trim();
      if (!codeVerifier) return fail('missing_code_verifier');

      console.info('[tiktok/callback] login kit exchange', {
        redirect_uri: getTikTokCallbackUrl(origin),
      });

      const tokens = await exchangeTikTokCode(authCode, origin, codeVerifier);
      loginKitScope = tokens.scope ?? null;
      const profile = await fetchTikTokUserInfo(tokens.access_token);
      const openId = profile.open_id || tokens.open_id;
      if (!openId) return fail('tiktok_missing_open_id');

      const handle = profile.display_name
        ? `@${profile.display_name.replace(/^@/, '')}`
        : null;

      await upsertTikTokToken({
        workspaceId: ownedWorkspaceId,
        userId,
        openId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        advertiserIds: [],
        scope: tokens.scope ?? null,
        tokenSource: 'login_kit',
        expiresIn: tokens.expires_in ?? null,
      });

      await upsertOAuthSocialAccount({
        userId,
        platform: 'tiktok',
        externalId: openId,
        handle,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
        followersCount: profile.follower_count,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        expiresIn: tokens.expires_in ?? null,
        workspaceId: ownedWorkspaceId,
        scope: tokens.scope ?? null,
      });
    }

    const dest = new URL(successPath, origin);
    dest.searchParams.set('success', 'tiktok_connected');
    if (!isBusinessFlow && !tikTokHasPostingScope(loginKitScope)) {
      dest.searchParams.set('warning', 'tiktok_no_publish_scope');
      dest.searchParams.set('detail', loginKitScope || 'none');
    }
    const res = oauthPopupCompleteResponse({
      success: true,
      platform: 'tiktok',
      continueHref: `${dest.pathname}${dest.search}`,
    });
    clearOAuthCookies(res);
    return res;
  } catch (error) {
    console.error('[tiktok/callback]', error);
    return fail(
      'tiktok_oauth_failed',
      error instanceof Error ? error.message : null
    );
  }
}

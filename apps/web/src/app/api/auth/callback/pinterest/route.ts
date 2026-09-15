/**
 * GET /api/auth/callback/pinterest
 * Pinterest OAuth callback → social_accounts (workspace-bound) → popup close.
 */

import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  PINTEREST_OAUTH_STATE_COOKIE,
  exchangePinterestCode,
  fetchPinterestUserAccount,
} from '@/lib/pinterest/oauth';
import { upsertOAuthSocialAccount } from '@/lib/social/oauth-accounts';
import { resolveOAuthWorkspaceId } from '@/lib/social/oauth-workspace';
import { resolveOwnedWorkspaceForOAuth } from '@/lib/social/workspace-access';
import { oauthPopupCompleteResponse } from '@/lib/oauth/popup-callback';
import { NextResponse } from 'next/server';

function resolveRequestOrigin(request: Request): string {
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  if (forwardedHost) {
    const proto = forwardedProto || 'http';
    try {
      return new URL(`${proto}://${forwardedHost}`).origin;
    } catch {
      /* fall through */
    }
  }
  return new URL(request.url).origin;
}

function clearState(res: NextResponse) {
  res.cookies.set(PINTEREST_OAUTH_STATE_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');
  const origin = resolveRequestOrigin(request);

  const fail = (reason: string, detail?: string) => {
    const dest = new URL('/admin/settings/socials', origin);
    dest.searchParams.set('error', reason);
    if (detail) dest.searchParams.set('detail', detail.slice(0, 180));
    const res = oauthPopupCompleteResponse({
      success: false,
      platform: 'pinterest',
      error: reason,
      detail,
      continueHref: `${dest.pathname}${dest.search}`,
    });
    clearState(res);
    return res;
  };

  if (oauthError) return fail(oauthError);
  if (!code) return fail('missing_code');

  const jar = await cookies();
  const expected = jar.get(PINTEREST_OAUTH_STATE_COOKIE)?.value;
  if (!state || !expected || state !== expected) return fail('invalid_state');

  const workspaceId = resolveOAuthWorkspaceId({
    state,
    jarGet: (name) => jar.get(name)?.value,
  });
  if (!workspaceId) return fail('missing_workspace_id');

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    // Do not redirect away with the one-time code — popup error so user can retry.
    return fail(
      'session_expired',
      'Sign in again, then click Connect Pinterest.'
    );
  }

  const userId = session.user.id;
  const ownedWorkspaceId = await resolveOwnedWorkspaceForOAuth({
    userId,
    preferredWorkspaceId: workspaceId,
    email: session.user.email ?? null,
  });
  if (!ownedWorkspaceId) return fail('workspace_create_failed');

  try {
    const tokens = await exchangePinterestCode(code, origin);
    const profile = await fetchPinterestUserAccount(tokens.access_token);
    const username = (profile.username || '').trim();
    // Prefer stable id when present; fall back to username.
    const externalId = String(profile.id || username || '').trim();
    if (!externalId) return fail('pinterest_missing_account_id');

    await upsertOAuthSocialAccount({
      userId,
      platform: 'pinterest',
      externalId,
      handle: username ? `@${username.replace(/^@/, '')}` : `@${externalId}`,
      displayName: username || externalId,
      avatarUrl: profile.profile_image ?? null,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresIn: tokens.expires_in ?? null,
      workspaceId: ownedWorkspaceId,
      scope: tokens.scope ?? null,
    });

    const dest = new URL('/admin/settings/socials', origin);
    dest.searchParams.set('success', 'pinterest_connected');
    const res = oauthPopupCompleteResponse({
      success: true,
      platform: 'pinterest',
      continueHref: `${dest.pathname}${dest.search}`,
    });
    clearState(res);
    return res;
  } catch (error) {
    console.error('[pinterest/callback]', error);
    return fail(
      'pinterest_oauth_failed',
      error instanceof Error ? error.message : undefined
    );
  }
}

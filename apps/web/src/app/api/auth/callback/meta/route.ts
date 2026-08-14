/**
 * GET /api/auth/callback/meta
 *
 * A) Authenticated session (better-auth cookies)
 * B) Resolve owned workspace (preferred → primary → auto-create)
 * C) Exchange code → long-lived user token
 * D) /me/accounts (Pages + IG) + Business Portfolio fallback
 * E) Persist Instagram / Facebook → social_accounts (user_id + workspace_id)
 * F) Redirect /admin/settings/socials?success=…
 *
 * Errors never hard-500 — soft redirect with ?error=…&detail=…
 */

import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  META_OAUTH_STATE_COOKIE,
  decodeMetaOAuthState,
  exchangeCodeForShortLivedToken,
  exchangeForLongLivedToken,
  resolveMetaPagesAndInstagram,
  type MetaOAuthTarget,
} from '@/lib/meta/oauth';
import { upsertMetaSocialAccounts } from '@/lib/meta/social-accounts';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
  baseOAuthState,
  resolveOAuthWorkspaceId,
  setActiveWorkspaceCookies,
} from '@/lib/social/oauth-workspace';
import { resolveWorkspaceForOAuthUser } from '@/lib/social/workspace-access';

function clearOAuthState(res: NextResponse) {
  res.cookies.set(META_OAUTH_STATE_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

function successLabel(target: MetaOAuthTarget): string {
  if (target === 'instagram') return 'instagram_connected';
  if (target === 'facebook') return 'facebook_connected';
  return 'meta_connected';
}

function failRedirect(
  origin: string,
  reason: string,
  detail?: string
): NextResponse {
  const dest = new URL('/admin/settings/socials', origin);
  dest.searchParams.set('error', reason);
  if (detail) {
    dest.searchParams.set('detail', detail.slice(0, 180));
  }
  const res = NextResponse.redirect(dest);
  clearOAuthState(res);
  return res;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');
  const oauthErrorDesc = url.searchParams.get('error_description');
  const origin = url.origin;

  if (oauthError) {
    return failRedirect(
      origin,
      'meta_fetch_failed',
      oauthErrorDesc || oauthError
    );
  }
  if (!code) {
    return failRedirect(origin, 'meta_fetch_failed', 'missing_code');
  }

  const jar = await cookies();
  const expectedState = jar.get(META_OAUTH_STATE_COOKIE)?.value;
  // Cookie may store full state (with ~ws~) while provider echoes the same value.
  if (
    !state ||
    !expectedState ||
    (state !== expectedState &&
      baseOAuthState(state) !== baseOAuthState(expectedState))
  ) {
    return failRedirect(origin, 'meta_fetch_failed', 'invalid_state');
  }

  const decoded = decodeMetaOAuthState(baseOAuthState(state));
  const target: MetaOAuthTarget = decoded?.target ?? 'both';

  // Preferred workspace: OAuth state → active_workspace_id / nc_active_workspace_id cookies.
  const preferredWorkspaceId = resolveOAuthWorkspaceId({
    state,
    jarGet: (name) => jar.get(name)?.value,
  });

  // 1) Authenticated session from better-auth cookies (app auth — not Supabase Auth).
  let session: Awaited<ReturnType<typeof auth.api.getSession>> = null;
  try {
    session = await auth.api.getSession({ headers: await headers() });
  } catch (error) {
    console.warn('[meta/callback] session read failed', error);
  }

  const sessionUser = session?.user;
  const userId = sessionUser?.id?.trim();
  if (!sessionUser || !userId) {
    return failRedirect(origin, 'unauthorized', 'missing_session');
  }

  // 2) Robust workspace resolution — never false-positive workspace_forbidden.
  //    preferred (if owned/claimable) → user's primary workspace → auto-create.
  const workspaceAccess = await resolveWorkspaceForOAuthUser({
    userId,
    preferredWorkspaceId:
      preferredWorkspaceId ||
      jar.get(ACTIVE_WORKSPACE_COOKIE)?.value ||
      jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value ||
      null,
    email: sessionUser.email ?? null,
  });

  if (!workspaceAccess.ok) {
    return failRedirect(origin, 'meta_fetch_failed', workspaceAccess.error);
  }

  const workspaceId = workspaceAccess.workspaceId;

  try {
    // Step A — code → short-lived → long-lived user access token
    let longLived: { access_token: string; expires_in?: number };
    try {
      const shortLived = await exchangeCodeForShortLivedToken(code, origin);
      longLived = await exchangeForLongLivedToken(shortLived.access_token);
    } catch (error) {
      console.error('[meta/callback] token exchange failed', error);
      return failRedirect(
        origin,
        'meta_fetch_failed',
        error instanceof Error ? error.message : 'token_exchange_failed'
      );
    }

    // Step B + C — /me/accounts, then Business Portfolio fallback
    let resolved: Awaited<ReturnType<typeof resolveMetaPagesAndInstagram>>;
    try {
      resolved = await resolveMetaPagesAndInstagram(longLived.access_token);
    } catch (error) {
      console.error('[meta/callback] graph fetch failed', error);
      return failRedirect(
        origin,
        'meta_fetch_failed',
        error instanceof Error ? error.message : 'graph_fetch_failed'
      );
    }

    const realPages = resolved.pages.filter(
      (p) => p.access_token && !String(p.id).startsWith('user-')
    );
    const hasIg = Boolean(resolved.instagram?.id);
    const hasFb = realPages.length > 0;

    if (!hasIg && !hasFb) {
      return failRedirect(
        origin,
        'meta_fetch_failed',
        'no_pages_or_instagram_business_account'
      );
    }

    if (target === 'instagram' && !hasIg) {
      return failRedirect(
        origin,
        'no_instagram_business_account',
        'Instagram Business account not found on Pages or Business Portfolio'
      );
    }

    // Step D + E — persist with guaranteed user_id + workspace_id binding.
    try {
      await upsertMetaSocialAccounts({
        userId,
        pages: resolved.pages,
        userAccessToken: longLived.access_token,
        expiresIn: longLived.expires_in,
        target,
        workspaceId,
        instagram: resolved.instagram,
        instagramPage: resolved.instagramPage,
      });
    } catch (error) {
      console.error('[meta/callback] persist failed', error);
      return failRedirect(
        origin,
        'meta_fetch_failed',
        error instanceof Error ? error.message : 'persist_failed'
      );
    }

    // Step E2 — Page-only subscribed_apps (feed,messages,messaging_postbacks).
    try {
      const { subscribePagesAndInstagramAfterOAuth } = await import(
        '@/lib/meta/subscribe-webhooks'
      );
      const primaryPageToken =
        resolved.instagramPage?.access_token ||
        realPages[0]?.access_token ||
        null;
      const subscribeResults = await subscribePagesAndInstagramAfterOAuth({
        pages: realPages,
        fallbackPageAccessToken: primaryPageToken,
      });

      console.log(
        '[meta/callback] subscribed_apps',
        subscribeResults.map(
          (r) =>
            `${r.targetId}:${r.ok ? 'ok' : r.error}${r.usedFallback ? ':fallback' : ''}`
        )
      );
    } catch (subError) {
      console.warn('[meta/callback] subscribed_apps skipped', subError);
    }

    if ((target === 'instagram' || target === 'both') && hasIg) {
      try {
        const { syncMetaDataForUser } = await import('@/lib/meta/sync');
        await syncMetaDataForUser(userId);
      } catch (syncError) {
        console.warn('[meta/callback] sync skipped', syncError);
      }
    }

    // Step F — soft success redirect; sync active workspace cookie to the bound id.
    const dest = new URL('/admin/settings/socials', origin);
    dest.searchParams.set('success', successLabel(target));
    if (target === 'both' && hasFb && !hasIg) {
      dest.searchParams.set('warning', 'no_instagram');
    }
    if (resolved.source !== 'me_accounts') {
      dest.searchParams.set('source', resolved.source);
    }
    if (preferredWorkspaceId && preferredWorkspaceId !== workspaceId) {
      dest.searchParams.set('workspace_fallback', workspaceId);
    }
    const res = NextResponse.redirect(dest);
    clearOAuthState(res);
    setActiveWorkspaceCookies(res, workspaceId);
    return res;
  } catch (error) {
    console.error('[meta/callback]', error);
    return failRedirect(
      origin,
      'meta_fetch_failed',
      error instanceof Error ? error.message : 'unknown_error'
    );
  }
}

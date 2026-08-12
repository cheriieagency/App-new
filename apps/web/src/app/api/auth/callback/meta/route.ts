/**
 * GET /api/auth/callback/meta
 *
 * A) Exchange code → long-lived user token
 * B) /me/accounts (Pages + IG)
 * C) Business Portfolio fallback via /me?fields=…accounts…
 * D) Persist Instagram Business account → social_accounts
 * E) Persist Facebook Pages → social_accounts
 * F) Redirect /admin/settings/socials?success=meta_connected
 *
 * Errors never hard-500 — soft redirect with ?error=meta_fetch_failed&detail=…
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
import { ACTIVE_WORKSPACE_COOKIE } from '@/lib/social/persist';

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
  if (!state || !expectedState || state !== expectedState) {
    return failRedirect(origin, 'meta_fetch_failed', 'invalid_state');
  }

  const decoded = decodeMetaOAuthState(state);
  const target: MetaOAuthTarget = decoded?.target ?? 'both';

  let session: Awaited<ReturnType<typeof auth.api.getSession>> = null;
  try {
    session = await auth.api.getSession({ headers: await headers() });
  } catch (error) {
    console.warn('[meta/callback] session read failed', error);
  }
  if (!session?.user) {
    const signIn = new URL('/account/signin', origin);
    signIn.searchParams.set('callbackUrl', '/admin/settings/socials');
    return NextResponse.redirect(signIn);
  }

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

    // Step D + E — persist Instagram / Facebook into public.social_accounts
    try {
      await upsertMetaSocialAccounts({
        userId: session.user.id,
        pages: resolved.pages,
        userAccessToken: longLived.access_token,
        expiresIn: longLived.expires_in,
        target,
        workspaceId: jar.get(ACTIVE_WORKSPACE_COOKIE)?.value ?? null,
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

    if ((target === 'instagram' || target === 'both') && hasIg) {
      try {
        const { syncMetaDataForUser } = await import('@/lib/meta/sync');
        await syncMetaDataForUser(session.user.id);
      } catch (syncError) {
        console.warn('[meta/callback] sync skipped', syncError);
      }
    }

    // Step F — soft success redirect (never 500)
    const dest = new URL('/admin/settings/socials', origin);
    dest.searchParams.set('success', successLabel(target));
    if (target === 'both' && hasFb && !hasIg) {
      dest.searchParams.set('warning', 'no_instagram');
    }
    if (resolved.source !== 'me_accounts') {
      dest.searchParams.set('source', resolved.source);
    }
    const res = NextResponse.redirect(dest);
    clearOAuthState(res);
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

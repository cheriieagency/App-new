/**
 * GET /api/auth/callback/meta
 * OAuth callback — code → long-lived token → Graph me/accounts →
 * upsert social_accounts filtered by OAuth target → sync → redirect.
 */

import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  META_OAUTH_STATE_COOKIE,
  decodeMetaOAuthState,
  exchangeCodeForShortLivedToken,
  exchangeForLongLivedToken,
  fetchMetaPagesWithInstagram,
  findInstagramAcrossPages,
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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');
  const origin = url.origin;

  const failRedirect = (reason: string) => {
    const dest = new URL('/admin/settings/socials', origin);
    dest.searchParams.set('error', reason);
    const res = NextResponse.redirect(dest);
    clearOAuthState(res);
    return res;
  };

  if (oauthError) {
    return failRedirect(oauthError);
  }
  if (!code) {
    return failRedirect('missing_code');
  }

  const jar = await cookies();
  const expectedState = jar.get(META_OAUTH_STATE_COOKIE)?.value;
  if (!state || !expectedState || state !== expectedState) {
    return failRedirect('invalid_state');
  }

  const decoded = decodeMetaOAuthState(state);
  const target: MetaOAuthTarget = decoded?.target ?? 'both';

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    const signIn = new URL('/account/signin', origin);
    signIn.searchParams.set('callbackUrl', '/admin/settings/socials');
    return NextResponse.redirect(signIn);
  }

  try {
    const shortLived = await exchangeCodeForShortLivedToken(code, origin);
    const longLived = await exchangeForLongLivedToken(shortLived.access_token);
    // Graph: /v19.0/me/accounts?fields=id,name,access_token,tasks,instagram_business_account{…}
    const pages = await fetchMetaPagesWithInstagram(longLived.access_token);

    if (!pages.length) {
      const dest = new URL('/admin/settings/socials', origin);
      dest.searchParams.set('error', 'no_pages');
      const res = NextResponse.redirect(dest);
      clearOAuthState(res);
      return res;
    }

    // Search every page — IG is often linked to a non-primary Page, not pages[0].
    const igMatch = findInstagramAcrossPages(pages);
    const hasIg = Boolean(igMatch?.ig.id);

    // Instagram-only connect requires a linked IG Business account on any Page.
    if (target === 'instagram' && !hasIg) {
      const dest = new URL('/admin/settings/socials', origin);
      dest.searchParams.set('error', 'no_instagram_business_account');
      const res = NextResponse.redirect(dest);
      clearOAuthState(res);
      return res;
    }

    await upsertMetaSocialAccounts({
      userId: session.user.id,
      pages,
      expiresIn: longLived.expires_in,
      target,
      workspaceId: jar.get(ACTIVE_WORKSPACE_COOKIE)?.value ?? null,
    });

    const shouldSync = target === 'instagram' || target === 'both' ? hasIg : false;
    if (shouldSync) {
      try {
        const { syncMetaDataForUser } = await import('@/lib/meta/sync');
        await syncMetaDataForUser(session.user.id);
      } catch (syncError) {
        console.warn('[meta/callback] sync skipped', syncError);
      }
    }

    const dest = new URL('/admin/settings/socials', origin);
    dest.searchParams.set('success', successLabel(target));
    if ((target === 'both' || target === 'facebook') && !hasIg && target === 'both') {
      dest.searchParams.set('warning', 'no_instagram');
    }
    const res = NextResponse.redirect(dest);
    clearOAuthState(res);
    return res;
  } catch (error) {
    console.error('[meta/callback]', error);
    return failRedirect('meta_oauth_failed');
  }
}

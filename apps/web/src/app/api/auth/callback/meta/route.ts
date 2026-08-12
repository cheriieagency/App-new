import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  META_OAUTH_STATE_COOKIE,
  exchangeCodeForShortLivedToken,
  exchangeForLongLivedToken,
  fetchMetaPagesWithInstagram,
} from '@/lib/meta/oauth';
import { upsertMetaSocialAccounts } from '@/lib/meta/social-accounts';

function clearOAuthState(res: NextResponse) {
  res.cookies.set(META_OAUTH_STATE_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

/**
 * GET /api/auth/callback/meta
 * OAuth callback — code → long-lived token → pages/IG → social_accounts → redirect.
 * Empty page/IG lists redirect softly (no throw, session kept).
 */
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

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    const signIn = new URL('/account/signin', origin);
    signIn.searchParams.set('callbackUrl', '/admin/settings/socials');
    return NextResponse.redirect(signIn);
  }

  try {
    const shortLived = await exchangeCodeForShortLivedToken(code, origin);
    const longLived = await exchangeForLongLivedToken(shortLived.access_token);
    const pages = await fetchMetaPagesWithInstagram(longLived.access_token);

    // Soft path: OAuth succeeded but user selected no Pages / has no IG Business.
    if (!pages.length) {
      const dest = new URL('/admin/settings/socials', origin);
      dest.searchParams.set('error', 'no_pages');
      const res = NextResponse.redirect(dest);
      clearOAuthState(res);
      return res;
    }

    const hasIg = pages.some((p) => Boolean(p.instagram_business_account?.id));
    await upsertMetaSocialAccounts({
      userId: session.user.id,
      pages,
      expiresIn: longLived.expires_in,
    });

    // Pull Graph insights / media / comments into Analytics, Inbox, Planner.
    try {
      const { syncMetaDataForUser } = await import('@/lib/meta/sync');
      await syncMetaDataForUser(session.user.id);
    } catch (syncError) {
      console.warn('[meta/callback] sync skipped', syncError);
    }

    const dest = new URL('/admin/settings/socials', origin);
    dest.searchParams.set('success', 'meta_connected');
    if (!hasIg) {
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

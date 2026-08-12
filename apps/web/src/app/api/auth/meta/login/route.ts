/**
 * GET /api/auth/meta/login?target=instagram|facebook|both
 * Starts Meta OAuth with full Pages + Instagram scopes; persists target in state cookie.
 *
 * Scope string (explicit):
 * public_profile,email,pages_show_list,pages_read_engagement,pages_manage_posts,
 * instagram_basic,instagram_content_publish,instagram_manage_insights
 *
 * Always sends auth_type=rerequest + prompt=consent so Meta re-asks page permissions.
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { metaEnv, missingEnvResponse } from '@/lib/config/env';
import {
  META_OAUTH_SCOPES,
  META_OAUTH_STATE_COOKIE,
  buildMetaLoginUrl,
  encodeMetaOAuthState,
  parseMetaOAuthTarget,
} from '@/lib/meta/oauth';

export async function GET(request: Request) {
  if (!metaEnv.appId() || !metaEnv.appSecret()) {
    return missingEnvResponse(['META_APP_ID', 'META_APP_SECRET'], 'Meta OAuth');
  }

  const url = new URL(request.url);
  const target = parseMetaOAuthTarget(url.searchParams.get('target'));

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    const signIn = new URL('/account/signin', request.url);
    signIn.searchParams.set(
      'callbackUrl',
      `/api/auth/meta/login?target=${target}`
    );
    return NextResponse.redirect(signIn);
  }

  const nonce = crypto.randomUUID();
  const state = encodeMetaOAuthState(nonce, target);
  const origin = url.origin;

  let loginUrl: string;
  try {
    loginUrl = buildMetaLoginUrl(state, origin, target);
    // Defensive: guarantee required scopes + re-consent params are present.
    const parsed = new URL(loginUrl);
    parsed.searchParams.set('scope', META_OAUTH_SCOPES.join(','));
    parsed.searchParams.set('auth_type', 'rerequest');
    parsed.searchParams.set('prompt', 'consent');
    loginUrl = parsed.toString();
  } catch (error) {
    console.error('[meta/login]', error);
    return Response.json({ error: 'Failed to build Meta login URL' }, { status: 500 });
  }

  const res = NextResponse.redirect(loginUrl);
  // Cookie mirrors OAuth state (nonce.target) through Meta's redirect.
  res.cookies.set(META_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10,
  });
  return res;
}

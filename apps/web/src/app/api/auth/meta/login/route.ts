/**
 * GET /api/auth/meta/login?target=instagram|facebook|both
 * Starts Meta OAuth with target-scoped scopes; persists target in state cookie.
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { metaEnv, missingEnvResponse } from '@/lib/config/env';
import {
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

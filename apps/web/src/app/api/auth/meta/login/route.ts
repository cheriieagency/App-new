import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { metaEnv, missingEnvResponse } from '@/lib/config/env';
import {
  META_OAUTH_STATE_COOKIE,
  buildMetaLoginUrl,
} from '@/lib/meta/oauth';

/**
 * GET /api/auth/meta/login
 * Starts Meta OAuth — redirects to Facebook dialog/oauth.
 */
export async function GET(request: Request) {
  if (!metaEnv.appId() || !metaEnv.appSecret()) {
    return missingEnvResponse(['META_APP_ID', 'META_APP_SECRET'], 'Meta OAuth');
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    const signIn = new URL('/account/signin', request.url);
    signIn.searchParams.set('callbackUrl', '/api/auth/meta/login');
    return NextResponse.redirect(signIn);
  }

  const state = crypto.randomUUID();
  const origin = new URL(request.url).origin;

  let loginUrl: string;
  try {
    loginUrl = buildMetaLoginUrl(state, origin);
  } catch (error) {
    console.error('[meta/login]', error);
    return Response.json({ error: 'Failed to build Meta login URL' }, { status: 500 });
  }

  const res = NextResponse.redirect(loginUrl);
  res.cookies.set(META_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10,
  });
  return res;
}

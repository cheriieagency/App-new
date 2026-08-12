/**
 * GET /api/auth/linkedin/login
 * Starts LinkedIn OAuth (OpenID + w_member_social).
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { missingEnvKeys, missingEnvResponse, linkedinEnv } from '@/lib/config/env';
import {
  LINKEDIN_OAUTH_STATE_COOKIE,
  buildLinkedInLoginUrl,
} from '@/lib/linkedin/oauth';

export async function GET(request: Request) {
  const missing = missingEnvKeys(...linkedinEnv.requiredKeys);
  if (missing.length) {
    return missingEnvResponse(missing, 'LinkedIn Share API');
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    const signIn = new URL('/account/signin', request.url);
    signIn.searchParams.set('callbackUrl', '/api/auth/linkedin/login');
    return NextResponse.redirect(signIn);
  }

  const state = crypto.randomUUID();
  const origin = new URL(request.url).origin;

  let loginUrl: string;
  try {
    loginUrl = buildLinkedInLoginUrl(state, origin);
  } catch (error) {
    console.error('[linkedin/login]', error);
    return Response.json({ error: 'Failed to build LinkedIn login URL' }, { status: 500 });
  }

  const res = NextResponse.redirect(loginUrl);
  res.cookies.set(LINKEDIN_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10,
  });
  return res;
}

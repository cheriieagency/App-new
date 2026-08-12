/**
 * GET /api/auth/youtube/login
 * Starts Google OAuth for YouTube Data API v3.
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { missingEnvKeys, missingEnvResponse, youtubeEnv } from '@/lib/config/env';
import {
  YOUTUBE_OAUTH_STATE_COOKIE,
  buildYouTubeLoginUrl,
} from '@/lib/youtube/oauth';

export async function GET(request: Request) {
  const missing = missingEnvKeys(...youtubeEnv.oauthRequiredKeys);
  if (missing.length) {
    return missingEnvResponse(missing, 'YouTube (Google OAuth)');
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    const signIn = new URL('/account/signin', request.url);
    signIn.searchParams.set('callbackUrl', '/api/auth/youtube/login');
    return NextResponse.redirect(signIn);
  }

  const state = crypto.randomUUID();
  const origin = new URL(request.url).origin;

  let loginUrl: string;
  try {
    loginUrl = buildYouTubeLoginUrl(state, origin);
  } catch (error) {
    console.error('[youtube/login]', error);
    return Response.json({ error: 'Failed to build YouTube login URL' }, { status: 500 });
  }

  const res = NextResponse.redirect(loginUrl);
  res.cookies.set(YOUTUBE_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10,
  });
  return res;
}

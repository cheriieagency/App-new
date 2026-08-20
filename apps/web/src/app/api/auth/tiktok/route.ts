/**
 * GET /api/auth/tiktok
 * Compatibility entry — routes to profile or business based on `flow` query.
 * Prefer the explicit endpoints:
 *   /api/auth/tiktok/profile  — Login Kit (posting & analytics)
 *   /api/auth/tiktok/business — Business API (DMs & ads)
 */

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const flow = (url.searchParams.get('flow') || 'auto').trim().toLowerCase();

  const target =
    flow === 'business' || flow === 'biz'
      ? '/api/auth/tiktok/business'
      : flow === 'login_kit' || flow === 'login' || flow === 'posting' || flow === 'profile'
        ? '/api/auth/tiktok/profile'
        : // Default to profile for organic posting when unspecified
          '/api/auth/tiktok/profile';

  const dest = new URL(target, url.origin);
  url.searchParams.forEach((value, key) => {
    if (key === 'flow') return;
    dest.searchParams.set(key, value);
  });
  return NextResponse.redirect(dest);
}

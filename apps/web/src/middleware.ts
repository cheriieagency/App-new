import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  CREATOR_ROUTE_PREFIXES,
  MEMBER_ROUTE_PREFIXES,
  PLATFORM_ROLE_COOKIE,
  homeForRole,
  isCreatorRole,
  normalizePlatformRole,
  pathMatchesPrefix,
} from '@/lib/platform-role';

/**
 * Enforce member ↔ creator split:
 * - Members may only use dashboard (+ related member routes)
 * - Creators/admins may only use admin / planner
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = normalizePlatformRole(request.cookies.get(PLATFORM_ROLE_COOKIE)?.value);
  const creator = isCreatorRole(role);

  if (creator && pathMatchesPrefix(pathname, MEMBER_ROUTE_PREFIXES)) {
    return NextResponse.redirect(new URL(homeForRole(role), request.url));
  }

  if (!creator && pathMatchesPrefix(pathname, CREATOR_ROUTE_PREFIXES)) {
    return NextResponse.redirect(new URL(homeForRole(role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/communities/:path*',
    '/events/:path*',
    '/classroom/:path*',
    '/live/:path*',
    '/admin/:path*',
    '/planner/:path*',
  ],
};

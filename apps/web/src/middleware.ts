import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  CREATOR_ROUTE_PREFIXES,
  LEGACY_DUAL_COOKIE,
  MEMBER_ROUTE_PREFIXES,
  PLATFORM_ROLE_COOKIE,
  homeForRole,
  isCreatorRole,
  parsePlatformRoleCookie,
  pathMatchesPrefix,
} from '@/lib/platform-role';

/**
 * Enforce member ↔ creator split:
 * - Members may only use dashboard (+ related member routes)
 * - Creators/admins may only use admin / planner
 * - Dual-access is encoded in the role cookie (`member+dual` / `creator+dual`)
 *   Legacy `clikd_dual_access=1` is still honored during migration.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const parsed = parsePlatformRoleCookie(
    request.cookies.get(PLATFORM_ROLE_COOKIE)?.value
  );
  const legacyDual = request.cookies.get(LEGACY_DUAL_COOKIE)?.value === '1';
  const dual = parsed.dual || legacyDual;
  const creator = isCreatorRole(parsed.role);

  // Dual-access QA accounts keep both member + creator studios open.
  if (dual) {
    return NextResponse.next();
  }

  if (creator && pathMatchesPrefix(pathname, MEMBER_ROUTE_PREFIXES)) {
    return NextResponse.redirect(new URL(homeForRole(parsed.role), request.url));
  }

  if (!creator && pathMatchesPrefix(pathname, CREATOR_ROUTE_PREFIXES)) {
    return NextResponse.redirect(new URL(homeForRole(parsed.role), request.url));
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

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
import {
  SITE_GATE_API_PATH,
  SITE_GATE_COOKIE,
  SITE_GATE_COOKIE_VALUE,
  SITE_GATE_PATH,
} from '@/lib/site-gate';

/**
 * 1) Site-wide preview gate — require password cookie before any page/API.
 * 2) Member ↔ creator route split (unchanged).
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow the gate UI + unlock endpoint without a cookie.
  const isGateRoute =
    pathname === SITE_GATE_PATH ||
    pathname.startsWith(`${SITE_GATE_PATH}/`) ||
    pathname === SITE_GATE_API_PATH ||
    pathname.startsWith(`${SITE_GATE_API_PATH}/`);

  const unlocked =
    request.cookies.get(SITE_GATE_COOKIE)?.value === SITE_GATE_COOKIE_VALUE;

  if (!unlocked && !isGateRoute) {
    const gateUrl = request.nextUrl.clone();
    gateUrl.pathname = SITE_GATE_PATH;
    gateUrl.search = '';
    // Remember where the visitor tried to go so we can send them back after unlock.
    if (pathname !== '/' && !pathname.startsWith('/_next')) {
      gateUrl.searchParams.set('next', pathname);
    }
    return NextResponse.redirect(gateUrl);
  }

  // Already unlocked — skip the gate page.
  if (unlocked && pathname === SITE_GATE_PATH) {
    return NextResponse.redirect(new URL('/', request.url));
  }

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
    /*
     * Run on all app/API routes; skip Next internals and common static assets.
     */
    '/((?!_next/static|_next/image|favicon\\.ico|favicon\\.png|fontawesome|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)',
  ],
};

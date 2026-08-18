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

/** Platform hosts that should NOT trigger custom-domain rewrites. */
function isPlatformHost(host: string): boolean {
  const h = host.toLowerCase().split(':')[0];
  if (!h) return true;
  if (h === 'localhost' || h === '127.0.0.1' || h.endsWith('.localhost')) {
    return true;
  }
  if (h === 'clikd.app' || h.endsWith('.clikd.app')) return true;
  if (h.endsWith('.vercel.app')) return true;
  return false;
}

/**
 * 1) Custom domain → rewrite to public bio (URL bar stays on customer domain)
 * 2) Platform host → enforce member ↔ creator studio split
 *
 * Webhooks bypass ALL checks below (auth / session / CSRF / role redirects).
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ── Public webhooks + media proxy: FIRST exit — before any auth / CSRF / role logic ──
  // TikTok, Meta, Stripe, Resend must never receive 401/403 from middleware.
  if (pathname.startsWith('/api/webhooks') || pathname.startsWith('/api/media')) {
    return NextResponse.next();
  }

  const hostHeader = request.headers.get('host') || '';
  const host = hostHeader.toLowerCase().split(':')[0];

  // Skip static / API / Next internals for custom-domain handling.
  const isAsset =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    /\.\w{2,5}$/.test(pathname);

  if (!isPlatformHost(host) && !isAsset) {
    try {
      const resolveUrl = new URL('/api/domains/resolve', request.url);
      resolveUrl.searchParams.set('host', host);
      const res = await fetch(resolveUrl.toString(), {
        headers: { 'x-middleware-domain-resolve': '1' },
        next: { revalidate: 30 },
      });
      if (res.ok) {
        const data = (await res.json()) as {
          found?: boolean;
          rewrite_bio?: string | null;
          rewrite_community?: string | null;
        };
        if (data.found) {
          const target =
            pathname === '/' || pathname === ''
              ? data.rewrite_bio || data.rewrite_community
              : pathname.startsWith('/communities')
                ? null
                : pathname.startsWith('/bio')
                  ? null
                  : data.rewrite_bio;

          if (target && pathname !== target) {
            const url = request.nextUrl.clone();
            url.pathname = target;
            return NextResponse.rewrite(url);
          }
        }
      }
    } catch {
      /* fall through to normal routing */
    }
  }

  // --- Role split (admin vs member) on platform hosts ---
  if (pathname.startsWith('/account/')) {
    return NextResponse.next();
  }

  const parsed = parsePlatformRoleCookie(
    request.cookies.get(PLATFORM_ROLE_COOKIE)?.value
  );
  const legacyDual = request.cookies.get(LEGACY_DUAL_COOKIE)?.value === '1';
  const dual = parsed.dual || legacyDual;
  const creator = isCreatorRole(parsed.role);

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
    /*
     * Match app routes + /api/webhooks/* so the early bypass above always runs.
     * (Do NOT exclude webhooks from the matcher — that can hide the bypass rule.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  LEGACY_DUAL_COOKIE,
  PLATFORM_ROLE_COOKIE,
  homeForRole,
  isDualAccessEmail,
  normalizePlatformRole,
  parsePlatformRoleCookie,
  serializePlatformRoleCookie,
  type PlatformRole,
} from '@/lib/platform-role';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function cookieBase() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}

function setRoleCookie(
  res: NextResponse,
  role: PlatformRole,
  dual: boolean
) {
  res.cookies.set(PLATFORM_ROLE_COOKIE, serializePlatformRoleCookie(role, dual), {
    ...cookieBase(),
    maxAge: COOKIE_MAX_AGE,
  });
  // Clear legacy dual cookie so middleware only trusts the role cookie.
  res.cookies.set(LEGACY_DUAL_COOKIE, '', {
    ...cookieBase(),
    maxAge: 0,
  });
}

function clearRoleCookies(res: NextResponse) {
  const clear = { ...cookieBase(), maxAge: 0 };
  res.cookies.set(PLATFORM_ROLE_COOKIE, '', clear);
  res.cookies.set(LEGACY_DUAL_COOKIE, '', clear);
}

/** Read current platform role for the signed-in user. */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = parsePlatformRoleCookie(
    request.cookies.get(PLATFORM_ROLE_COOKIE)?.value
  );
  const dualEmail = isDualAccessEmail(session.user.email);
  const legacyDual = request.cookies.get(LEGACY_DUAL_COOKIE)?.value === '1';
  const dual = dualEmail || parsed.dual || legacyDual;
  const role = parsed.role;

  const res = NextResponse.json({
    role,
    home: homeForRole(role),
    dual_access: dual,
  });

  // Heal cookie for existing sessions (dual email / legacy flag → encoded role cookie).
  const current = request.cookies.get(PLATFORM_ROLE_COOKIE)?.value ?? '';
  const expected = serializePlatformRoleCookie(role, dual);
  if (current !== expected || legacyDual) {
    setRoleCookie(res, role, dual);
  }

  return res;
}

/** Persist platform role after Member vs Creator login. */
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { role?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  // Tab chooses preferred home; dual emails may still open either studio.
  const role = normalizePlatformRole(body.role);
  const dual = isDualAccessEmail(session.user.email);
  const res = NextResponse.json({
    role,
    home: homeForRole(role),
    dual_access: dual,
  });
  setRoleCookie(res, role, dual);
  return res;
}

/** Clear platform role on sign-out. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  clearRoleCookies(res);
  return res;
}

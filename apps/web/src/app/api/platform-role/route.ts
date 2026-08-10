import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  PLATFORM_ROLE_COOKIE,
  homeForRole,
  normalizePlatformRole,
  type PlatformRole,
} from '@/lib/platform-role';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function roleCookieOptions(role: PlatformRole) {
  return {
    name: PLATFORM_ROLE_COOKIE,
    value: role,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  };
}

/** Read current platform role for the signed-in user. */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = normalizePlatformRole(request.cookies.get(PLATFORM_ROLE_COOKIE)?.value);
  return NextResponse.json({ role, home: homeForRole(role) });
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

  const role = normalizePlatformRole(body.role);
  const res = NextResponse.json({ role, home: homeForRole(role) });
  res.cookies.set(roleCookieOptions(role));
  return res;
}

/** Clear platform role on sign-out. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: PLATFORM_ROLE_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return res;
}

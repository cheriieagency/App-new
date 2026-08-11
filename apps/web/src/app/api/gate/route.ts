import { NextResponse } from 'next/server';
import {
  SITE_GATE_COOKIE,
  SITE_GATE_COOKIE_VALUE,
  SITE_GATE_PASSWORD,
} from '@/lib/site-gate';

/** Accept the preview password and set an httpOnly unlock cookie. */
export async function POST(request: Request) {
  let password = '';
  try {
    const body = (await request.json()) as { password?: string };
    password = typeof body.password === 'string' ? body.password.trim() : '';
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 });
  }

  if (password !== SITE_GATE_PASSWORD) {
    return NextResponse.json({ ok: false, error: 'Wrong password' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SITE_GATE_COOKIE, SITE_GATE_COOKIE_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

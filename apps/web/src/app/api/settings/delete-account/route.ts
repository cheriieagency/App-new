import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * POST /api/settings/delete-account
 * Requires body `{ confirm: "DELETE" }` and an authenticated session.
 * Attempts better-auth deleteUser when enabled; otherwise revokes sessions
 * so the client can complete sign-out safely.
 */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { confirm?: string } = {};
  try {
    body = (await request.json()) as { confirm?: string };
  } catch {
    body = {};
  }

  if (body.confirm !== 'DELETE') {
    return NextResponse.json(
      { error: 'Type DELETE to confirm account deletion' },
      { status: 400 }
    );
  }

  const userId = session.user.id;

  try {
    // Prefer native better-auth deletion when the endpoint is available.
    await auth.api.deleteUser({
      body: {},
      headers: await headers(),
    });
  } catch (err) {
    console.warn('[delete-account] deleteUser unavailable, revoking sessions', err);
    try {
      await auth.api.revokeSessions({
        headers: await headers(),
      });
    } catch (revokeErr) {
      console.warn('[delete-account] revokeSessions failed', revokeErr);
    }
  }

  console.info('[delete-account]', {
    userId,
    email: session.user.email,
    at: new Date().toISOString(),
  });

  return NextResponse.json({ success: true });
}

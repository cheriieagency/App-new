/**
 * POST /api/auth/meta/disconnect
 * Body: { platform: 'instagram' | 'facebook', platformUserId: string }
 * Deletes ONLY that platform row from social_accounts for the signed-in user.
 */

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  deleteMetaSocialAccount,
  deleteMetaSocialPlatform,
} from '@/lib/meta/social-accounts';

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const platform =
    body && typeof body === 'object' && 'platform' in body
      ? String((body as { platform?: unknown }).platform)
      : '';
  const platformUserId =
    body && typeof body === 'object' && 'platformUserId' in body
      ? String((body as { platformUserId?: unknown }).platformUserId ?? '')
      : '';

  if (platform !== 'instagram' && platform !== 'facebook') {
    return Response.json(
      { error: 'platform must be instagram or facebook' },
      { status: 400 }
    );
  }

  try {
    if (platformUserId.trim()) {
      const result = await deleteMetaSocialAccount({
        userId: session.user.id,
        platform,
        platformUserId,
      });
      return Response.json({
        ok: true,
        deleted: result.deleted,
        platform,
        platformUserId,
      });
    }

    // Fallback: disconnect all rows for that platform for this user.
    const result = await deleteMetaSocialPlatform({
      userId: session.user.id,
      platform,
    });
    return Response.json({
      ok: true,
      deleted: result.deleted > 0,
      count: result.deleted,
      platform,
    });
  } catch (error) {
    console.error('[meta/disconnect]', error);
    return Response.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
}

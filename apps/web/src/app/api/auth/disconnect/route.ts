/**
 * POST /api/auth/disconnect
 * Body: { platform: 'youtube' | 'linkedin' | 'instagram' | 'facebook', platformUserId: string }
 * Deletes ONLY the matching platform row for the signed-in user.
 */

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  deleteOAuthSocialAccount,
  deleteOAuthSocialPlatform,
  type OAuthSocialPlatform,
} from '@/lib/social/oauth-accounts';
import {
  deleteMetaSocialAccount,
  deleteMetaSocialPlatform,
} from '@/lib/meta/social-accounts';

const ALLOWED: OAuthSocialPlatform[] = [
  'youtube',
  'linkedin',
  'instagram',
  'facebook',
];

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

  if (!ALLOWED.includes(platform as OAuthSocialPlatform)) {
    return Response.json(
      {
        error:
          'platform must be youtube, linkedin, instagram, or facebook',
      },
      { status: 400 }
    );
  }

  const p = platform as OAuthSocialPlatform;

  try {
    // Meta rows live in the same table but may also be in the Meta demo store.
    if (p === 'instagram' || p === 'facebook') {
      if (platformUserId.trim()) {
        const result = await deleteMetaSocialAccount({
          userId: session.user.id,
          platform: p,
          platformUserId,
        });
        // Also clear generic demo store if used.
        await deleteOAuthSocialAccount({
          userId: session.user.id,
          platform: p,
          platformUserId,
        });
        return Response.json({
          ok: true,
          deleted: result.deleted,
          platform: p,
          platformUserId,
        });
      }
      const result = await deleteMetaSocialPlatform({
        userId: session.user.id,
        platform: p,
      });
      await deleteOAuthSocialPlatform({
        userId: session.user.id,
        platform: p,
      });
      return Response.json({
        ok: true,
        deleted: result.deleted > 0,
        count: result.deleted,
        platform: p,
      });
    }

    if (platformUserId.trim()) {
      const result = await deleteOAuthSocialAccount({
        userId: session.user.id,
        platform: p,
        platformUserId,
      });
      return Response.json({
        ok: true,
        deleted: result.deleted,
        platform: p,
        platformUserId,
      });
    }

    const result = await deleteOAuthSocialPlatform({
      userId: session.user.id,
      platform: p,
    });
    return Response.json({
      ok: true,
      deleted: result.deleted > 0,
      count: result.deleted,
      platform: p,
    });
  } catch (error) {
    console.error('[auth/disconnect]', error);
    return Response.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
}

/**
 * POST /api/auth/disconnect
 * Body: { platform: 'youtube' | 'linkedin' | 'tiktok' | 'instagram' | 'facebook', platformUserId: string }
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
  'tiktok',
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
  const workspaceId =
    body && typeof body === 'object' && 'workspaceId' in body
      ? String((body as { workspaceId?: unknown }).workspaceId ?? '').trim() ||
        null
      : null;

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
    const { deleteSocialAccountRow } = await import('@/lib/social/persist');
    const result = await deleteSocialAccountRow({
      userId: session.user.id,
      platform: p,
      platformUserId: platformUserId || null,
      workspaceId,
    });

    // Keep Meta/demo helpers in sync when no workspace scope (legacy).
    if (!workspaceId) {
      if (p === 'instagram' || p === 'facebook') {
        if (platformUserId.trim()) {
          await deleteMetaSocialAccount({
            userId: session.user.id,
            platform: p,
            platformUserId,
          });
        } else {
          await deleteMetaSocialPlatform({
            userId: session.user.id,
            platform: p,
          });
        }
      }
      if (platformUserId.trim()) {
        await deleteOAuthSocialAccount({
          userId: session.user.id,
          platform: p,
          platformUserId,
        });
      } else {
        await deleteOAuthSocialPlatform({
          userId: session.user.id,
          platform: p,
        });
      }
    }

    return Response.json({
      ok: true,
      deleted: result.deleted,
      platform: p,
      platformUserId: platformUserId || null,
      workspaceId,
    });
  } catch (error) {
    console.error('[auth/disconnect]', error);
    return Response.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
}

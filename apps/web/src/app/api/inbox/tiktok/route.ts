/**
 * GET  /api/inbox/tiktok — list TikTok DM threads for the active workspace
 * POST /api/inbox/tiktok/send — alias handled by sibling send route
 */

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { requireFeature } from '@/lib/plan-guard';
import { listTikTokInboxThreads } from '@/lib/tiktok/inbox-persist';
import { cookies } from 'next/headers';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
} from '@/lib/social/oauth-workspace';

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const gate = await requireFeature('directMessages', await headers());
  if (gate) return gate;

  const url = new URL(request.url);
  const jar = await cookies();
  const workspaceId =
    url.searchParams.get('workspaceId')?.trim() ||
    request.headers.get('x-workspace-id')?.trim() ||
    jar.get(ACTIVE_WORKSPACE_COOKIE)?.value?.trim() ||
    jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value?.trim() ||
    '';

  if (!workspaceId) {
    return Response.json(
      { error: 'workspace_required', threads: [] },
      { status: 400 }
    );
  }

  try {
    const threads = await listTikTokInboxThreads({
      workspaceId,
      userId: session.user.id,
    });
    return Response.json({ ok: true, threads, demo: false });
  } catch (error) {
    console.error('[GET /api/inbox/tiktok]', error);
    return Response.json(
      {
        error: 'list_failed',
        message: error instanceof Error ? error.message : 'list_failed',
        threads: [],
      },
      { status: 500 }
    );
  }
}

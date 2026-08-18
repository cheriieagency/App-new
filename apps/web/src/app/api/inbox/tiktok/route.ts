/**
 * GET  /api/inbox/tiktok — list TikTok DM threads for the active workspace
 * Falls back to mock threads when TIKTOK_BUSINESS_SECRET is not configured
 * (UI testing / automation preview).
 */

import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { requireFeature } from '@/lib/plan-guard';
import { listTikTokInboxThreads } from '@/lib/tiktok/inbox-persist';
import { getMockTikTokInboxThreads } from '@/lib/tiktok/mock-inbox';
import { isTikTokBusinessMockMode } from '@/lib/tiktok/business-oauth';
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

  const mockMode = isTikTokBusinessMockMode();

  try {
    const threads = await listTikTokInboxThreads({
      workspaceId,
      userId: session.user.id,
    });

    // Prefer real DB conversations; seed mock UI when Business secret unset.
    if (threads.length > 0) {
      return Response.json({
        ok: true,
        threads,
        demo: false,
        mock: false,
      });
    }

    if (mockMode) {
      return Response.json({
        ok: true,
        threads: getMockTikTokInboxThreads(),
        demo: true,
        mock: true,
        message:
          'TikTok Business secret not configured — showing mock inbox for UI testing.',
      });
    }

    return Response.json({ ok: true, threads: [], demo: false, mock: false });
  } catch (error) {
    console.error('[GET /api/inbox/tiktok]', error);
    if (mockMode) {
      return Response.json({
        ok: true,
        threads: getMockTikTokInboxThreads(),
        demo: true,
        mock: true,
        message: 'Inbox list failed — serving mock TikTok threads.',
      });
    }
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

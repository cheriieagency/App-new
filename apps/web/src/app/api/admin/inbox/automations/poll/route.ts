/**
 * POST /api/admin/inbox/automations/poll
 * Session-authenticated Comment-to-DM poll for the active workspace.
 * Used by the Automations UI to auto-process new IG comments without
 * manually fetching / running live test DM.
 */

import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
} from '@/lib/social/persist';
import { pollAndProcessCommentAutomations } from '@/lib/dm-automations/poll-comments';
import { resolveStrictUserWorkspace } from '@/lib/social/resolve-user-workspace';
import { requireFeature } from '@/lib/plan-guard';

async function resolveWorkspaceId(
  request: Request,
  bodyWorkspaceId?: unknown
): Promise<string | null> {
  const jar = await cookies();
  const url = new URL(request.url);
  const fromBody =
    typeof bodyWorkspaceId === 'string' ? bodyWorkspaceId.trim() : '';

  return (
    fromBody ||
    url.searchParams.get('workspaceId')?.trim() ||
    url.searchParams.get('workspace_id')?.trim() ||
    request.headers.get('x-workspace-id')?.trim() ||
    request.headers.get('x-active-workspace-id')?.trim() ||
    jar.get(ACTIVE_WORKSPACE_COOKIE)?.value?.trim() ||
    jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value?.trim() ||
    null
  );
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id?.trim();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const planGate = await requireFeature('directMessages', await headers());
    if (planGate) return planGate;

    if (!process.env.DATABASE_URL?.trim()) {
      return NextResponse.json(
        { error: 'database_required', demo: false },
        { status: 503 }
      );
    }

    let body: { workspaceId?: unknown } = {};
    try {
      body = (await request.json()) as { workspaceId?: unknown };
    } catch {
      body = {};
    }

    const preferredWorkspaceId = await resolveWorkspaceId(
      request,
      body.workspaceId
    );
    if (!preferredWorkspaceId) {
      return NextResponse.json({ error: 'workspace_required' }, { status: 400 });
    }

    const access = await resolveStrictUserWorkspace({
      userId,
      preferredWorkspaceId,
      email: session?.user?.email ?? null,
    });
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status === 400 ? 400 : 403 }
      );
    }

    const result = await pollAndProcessCommentAutomations({
      workspaceId: access.workspaceId,
      lookbackMinutes: 45,
      maxCommentsPerAccount: 40,
    });

    return NextResponse.json({
      ok: true,
      workspaceId: access.workspaceId,
      ...result,
    });
  } catch (error) {
    console.error('[POST /api/admin/inbox/automations/poll]', error);
    return NextResponse.json(
      {
        error: 'poll_failed',
        message: error instanceof Error ? error.message : 'Failed',
      },
      { status: 500 }
    );
  }
}

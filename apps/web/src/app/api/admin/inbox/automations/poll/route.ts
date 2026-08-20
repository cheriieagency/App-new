/**
 * POST /api/admin/inbox/automations/poll
 * Session-authenticated Comment-to-DM poll (ownership + plan gated + rate limited).
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

/** Min gap between polls per user (server-side abuse / Meta rate protection). */
const MIN_POLL_GAP_MS = 15_000;
const lastPollByUser = new Map<string, number>();

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

function sameOriginOk(request: Request): boolean {
  const host = request.headers.get('host') || '';
  if (!host) return true;
  const origin = request.headers.get('origin') || '';
  const referer = request.headers.get('referer') || '';
  // Browser fetch with credentials usually sends Origin; allow missing for same-tab.
  if (!origin && !referer) return true;
  try {
    if (origin) {
      const o = new URL(origin);
      return o.host === host;
    }
    if (referer) {
      const r = new URL(referer);
      return r.host === host;
    }
  } catch {
    return false;
  }
  return false;
}

export async function POST(request: Request) {
  try {
    if (!sameOriginOk(request)) {
      return NextResponse.json({ error: 'forbidden_origin' }, { status: 403 });
    }

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

    const now = Date.now();
    const last = lastPollByUser.get(userId) || 0;
    if (now - last < MIN_POLL_GAP_MS) {
      return NextResponse.json({
        ok: true,
        throttled: true,
        retryAfterMs: MIN_POLL_GAP_MS - (now - last),
        sent: 0,
        matched: 0,
        workspacesScanned: 0,
        commentsFetched: 0,
        commentsSkipped: 0,
        errors: [],
        details: [],
      });
    }
    lastPollByUser.set(userId, now);

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
      lookbackMinutes: 180,
      maxCommentsPerAccount: 40,
    });

    return NextResponse.json({
      ok: true,
      throttled: false,
      workspaceId: access.workspaceId,
      intervalSeconds: 20,
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

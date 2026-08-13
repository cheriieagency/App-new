/**
 * POST /api/planner/pinterest/pin
 * Create or schedule a Pinterest Pin for the active workspace connection.
 * Body: { boardId?, title, description?, link?, imageUrl, scheduledAt? }
 */

import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';
import { createPinterestPin, listPinterestBoards } from '@/lib/pinterest/pins';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
} from '@/lib/social/oauth-workspace';

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    boardId?: unknown;
    title?: unknown;
    description?: unknown;
    link?: unknown;
    imageUrl?: unknown;
    scheduledAt?: unknown;
    workspaceId?: unknown;
  } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const title = String(body.title ?? '').trim();
  const imageUrl = String(body.imageUrl ?? '').trim();
  if (!title || !imageUrl) {
    return Response.json(
      { error: 'title and imageUrl are required' },
      { status: 400 }
    );
  }

  const jar = await cookies();
  const workspaceId =
    String(body.workspaceId ?? '').trim() ||
    jar.get(ACTIVE_WORKSPACE_COOKIE)?.value ||
    jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value ||
    null;

  if (!workspaceId) {
    return Response.json({ error: 'workspaceId required' }, { status: 400 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json(
      { error: 'database_unavailable', message: 'DATABASE_URL is not configured' },
      { status: 503 }
    );
  }

  try {
    const rows = await sql`
      SELECT access_token, platform_user_name, handle
      FROM social_accounts
      WHERE user_id = ${session.user.id}
        AND workspace_id = ${workspaceId}
        AND platform = 'pinterest'
      ORDER BY updated_at DESC NULLS LAST
      LIMIT 1
    `;

    const accessToken = rows?.[0]?.access_token as string | undefined;
    if (!accessToken) {
      return Response.json(
        { error: 'pinterest_not_connected', message: 'Connect Pinterest in Settings → Socials' },
        { status: 400 }
      );
    }

    let boardId = String(body.boardId ?? '').trim();
    if (!boardId) {
      const boards = await listPinterestBoards(accessToken);
      boardId = boards[0]?.id ?? '';
    }
    if (!boardId) {
      return Response.json(
        { error: 'no_boards', message: 'No Pinterest boards found for this account' },
        { status: 400 }
      );
    }

    const scheduledAt =
      typeof body.scheduledAt === 'string' && body.scheduledAt.trim()
        ? body.scheduledAt.trim()
        : null;

    const pin = await createPinterestPin({
      accessToken,
      boardId,
      title,
      description: body.description != null ? String(body.description) : undefined,
      link: body.link != null ? String(body.link) : null,
      imageUrl,
      createAt: scheduledAt,
    });

    return Response.json({
      success: true,
      pin,
      boardId,
      scheduled: Boolean(scheduledAt),
      handle: rows?.[0]?.handle ?? rows?.[0]?.platform_user_name ?? null,
    });
  } catch (error) {
    console.error('[planner/pinterest/pin]', error);
    return Response.json(
      {
        error: 'pin_create_failed',
        message: error instanceof Error ? error.message : 'Failed to create Pin',
      },
      { status: 502 }
    );
  }
}

/** GET — list boards for the connected Pinterest account. */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const jar = await cookies();
  const workspaceId =
    url.searchParams.get('workspaceId')?.trim() ||
    jar.get(ACTIVE_WORKSPACE_COOKIE)?.value ||
    jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value ||
    null;

  if (!workspaceId || !process.env.DATABASE_URL?.trim()) {
    return Response.json({ boards: [] });
  }

  try {
    const rows = await sql`
      SELECT access_token
      FROM social_accounts
      WHERE user_id = ${session.user.id}
        AND workspace_id = ${workspaceId}
        AND platform = 'pinterest'
      LIMIT 1
    `;
    const accessToken = rows?.[0]?.access_token as string | undefined;
    if (!accessToken) return Response.json({ boards: [], connected: false });

    const boards = await listPinterestBoards(accessToken);
    return Response.json({ boards, connected: true });
  } catch (error) {
    console.error('[planner/pinterest/pin GET]', error);
    return Response.json({ boards: [], error: 'boards_failed' }, { status: 502 });
  }
}

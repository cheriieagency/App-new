/**
 * GET /api/admin/google/status?workspaceId=…
 * Connection status for Google Drive / Calendar / Meet.
 */

import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
  ensureSocialAccountsSchema,
} from '@/lib/social/persist';
import { requireOwnedWorkspace } from '@/lib/social/workspace-access';

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id?.trim();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const jar = await cookies();
  const workspaceId =
    url.searchParams.get('workspaceId')?.trim() ||
    request.headers.get('x-workspace-id')?.trim() ||
    jar.get(ACTIVE_WORKSPACE_COOKIE)?.value ||
    jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value ||
    null;

  if (!workspaceId || !process.env.DATABASE_URL?.trim()) {
    return Response.json({
      connected: false,
      email: null,
      platformUserId: null,
    });
  }

  const access = await requireOwnedWorkspace(userId, workspaceId);
  if (!access.ok) {
    return Response.json(
      {
        connected: false,
        email: null,
        platformUserId: null,
        error: access.error,
        workspaceId,
      },
      { status: access.status === 400 ? 400 : 403 }
    );
  }

  await ensureSocialAccountsSchema();

  try {
    const rows = await sql`
      SELECT platform_user_id, platform_user_name, handle, avatar_url, connected_at, meta
      FROM public.social_accounts
      WHERE user_id = ${userId}
        AND workspace_id = ${access.workspaceId}
        AND platform = 'google'
      LIMIT 1
    `;
    const row = rows?.[0] as Record<string, unknown> | undefined;
    if (!row) {
      return Response.json({
        connected: false,
        email: null,
        platformUserId: null,
        workspaceId,
      });
    }

    const meta =
      row.meta && typeof row.meta === 'object'
        ? (row.meta as Record<string, unknown>)
        : {};
    const email =
      (typeof meta.email === 'string' && meta.email) ||
      (row.handle && String(row.handle).includes('@')
        ? String(row.handle)
        : null) ||
      (row.platform_user_name && String(row.platform_user_name).includes('@')
        ? String(row.platform_user_name)
        : null);

    return Response.json({
      connected: true,
      email,
      displayName: row.platform_user_name ? String(row.platform_user_name) : null,
      avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
      platformUserId: row.platform_user_id ? String(row.platform_user_id) : null,
      connectedAt: row.connected_at
        ? new Date(String(row.connected_at)).toISOString()
        : null,
      workspaceId,
    });
  } catch (error) {
    console.warn('[google/status]', error);
    return Response.json({
      connected: false,
      email: null,
      platformUserId: null,
      workspaceId,
    });
  }
}

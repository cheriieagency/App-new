/**
 * GET /api/admin/drive/files?workspaceId=…
 * List recent Google Drive files for the picker modal.
 */

import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
} from '@/lib/social/persist';
import { getGoogleAccessTokenForWorkspace } from '@/lib/google/tokens';
import { listDriveFiles } from '@/lib/google/drive';

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized', files: [] }, { status: 401 });
  }

  const url = new URL(request.url);
  const jar = await cookies();
  const workspaceId =
    url.searchParams.get('workspaceId')?.trim() ||
    request.headers.get('x-workspace-id')?.trim() ||
    jar.get(ACTIVE_WORKSPACE_COOKIE)?.value ||
    jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value ||
    null;

  if (!workspaceId) {
    return Response.json({
      ok: false,
      connected: false,
      files: [],
      message: 'Select a workspace first.',
    });
  }

  const tokens = await getGoogleAccessTokenForWorkspace({
    userId: session.user.id,
    workspaceId,
  });

  if (!tokens) {
    return Response.json({
      ok: true,
      connected: false,
      files: [],
      message: 'Connect Google Account to import files directly from Google Drive.',
    });
  }

  try {
    const files = await listDriveFiles(tokens.accessToken, 30);
    return Response.json({
      ok: true,
      connected: true,
      email: tokens.email,
      files,
    });
  } catch (error) {
    console.warn('[drive/files]', error);
    return Response.json(
      {
        ok: false,
        connected: true,
        files: [],
        error: error instanceof Error ? error.message : 'Failed to list Drive files',
      },
      { status: 502 }
    );
  }
}

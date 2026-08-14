/**
 * POST /api/admin/drive/import
 * Body: { fileId, fileName?, mimeType?, workspaceId?, target?: 'media_library' | 'planner' }
 */

import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
} from '@/lib/social/persist';
import { getGoogleAccessTokenForWorkspace } from '@/lib/google/tokens';
import { downloadDriveFile } from '@/lib/google/drive';
import {
  bufferToDataUrl,
  insertMediaLibraryRow,
} from '@/lib/media/library';
import { MEDIA_LIBRARY_ROOT_ID } from '@/lib/mock-media-library';

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB — data-URL friendly

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    fileId?: unknown;
    fileName?: unknown;
    mimeType?: unknown;
    workspaceId?: unknown;
    target?: unknown;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const jar = await cookies();
  const workspaceId =
    (typeof body.workspaceId === 'string' && body.workspaceId.trim()) ||
    request.headers.get('x-workspace-id')?.trim() ||
    jar.get(ACTIVE_WORKSPACE_COOKIE)?.value ||
    jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value ||
    null;

  const fileId = String(body.fileId ?? '').trim();
  if (!workspaceId || !fileId) {
    return Response.json(
      { error: 'workspaceId and fileId are required' },
      { status: 400 }
    );
  }

  const target =
    body.target === 'planner' ? 'planner' : ('media_library' as const);

  const tokens = await getGoogleAccessTokenForWorkspace({
    userId: session.user.id,
    workspaceId,
  });
  if (!tokens) {
    return Response.json(
      {
        error: 'google_not_connected',
        message: 'Connect Google Account to import files from Drive.',
      },
      { status: 400 }
    );
  }

  try {
    const mimeType =
      body.mimeType != null ? String(body.mimeType) : null;
    const downloaded = await downloadDriveFile(
      tokens.accessToken,
      fileId,
      mimeType
    );

    if (downloaded.buffer.byteLength > MAX_BYTES) {
      return Response.json(
        { error: 'File too large (max 12 MB for import)' },
        { status: 413 }
      );
    }

    let fileName =
      (typeof body.fileName === 'string' && body.fileName.trim()) ||
      `drive-${fileId}`;
    if (
      downloaded.exported &&
      downloaded.contentType === 'application/pdf' &&
      !/\.pdf$/i.test(fileName)
    ) {
      fileName = `${fileName}.pdf`;
    }

    const fileUrl = bufferToDataUrl(
      downloaded.buffer,
      downloaded.contentType
    );

    const media = await insertMediaLibraryRow({
      workspaceId,
      userId: session.user.id,
      fileName,
      fileUrl,
      fileType: downloaded.contentType,
      sizeBytes: downloaded.buffer.byteLength,
      source: 'google_drive',
      externalId: fileId,
      target,
      folderId: MEDIA_LIBRARY_ROOT_ID,
      metadata: { mimeType, exported: downloaded.exported },
    });

    return Response.json({
      success: true,
      fileUrl,
      mediaId: media?.id ?? null,
      fileName,
      fileType: downloaded.contentType,
      sizeBytes: downloaded.buffer.byteLength,
      target,
    });
  } catch (error) {
    console.warn('[drive/import]', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Drive import failed',
      },
      { status: 502 }
    );
  }
}

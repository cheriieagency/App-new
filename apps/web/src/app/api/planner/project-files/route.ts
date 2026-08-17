/**
 * GET/POST /api/planner/project-files
 * Project documents & folders (PDFs, docs, etc.) scoped to a campaign.
 */

import { cookies } from 'next/headers';
import { requireApiSession } from '@/lib/auth/require-api-session';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
} from '@/lib/social/oauth-workspace';
import { resolveStrictUserWorkspace } from '@/lib/social/resolve-user-workspace';
import {
  addProjectFile,
  createProjectFileFolder,
  deleteProjectFile,
  deleteProjectFileFolder,
  listProjectFileFolders,
  listProjectFiles,
} from '@/lib/planner/project-files';

async function resolveWorkspaceId(
  request: Request,
  userId: string,
  email?: string | null
): Promise<string> {
  const url = new URL(request.url);
  const jar = await cookies();
  const preferred =
    url.searchParams.get('workspaceId')?.trim() ||
    request.headers.get('x-workspace-id')?.trim() ||
    request.headers.get('x-active-workspace-id')?.trim() ||
    jar.get(ACTIVE_WORKSPACE_COOKIE)?.value ||
    jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value ||
    null;

  const access = await resolveStrictUserWorkspace({
    userId,
    preferredWorkspaceId: preferred,
    email: email ?? null,
  });
  if (!access.ok) return preferred || userId;
  return access.workspaceId;
}

export async function GET(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  const userId = session.user.id;
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get('campaignId')?.trim();
  if (!campaignId) {
    return Response.json({ error: 'campaignId required' }, { status: 400 });
  }

  try {
    const workspaceId = await resolveWorkspaceId(
      request,
      userId,
      session.user.email
    );
    const folderParam = searchParams.get('folderId');
    const folders = await listProjectFileFolders({
      workspaceId,
      userId,
      campaignId,
    });
    const files = await listProjectFiles({
      workspaceId,
      userId,
      campaignId,
      folderId:
        !folderParam || folderParam === 'all'
          ? undefined
          : folderParam === '' || folderParam === 'root'
            ? null
            : folderParam,
    });
    return Response.json({ folders, files });
  } catch (error) {
    console.error('[GET /api/planner/project-files]', error);
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  const userId = session.user.id;

  try {
    const body = await request.json();
    const action = String(body.action ?? '');
    const campaignId = String(body.campaignId ?? '').trim();
    if (!campaignId) {
      return Response.json({ error: 'campaignId required' }, { status: 400 });
    }

    const workspaceId = await resolveWorkspaceId(
      request,
      userId,
      session.user.email
    );

    if (action === 'create_folder') {
      const folder = await createProjectFileFolder({
        workspaceId,
        userId,
        campaignId,
        name: String(body.name ?? ''),
        color: typeof body.color === 'string' ? body.color : undefined,
      });
      const folders = await listProjectFileFolders({
        workspaceId,
        userId,
        campaignId,
      });
      return Response.json({ folder, folders });
    }

    if (action === 'delete_folder') {
      const ok = await deleteProjectFileFolder({
        workspaceId,
        userId,
        campaignId,
        folderId: String(body.folderId ?? body.id ?? ''),
      });
      const folders = await listProjectFileFolders({
        workspaceId,
        userId,
        campaignId,
      });
      const files = await listProjectFiles({
        workspaceId,
        userId,
        campaignId,
      });
      return Response.json({ ok, folders, files });
    }

    if (action === 'upload') {
      const fileUrl = String(body.fileUrl ?? body.url ?? '').trim();
      if (!fileUrl) {
        return Response.json({ error: 'fileUrl required' }, { status: 400 });
      }
      const file = await addProjectFile({
        workspaceId,
        userId,
        campaignId,
        folderId:
          body.folderId == null || body.folderId === '' || body.folderId === 'root'
            ? null
            : String(body.folderId),
        fileName: String(body.fileName ?? body.name ?? 'Untitled'),
        fileUrl,
        fileType:
          typeof body.fileType === 'string' ? body.fileType : undefined,
        sizeBytes: Number(body.sizeBytes) || 0,
      });
      const files = await listProjectFiles({
        workspaceId,
        userId,
        campaignId,
        folderId: file.folder_id,
      });
      return Response.json({ file, files });
    }

    if (action === 'delete_file') {
      const ok = await deleteProjectFile({
        workspaceId,
        userId,
        campaignId,
        fileId: String(body.fileId ?? body.id ?? ''),
      });
      const files = await listProjectFiles({
        workspaceId,
        userId,
        campaignId,
        folderId:
          body.folderId === undefined
            ? undefined
            : body.folderId === null ||
                body.folderId === '' ||
                body.folderId === 'root'
              ? null
              : String(body.folderId),
      });
      return Response.json({ ok, files });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[POST /api/planner/project-files]', error);
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}

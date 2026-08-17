/**
 * GET/POST /api/admin/media
 * Media library scoped to the authenticated user + active workspace.
 * Persists to media_library / media_folders when DATABASE_URL is set.
 */

import { cookies } from 'next/headers';
import { requireApiSession } from '@/lib/auth/require-api-session';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
} from '@/lib/social/oauth-workspace';
import { resolveStrictUserWorkspace } from '@/lib/social/resolve-user-workspace';
import {
  addMediaAsset,
  createMediaFolder,
  deleteMediaAsset,
  deleteMediaFolder,
  getMediaFolder,
  isMediaLibraryRoot,
  listMediaAssets,
  listMediaFolders,
  MEDIA_LIBRARY_ROOT_ID,
  moveMediaAsset,
  renameMediaFolder,
  reorderMediaFolders,
  updateMediaFolder,
  type MediaAsset,
  type MediaFolder,
} from '@/lib/mock-media-library';
import {
  createDurableMediaFolder,
  deleteDurableMediaAsset,
  deleteDurableMediaFolder,
  insertMediaLibraryRow,
  listDurableMediaFolders,
  listMediaLibraryForWorkspace,
  moveDurableMediaAsset,
  recordToMediaAsset,
  renameDurableMediaFolder,
  reorderDurableMediaFolders,
  updateDurableMediaFolder,
} from '@/lib/media/library';

async function resolveWorkspaceId(
  request: Request,
  userId: string,
  email?: string | null
): Promise<string | null> {
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

function useDurable(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

async function listAssetsDurable(input: {
  workspaceId: string;
  userId: string;
  folderId?: string | null;
}): Promise<MediaAsset[]> {
  const rows = await listMediaLibraryForWorkspace(input.workspaceId, 200, {
    folderId: input.folderId,
    userId: input.userId,
  });
  return rows.map(recordToMediaAsset);
}

export async function GET(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  const userId = session.user.id;
  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get('folder');

  if (!useDurable()) {
    if (folderId) {
      return Response.json({
        folder: getMediaFolder(userId, folderId),
        assets: listMediaAssets(userId, folderId),
        folders: listMediaFolders(userId),
      });
    }
    return Response.json({
      folders: listMediaFolders(userId),
      assets: listMediaAssets(userId, MEDIA_LIBRARY_ROOT_ID),
    });
  }

  try {
    const workspaceId =
      (await resolveWorkspaceId(request, userId, session.user.email)) || userId;
    const folders = await listDurableMediaFolders({ workspaceId, userId });

    if (folderId) {
      const folder =
        folders.find((f) => f.id === folderId) ||
        (isMediaLibraryRoot(folderId)
          ? folders[0]
          : null);
      const assets = await listAssetsDurable({
        workspaceId,
        userId,
        folderId,
      });
      return Response.json({ folder, assets, folders });
    }

    const assets = await listAssetsDurable({
      workspaceId,
      userId,
      folderId: MEDIA_LIBRARY_ROOT_ID,
    });
    return Response.json({ folders, assets });
  } catch (error) {
    console.error('[GET /api/admin/media]', error);
    // Soft-fallback so the Media Library UI never hard-crashes.
    return Response.json({
      folders: listMediaFolders(userId),
      assets: listMediaAssets(userId, MEDIA_LIBRARY_ROOT_ID),
      demo: true,
      error: 'load_failed',
    });
  }
}

export async function POST(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  const userId = session.user.id;

  try {
    const body = await request.json();
    const action = String(body.action ?? 'create');
    const durable = useDurable();
    const workspaceId = durable
      ? (await resolveWorkspaceId(request, userId, session.user.email)) || userId
      : userId;

    if (action === 'create') {
      const campaignId =
        typeof body.campaignId === 'string'
          ? body.campaignId.trim() || null
          : typeof body.campaign_id === 'string'
            ? body.campaign_id.trim() || null
            : null;
      const folder = durable
        ? await createDurableMediaFolder({
            workspaceId,
            userId,
            name: String(body.name ?? ''),
            color: typeof body.color === 'string' ? body.color : undefined,
            description:
              typeof body.description === 'string' ? body.description : undefined,
            campaignId,
          })
        : createMediaFolder(userId, {
            name: String(body.name ?? ''),
            color: typeof body.color === 'string' ? body.color : undefined,
            description:
              typeof body.description === 'string' ? body.description : undefined,
            campaignId,
          });
      const folders = durable
        ? await listDurableMediaFolders({ workspaceId, userId })
        : listMediaFolders(userId);
      return Response.json({ folder, folders });
    }

    if (action === 'rename') {
      const id = String(body.id ?? '');
      const name = String(body.name ?? '');
      const folder = durable
        ? await renameDurableMediaFolder({
            workspaceId,
            userId,
            id,
            name,
          })
        : renameMediaFolder(userId, id, name);
      if (!folder) {
        return Response.json({ error: 'rename_failed' }, { status: 400 });
      }
      const folders = durable
        ? await listDurableMediaFolders({ workspaceId, userId })
        : listMediaFolders(userId);
      return Response.json({ folder, folders });
    }

    if (action === 'update') {
      const id = String(body.id ?? '');
      if (!id || isMediaLibraryRoot(id)) {
        return Response.json({ error: 'invalid_folder' }, { status: 400 });
      }
      const patch = {
        name: typeof body.name === 'string' ? body.name : undefined,
        color: typeof body.color === 'string' ? body.color : undefined,
        description:
          typeof body.description === 'string' ? body.description : undefined,
        campaignId:
          body.campaignId === null || body.campaign_id === null
            ? null
            : typeof body.campaignId === 'string'
              ? body.campaignId.trim() || null
              : typeof body.campaign_id === 'string'
                ? body.campaign_id.trim() || null
                : undefined,
      };
      const folder = durable
        ? await updateDurableMediaFolder({
            workspaceId,
            userId,
            id,
            ...patch,
          })
        : updateMediaFolder(userId, id, patch);
      if (!folder) {
        return Response.json({ error: 'update_failed' }, { status: 400 });
      }
      const folders = durable
        ? await listDurableMediaFolders({ workspaceId, userId })
        : listMediaFolders(userId);
      return Response.json({ folder, folders });
    }

    if (action === 'upload') {
      const image = String(body.imageUrl ?? body.url ?? '').trim();
      const label = String(body.label ?? body.fileName ?? 'Upload').trim();
      if (!image) {
        return Response.json({ error: 'imageUrl required' }, { status: 400 });
      }
      const kind =
        String(body.kind || '').toLowerCase() === 'video' ||
        String(body.fileType || '').startsWith('video/')
          ? 'video'
          : 'image';
      const fileType =
        typeof body.fileType === 'string' && body.fileType.trim()
          ? body.fileType.trim()
          : kind === 'video'
            ? 'video/mp4'
            : 'image/jpeg';
      const folderId =
        typeof body.folderId === 'string' ? body.folderId : MEDIA_LIBRARY_ROOT_ID;

      let asset: MediaAsset;
      if (durable) {
        const row = await insertMediaLibraryRow({
          workspaceId,
          userId,
          fileName: label,
          fileUrl: image,
          fileType,
          sizeBytes: Number(body.sizeBytes) || 0,
          source: 'device',
          target: 'media_library',
          folderId,
          metadata: { kind, platform: 'device' },
        });
        if (!row) {
          return Response.json({ error: 'persist_failed' }, { status: 500 });
        }
        asset = recordToMediaAsset(row);
      } else {
        asset = addMediaAsset(userId, {
          folderId,
          label,
          image,
          kind,
          platform: 'device',
        });
      }

      const assets = durable
        ? await listAssetsDurable({ workspaceId, userId, folderId })
        : listMediaAssets(userId, folderId || MEDIA_LIBRARY_ROOT_ID);
      const folders = durable
        ? await listDurableMediaFolders({ workspaceId, userId })
        : listMediaFolders(userId);

      return Response.json({ asset, assets, folders });
    }

    if (action === 'delete') {
      const id = String(body.id ?? '');
      if (isMediaLibraryRoot(id)) {
        return Response.json({ error: 'Permanent folder' }, { status: 400 });
      }
      const ok = durable
        ? await deleteDurableMediaFolder({ workspaceId, userId, id })
        : deleteMediaFolder(userId, id);
      const folders = durable
        ? await listDurableMediaFolders({ workspaceId, userId })
        : listMediaFolders(userId);
      return Response.json({ ok, folders });
    }

    if (action === 'delete_asset') {
      const assetId = String(body.assetId ?? body.id ?? '').trim();
      if (!assetId) {
        return Response.json({ error: 'assetId required' }, { status: 400 });
      }
      const ok = durable
        ? await deleteDurableMediaAsset({ workspaceId, userId, assetId })
        : deleteMediaAsset(userId, assetId);
      if (!ok) {
        return Response.json({ error: 'delete_failed' }, { status: 404 });
      }
      return Response.json({ ok: true, assetId });
    }

    if (action === 'move') {
      const assetId = String(body.assetId ?? body.id ?? '').trim();
      const folderId =
        body.folderId == null || body.folderId === ''
          ? MEDIA_LIBRARY_ROOT_ID
          : String(body.folderId);
      if (!assetId) {
        return Response.json({ error: 'assetId required' }, { status: 400 });
      }
      const asset = durable
        ? await moveDurableMediaAsset({
            workspaceId,
            userId,
            assetId,
            folderId,
          })
        : moveMediaAsset(userId, assetId, folderId);
      if (!asset) {
        return Response.json({ error: 'move_failed' }, { status: 404 });
      }
      const assets = durable
        ? await listAssetsDurable({
            workspaceId,
            userId,
            folderId: MEDIA_LIBRARY_ROOT_ID,
          })
        : listMediaAssets(userId, MEDIA_LIBRARY_ROOT_ID);
      return Response.json({ asset, assets });
    }

    if (action === 'reorder_folders') {
      const orderedIds = Array.isArray(body.orderedIds)
        ? body.orderedIds.map((id: unknown) => String(id)).filter(Boolean)
        : [];
      const folders = durable
        ? await reorderDurableMediaFolders({
            workspaceId,
            userId,
            orderedIds,
          })
        : reorderMediaFolders(userId, orderedIds);
      return Response.json({ folders });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[POST /api/admin/media]', error);
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}

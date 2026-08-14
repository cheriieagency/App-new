/**
 * GET/POST /api/admin/media
 * Media library is strictly scoped to the authenticated session user.
 */

import { requireApiSession } from '@/lib/auth/require-api-session';
import {
  addMediaAsset,
  createMediaFolder,
  deleteMediaFolder,
  getMediaFolder,
  isMediaLibraryRoot,
  listMediaAssets,
  listMediaFolders,
  MEDIA_LIBRARY_ROOT_ID,
  renameMediaFolder,
} from '@/lib/mock-media-library';

export async function GET(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  const userId = session.user.id;
  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get('folder');
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

export async function POST(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  const userId = session.user.id;

  try {
    const body = await request.json();
    const action = String(body.action ?? 'create');

    if (action === 'create') {
      const folder = createMediaFolder(userId, {
        name: String(body.name ?? ''),
        color: typeof body.color === 'string' ? body.color : undefined,
        description:
          typeof body.description === 'string' ? body.description : undefined,
      });
      return Response.json({ folder, folders: listMediaFolders(userId) });
    }

    if (action === 'rename') {
      const id = String(body.id ?? '');
      const name = String(body.name ?? '');
      const folder = renameMediaFolder(userId, id, name);
      if (!folder) {
        return Response.json({ error: 'rename_failed' }, { status: 400 });
      }
      return Response.json({ folder, folders: listMediaFolders(userId) });
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
      const asset = addMediaAsset(userId, {
        folderId: typeof body.folderId === 'string' ? body.folderId : null,
        label,
        image,
        kind,
        platform: 'device',
      });
      return Response.json({
        asset,
        assets: listMediaAssets(userId, body.folderId || MEDIA_LIBRARY_ROOT_ID),
        folders: listMediaFolders(userId),
      });
    }

    if (action === 'delete') {
      const id = String(body.id ?? '');
      if (isMediaLibraryRoot(id)) {
        return Response.json({ error: 'Permanent folder' }, { status: 400 });
      }
      const ok = deleteMediaFolder(userId, id);
      return Response.json({ ok, folders: listMediaFolders(userId) });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}

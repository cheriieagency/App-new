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
  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get('folder');
  if (folderId) {
    return Response.json({
      folder: getMediaFolder(folderId),
      assets: listMediaAssets(folderId),
      folders: listMediaFolders(),
    });
  }
  return Response.json({
    folders: listMediaFolders(),
    assets: listMediaAssets(MEDIA_LIBRARY_ROOT_ID),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = String(body.action ?? 'create');

    if (action === 'create') {
      const folder = createMediaFolder({
        name: String(body.name ?? ''),
        color: typeof body.color === 'string' ? body.color : undefined,
        description:
          typeof body.description === 'string' ? body.description : undefined,
      });
      return Response.json({ folder, folders: listMediaFolders() });
    }

    if (action === 'rename') {
      const id = String(body.id ?? '');
      const name = String(body.name ?? '');
      const folder = renameMediaFolder(id, name);
      if (!folder) {
        return Response.json({ error: 'rename_failed' }, { status: 400 });
      }
      return Response.json({ folder, folders: listMediaFolders() });
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
      const asset = addMediaAsset({
        folderId: typeof body.folderId === 'string' ? body.folderId : null,
        label,
        image,
        kind,
        platform: 'device',
      });
      return Response.json({
        asset,
        assets: listMediaAssets(body.folderId || MEDIA_LIBRARY_ROOT_ID),
        folders: listMediaFolders(),
      });
    }

    if (action === 'delete') {
      const id = String(body.id ?? '');
      if (isMediaLibraryRoot(id)) {
        return Response.json({ error: 'Permanent folder' }, { status: 400 });
      }
      const ok = deleteMediaFolder(id);
      return Response.json({ ok, folders: listMediaFolders() });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}

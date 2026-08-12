/** In-memory media library: folders + assets for the admin Media Library. */

export type MediaFolder = {
  id: string;
  name: string;
  color: string;
  description: string;
  created_at: string;
  /** Permanent root cannot be deleted; holds every asset across folders. */
  permanent?: boolean;
};

export type MediaAsset = {
  id: string;
  folder_id: string;
  label: string;
  platform: string;
  kind: 'image' | 'video';
  image: string;
};

/** Google Drive–style root: all brand assets across the library. */
export const MEDIA_LIBRARY_ROOT_ID = 'folder-all';

export const MEDIA_LIBRARY_ROOT: MediaFolder = {
  id: MEDIA_LIBRARY_ROOT_ID,
  name: 'Brand assets',
  color: '#2B2568',
  description: 'All images and videos across your media library.',
  created_at: new Date(0).toISOString(),
  permanent: true,
};

export function isMediaLibraryRoot(id: string | null | undefined): boolean {
  return id === MEDIA_LIBRARY_ROOT_ID;
}

const folders: MediaFolder[] = [];

const assets: MediaAsset[] = [];

export function listMediaFolders(): MediaFolder[] {
  return [MEDIA_LIBRARY_ROOT, ...folders];
}

export function getMediaFolder(id: string): MediaFolder | null {
  if (isMediaLibraryRoot(id)) return MEDIA_LIBRARY_ROOT;
  return folders.find((f) => f.id === id) ?? null;
}

export function listMediaAssets(folderId?: string | null): MediaAsset[] {
  // Root / unset → every asset in the library (Drive-style “all files”).
  if (!folderId || isMediaLibraryRoot(folderId)) return [...assets];
  return assets.filter((a) => a.folder_id === folderId);
}

export function createMediaFolder(input: {
  name: string;
  color?: string;
  description?: string;
}): MediaFolder {
  const folder: MediaFolder = {
    id: `folder-${Date.now()}`,
    name: input.name.trim() || 'Untitled folder',
    color: input.color || '#9089F0',
    description: (input.description ?? '').trim(),
    created_at: new Date().toISOString(),
  };
  folders.unshift(folder);
  return folder;
}

export function deleteMediaFolder(id: string): boolean {
  // Permanent Brand assets root can never be deleted.
  if (isMediaLibraryRoot(id)) return false;
  const idx = folders.findIndex((f) => f.id === id);
  if (idx < 0) return false;
  folders.splice(idx, 1);
  // Drop assets that lived only in this folder.
  for (let i = assets.length - 1; i >= 0; i -= 1) {
    if (assets[i].folder_id === id) assets.splice(i, 1);
  }
  return true;
}

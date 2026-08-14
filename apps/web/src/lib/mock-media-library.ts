/** In-memory media library: folders + assets scoped per authenticated user. */

export type MediaFolder = {
  id: string;
  name: string;
  color: string;
  description: string;
  created_at: string;
  /** Permanent root cannot be deleted; holds every asset across folders. */
  permanent?: boolean;
  owner_user_id?: string;
};

export type MediaAsset = {
  id: string;
  folder_id: string;
  label: string;
  platform: string;
  kind: 'image' | 'video';
  image: string;
  owner_user_id?: string;
};

/** Google Drive–style root: all brand assets across the library. */
export const MEDIA_LIBRARY_ROOT_ID = 'folder-all';

export function isMediaLibraryRoot(id: string | null | undefined): boolean {
  return id === MEDIA_LIBRARY_ROOT_ID;
}

type UserMediaStore = {
  folders: MediaFolder[];
  assets: MediaAsset[];
  rootName: string;
};

const storesByUser = new Map<string, UserMediaStore>();

function storeFor(userId: string): UserMediaStore {
  const key = userId.trim() || '_anon';
  let store = storesByUser.get(key);
  if (!store) {
    store = { folders: [], assets: [], rootName: 'Brand assets' };
    storesByUser.set(key, store);
  }
  return store;
}

function rootFolder(userId: string): MediaFolder {
  const store = storeFor(userId);
  return {
    id: MEDIA_LIBRARY_ROOT_ID,
    name: store.rootName,
    color: '#2B2568',
    description: 'All images and videos across your media library.',
    created_at: new Date(0).toISOString(),
    permanent: true,
    owner_user_id: userId,
  };
}

export function listMediaFolders(userId: string): MediaFolder[] {
  const store = storeFor(userId);
  return [rootFolder(userId), ...store.folders];
}

export function getMediaFolder(userId: string, id: string): MediaFolder | null {
  if (isMediaLibraryRoot(id)) return rootFolder(userId);
  return storeFor(userId).folders.find((f) => f.id === id) ?? null;
}

export function listMediaAssets(
  userId: string,
  folderId?: string | null
): MediaAsset[] {
  const assets = storeFor(userId).assets;
  // Root / unset → every asset in the library (Drive-style “all files”).
  if (!folderId || isMediaLibraryRoot(folderId)) return [...assets];
  return assets.filter((a) => a.folder_id === folderId);
}

export function createMediaFolder(
  userId: string,
  input: {
    name: string;
    color?: string;
    description?: string;
  }
): MediaFolder {
  const folder: MediaFolder = {
    id: `folder-${Date.now()}`,
    name: input.name.trim() || 'Untitled folder',
    color: input.color || '#9089F0',
    description: (input.description ?? '').trim(),
    created_at: new Date().toISOString(),
    owner_user_id: userId,
  };
  storeFor(userId).folders.unshift(folder);
  return folder;
}

export function renameMediaFolder(
  userId: string,
  id: string,
  name: string
): MediaFolder | null {
  const next = name.trim();
  if (!next) return null;
  if (isMediaLibraryRoot(id)) {
    storeFor(userId).rootName = next;
    return { ...rootFolder(userId) };
  }
  const folder = storeFor(userId).folders.find((f) => f.id === id);
  if (!folder) return null;
  folder.name = next;
  return { ...folder };
}

export function addMediaAsset(
  userId: string,
  input: {
    folderId?: string | null;
    label: string;
    image: string;
    kind?: 'image' | 'video';
    platform?: string;
  }
): MediaAsset {
  const folderId =
    !input.folderId || isMediaLibraryRoot(input.folderId)
      ? MEDIA_LIBRARY_ROOT_ID
      : input.folderId;
  const asset: MediaAsset = {
    id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    folder_id: folderId,
    label: input.label.trim() || 'Untitled',
    platform: input.platform || 'upload',
    kind: input.kind || 'image',
    image: input.image,
    owner_user_id: userId,
  };
  storeFor(userId).assets.unshift(asset);
  return asset;
}

export function deleteMediaFolder(userId: string, id: string): boolean {
  // Permanent Brand assets root can never be deleted.
  if (isMediaLibraryRoot(id)) return false;
  const store = storeFor(userId);
  const idx = store.folders.findIndex((f) => f.id === id);
  if (idx < 0) return false;
  store.folders.splice(idx, 1);
  // Drop assets that lived only in this folder.
  for (let i = store.assets.length - 1; i >= 0; i -= 1) {
    if (store.assets[i].folder_id === id) store.assets.splice(i, 1);
  }
  return true;
}

/** @deprecated Use listMediaFolders(userId) — unscoped global root for type compat. */
export const MEDIA_LIBRARY_ROOT: MediaFolder = {
  id: MEDIA_LIBRARY_ROOT_ID,
  name: 'Brand assets',
  color: '#2B2568',
  description: 'All images and videos across your media library.',
  created_at: new Date(0).toISOString(),
  permanent: true,
};

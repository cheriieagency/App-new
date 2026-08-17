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
  /** Optional link to a Projects campaign label (`CampaignLabel.id`). */
  campaign_id?: string | null;
  /** Manual sidebar / grid order (lower = earlier). */
  sort_order?: number;
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
  const nested = [...store.folders].sort((a, b) => {
    const ao = a.sort_order ?? Number.MAX_SAFE_INTEGER;
    const bo = b.sort_order ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  return [rootFolder(userId), ...nested];
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
    campaignId?: string | null;
  }
): MediaFolder {
  const store = storeFor(userId);
  const nextOrder =
    store.folders.reduce((max, f) => Math.max(max, f.sort_order ?? -1), -1) + 1;
  const folder: MediaFolder = {
    id: `folder-${Date.now()}`,
    name: input.name.trim() || 'Untitled folder',
    color: input.color || '#2B2568',
    description: (input.description ?? '').trim(),
    created_at: new Date().toISOString(),
    owner_user_id: userId,
    campaign_id: input.campaignId?.trim() || null,
    sort_order: nextOrder,
  };
  store.folders.unshift(folder);
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

/** Link (or unlink) a media folder to a Projects campaign. */
export function updateMediaFolder(
  userId: string,
  id: string,
  patch: {
    name?: string;
    color?: string;
    description?: string;
    campaignId?: string | null;
  }
): MediaFolder | null {
  if (isMediaLibraryRoot(id)) return null;
  const folder = storeFor(userId).folders.find((f) => f.id === id);
  if (!folder) return null;
  if (typeof patch.name === 'string') {
    const next = patch.name.trim();
    if (!next) return null;
    folder.name = next;
  }
  if (typeof patch.color === 'string' && patch.color.trim()) {
    folder.color = patch.color.trim();
  }
  if (typeof patch.description === 'string') {
    folder.description = patch.description.trim();
  }
  if (patch.campaignId !== undefined) {
    folder.campaign_id = patch.campaignId?.trim() || null;
  }
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

/** Move an asset into another folder (or Brand assets root). */
export function moveMediaAsset(
  userId: string,
  assetId: string,
  folderId: string | null
): MediaAsset | null {
  const store = storeFor(userId);
  const asset = store.assets.find((a) => a.id === assetId);
  if (!asset) return null;
  const nextFolder =
    !folderId || isMediaLibraryRoot(folderId)
      ? MEDIA_LIBRARY_ROOT_ID
      : folderId;
  if (
    nextFolder !== MEDIA_LIBRARY_ROOT_ID &&
    !store.folders.some((f) => f.id === nextFolder)
  ) {
    return null;
  }
  asset.folder_id = nextFolder;
  return { ...asset };
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

/** Remove a single image/video from the in-memory media library. */
export function deleteMediaAsset(userId: string, assetId: string): boolean {
  const store = storeFor(userId);
  const idx = store.assets.findIndex((a) => a.id === assetId);
  if (idx < 0) return false;
  store.assets.splice(idx, 1);
  return true;
}

/** Persist a manual folder order (sidebar drag-and-drop). Root is excluded. */
export function reorderMediaFolders(
  userId: string,
  orderedIds: string[]
): MediaFolder[] {
  const store = storeFor(userId);
  const byId = new Map(store.folders.map((f) => [f.id, f]));
  const seen = new Set<string>();
  let order = 0;
  for (const id of orderedIds) {
    if (isMediaLibraryRoot(id)) continue;
    const f = byId.get(id);
    if (!f || seen.has(id)) continue;
    f.sort_order = order;
    order += 1;
    seen.add(id);
  }
  for (const f of store.folders) {
    if (seen.has(f.id)) continue;
    f.sort_order = order;
    order += 1;
  }
  return listMediaFolders(userId);
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

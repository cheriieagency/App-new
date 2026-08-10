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

const folders: MediaFolder[] = [
  {
    id: 'folder-covers',
    name: 'Covers & logos',
    color: '#9089F0',
    description: 'Logos, covers, and reusable brand creatives.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'folder-product',
    name: 'Product shots',
    color: '#F472B6',
    description: 'Product photography and flatlays.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'folder-reels',
    name: 'Reels & B-roll',
    color: '#10B981',
    description: 'Short-form clips and supporting footage.',
    created_at: new Date().toISOString(),
  },
];

const assets: MediaAsset[] = [
  {
    id: 'm1',
    folder_id: 'folder-product',
    label: 'Glow essentials flatlay',
    platform: 'Instagram',
    kind: 'image',
    image:
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=80',
  },
  {
    id: 'm2',
    folder_id: 'folder-reels',
    label: 'Routine demo',
    platform: 'TikTok',
    kind: 'video',
    image:
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&q=80',
  },
  {
    id: 'm3',
    folder_id: 'folder-reels',
    label: 'Studio B-roll',
    platform: 'Instagram',
    kind: 'video',
    image:
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&q=80',
  },
  {
    id: 'm4',
    folder_id: 'folder-covers',
    label: 'Cover gradient',
    platform: 'Instagram',
    kind: 'image',
    image:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80',
  },
  {
    id: 'm5',
    folder_id: 'folder-product',
    label: 'Hero bottle still',
    platform: 'LinkedIn',
    kind: 'image',
    image:
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&q=80',
  },
];

/** Organizable folders only (excludes the permanent root). */
export function listMediaFolders(): MediaFolder[] {
  return [...folders];
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

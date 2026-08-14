/**
 * Favorite hashtag sets for Post Studio — persisted per workspace in localStorage.
 */

export type FavoriteHashtagSet = {
  id: string;
  /** Normalized string, e.g. "#tips #creator #nordic" */
  tags: string;
  created_at: string;
};

const STORAGE_PREFIX = 'clikd_favorite_hashtags_';

function storageKey(workspaceId?: string | null): string {
  const id = workspaceId?.trim() || 'default';
  return `${STORAGE_PREFIX}${id}`;
}

/** Normalize free-text hashtags into a stable `#tag #tag` string. */
export function normalizeHashtagString(raw: string): string {
  const parts = raw
    .split(/[\s,]+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => (p.startsWith('#') ? p : `#${p}`))
    .map((p) => p.replace(/^#+/, '#'));
  // Dedupe case-insensitively, keep first casing.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of parts) {
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out.join(' ');
}

export function mergeHashtagStrings(current: string, incoming: string): string {
  return normalizeHashtagString(`${current} ${incoming}`);
}

export function listFavoriteHashtags(
  workspaceId?: string | null
): FavoriteHashtagSet[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey(workspaceId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FavoriteHashtagSet[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x) => x && typeof x.id === 'string' && typeof x.tags === 'string' && x.tags.trim()
    );
  } catch {
    return [];
  }
}

function persistFavoriteHashtags(
  workspaceId: string | null | undefined,
  items: FavoriteHashtagSet[]
) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(storageKey(workspaceId), JSON.stringify(items));
}

export function saveFavoriteHashtags(
  workspaceId: string | null | undefined,
  tagsRaw: string
): FavoriteHashtagSet | null {
  const tags = normalizeHashtagString(tagsRaw);
  if (!tags) return null;
  const existing = listFavoriteHashtags(workspaceId);
  // Avoid duplicates of the same set.
  if (existing.some((e) => e.tags.toLowerCase() === tags.toLowerCase())) {
    return existing.find((e) => e.tags.toLowerCase() === tags.toLowerCase()) ?? null;
  }
  const row: FavoriteHashtagSet = {
    id: `fh-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    tags,
    created_at: new Date().toISOString(),
  };
  persistFavoriteHashtags(workspaceId, [row, ...existing].slice(0, 40));
  return row;
}

export function removeFavoriteHashtags(
  workspaceId: string | null | undefined,
  id: string
): FavoriteHashtagSet[] {
  const next = listFavoriteHashtags(workspaceId).filter((x) => x.id !== id);
  persistFavoriteHashtags(workspaceId, next);
  return next;
}

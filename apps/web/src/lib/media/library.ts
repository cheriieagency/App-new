/**
 * Durable Media Library — folders + assets (device upload + Google Drive).
 */

import sql from '@/app/api/utils/sql';
import {
  MEDIA_LIBRARY_ROOT_ID,
  isMediaLibraryRoot,
  type MediaAsset,
  type MediaFolder,
} from '@/lib/mock-media-library';

export type MediaLibraryRecord = {
  id: number | string;
  workspace_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  size_bytes: number;
  source: string;
  external_id: string | null;
  folder_id?: string | null;
};

let schemaReady: Promise<void> | null = null;
const MEDIA_SCHEMA_VERSION = 2;
let schemaVersionApplied = 0;

async function safeAlter(label: string, run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    console.warn(`[media/library] schema heal skipped (${label})`, error);
  }
}

export async function ensureMediaLibrarySchema(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  if (schemaReady && schemaVersionApplied >= MEDIA_SCHEMA_VERSION) {
    return schemaReady;
  }

  schemaReady = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS public.media_library (
        id            serial PRIMARY KEY,
        workspace_id  text NOT NULL,
        user_id       text,
        file_name     text NOT NULL,
        file_url      text NOT NULL,
        file_type     text NOT NULL DEFAULT 'application/octet-stream',
        size_bytes    bigint NOT NULL DEFAULT 0,
        source        text NOT NULL DEFAULT 'upload',
        external_id   text,
        target        text NOT NULL DEFAULT 'media_library',
        folder_id     text,
        metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at    timestamptz NOT NULL DEFAULT now()
      )
    `;
    await safeAlter('media_library.folder_id', () =>
      sql`ALTER TABLE public.media_library ADD COLUMN IF NOT EXISTS folder_id text`
    );
    await safeAlter('media_library.user_id', () =>
      sql`ALTER TABLE public.media_library ADD COLUMN IF NOT EXISTS user_id text`
    );
    await safeAlter('media_library_workspace_idx', () => sql`
      CREATE INDEX IF NOT EXISTS media_library_workspace_idx
        ON public.media_library (workspace_id, created_at DESC)
    `);
    await safeAlter('media_library_user_idx', () => sql`
      CREATE INDEX IF NOT EXISTS media_library_user_idx
        ON public.media_library (user_id, created_at DESC)
    `);
    await safeAlter('media_library_folder_idx', () => sql`
      CREATE INDEX IF NOT EXISTS media_library_folder_idx
        ON public.media_library (folder_id, created_at DESC)
    `);

    await sql`
      CREATE TABLE IF NOT EXISTS public.media_folders (
        id            text PRIMARY KEY,
        workspace_id  text NOT NULL,
        user_id       text NOT NULL,
        name          text NOT NULL,
        color         text NOT NULL DEFAULT '#2B2568',
        description   text NOT NULL DEFAULT '',
        created_at    timestamptz NOT NULL DEFAULT now(),
        updated_at    timestamptz NOT NULL DEFAULT now()
      )
    `;
    await safeAlter('media_folders_workspace_idx', () => sql`
      CREATE INDEX IF NOT EXISTS media_folders_workspace_idx
        ON public.media_folders (workspace_id, created_at DESC)
    `);

    schemaVersionApplied = MEDIA_SCHEMA_VERSION;
  })().catch((error) => {
    schemaReady = null;
    schemaVersionApplied = 0;
    throw error;
  });

  return schemaReady;
}

/** Store file bytes as data URL (matches /api/upload fallback). */
export function bufferToDataUrl(buffer: Buffer, contentType: string): string {
  const mime = contentType || 'application/octet-stream';
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

function kindFromFileType(fileType: string): 'image' | 'video' {
  return String(fileType || '').toLowerCase().startsWith('video/')
    ? 'video'
    : 'image';
}

function platformFromSource(source: string): string {
  if (source === 'google_drive') return 'google_drive';
  if (source === 'device') return 'device';
  return source || 'upload';
}

export function recordToMediaAsset(row: MediaLibraryRecord): MediaAsset {
  const folderId =
    row.folder_id && !isMediaLibraryRoot(row.folder_id)
      ? String(row.folder_id)
      : MEDIA_LIBRARY_ROOT_ID;
  return {
    id: String(row.id),
    folder_id: folderId,
    label: row.file_name,
    platform: platformFromSource(row.source),
    kind: kindFromFileType(row.file_type),
    image: row.file_url,
  };
}

export async function insertMediaLibraryRow(input: {
  workspaceId: string;
  userId?: string | null;
  fileName: string;
  fileUrl: string;
  fileType: string;
  sizeBytes: number;
  source?: string;
  externalId?: string | null;
  target?: 'media_library' | 'planner';
  folderId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<MediaLibraryRecord | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  await ensureMediaLibrarySchema();

  const folderId =
    !input.folderId || isMediaLibraryRoot(input.folderId)
      ? MEDIA_LIBRARY_ROOT_ID
      : input.folderId;

  const rows = await sql`
    INSERT INTO public.media_library (
      workspace_id, user_id, file_name, file_url, file_type,
      size_bytes, source, external_id, target, folder_id, metadata
    )
    VALUES (
      ${input.workspaceId},
      ${input.userId ?? null},
      ${input.fileName},
      ${input.fileUrl},
      ${input.fileType},
      ${Math.max(0, Math.round(input.sizeBytes))},
      ${input.source || 'upload'},
      ${input.externalId ?? null},
      ${input.target || 'media_library'},
      ${folderId},
      ${JSON.stringify(input.metadata || {})}
    )
    RETURNING id, workspace_id, file_name, file_url, file_type, size_bytes, source, external_id, folder_id
  `;

  const row = rows?.[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: row.id as number | string,
    workspace_id: String(row.workspace_id),
    file_name: String(row.file_name),
    file_url: String(row.file_url),
    file_type: String(row.file_type),
    size_bytes: Number(row.size_bytes) || 0,
    source: String(row.source || 'upload'),
    external_id: row.external_id != null ? String(row.external_id) : null,
    folder_id: row.folder_id != null ? String(row.folder_id) : MEDIA_LIBRARY_ROOT_ID,
  };
}

export async function listMediaLibraryForWorkspace(
  workspaceId: string,
  limit = 200,
  opts?: { folderId?: string | null; userId?: string | null }
): Promise<MediaLibraryRecord[]> {
  if (!process.env.DATABASE_URL?.trim()) return [];
  await ensureMediaLibrarySchema();

  const folderId = opts?.folderId;
  const userId = opts?.userId ?? null;

  const rows =
    folderId && !isMediaLibraryRoot(folderId)
      ? userId
        ? await sql`
            SELECT id, workspace_id, file_name, file_url, file_type, size_bytes,
                   source, external_id, folder_id
            FROM public.media_library
            WHERE workspace_id = ${workspaceId}
              AND folder_id = ${folderId}
              AND (user_id IS NULL OR user_id = ${userId})
              AND target = 'media_library'
            ORDER BY created_at DESC
            LIMIT ${limit}
          `
        : await sql`
            SELECT id, workspace_id, file_name, file_url, file_type, size_bytes,
                   source, external_id, folder_id
            FROM public.media_library
            WHERE workspace_id = ${workspaceId}
              AND folder_id = ${folderId}
              AND target = 'media_library'
            ORDER BY created_at DESC
            LIMIT ${limit}
          `
      : userId
        ? await sql`
            SELECT id, workspace_id, file_name, file_url, file_type, size_bytes,
                   source, external_id, folder_id
            FROM public.media_library
            WHERE workspace_id = ${workspaceId}
              AND (user_id IS NULL OR user_id = ${userId})
              AND target = 'media_library'
            ORDER BY created_at DESC
            LIMIT ${limit}
          `
        : await sql`
            SELECT id, workspace_id, file_name, file_url, file_type, size_bytes,
                   source, external_id, folder_id
            FROM public.media_library
            WHERE workspace_id = ${workspaceId}
              AND target = 'media_library'
            ORDER BY created_at DESC
            LIMIT ${limit}
          `;

  return (rows || []).map((row) => ({
    id: row.id as number | string,
    workspace_id: String(row.workspace_id),
    file_name: String(row.file_name),
    file_url: String(row.file_url),
    file_type: String(row.file_type),
    size_bytes: Number(row.size_bytes) || 0,
    source: String(row.source || 'upload'),
    external_id: row.external_id != null ? String(row.external_id) : null,
    folder_id: row.folder_id != null ? String(row.folder_id) : MEDIA_LIBRARY_ROOT_ID,
  }));
}

function rootFolder(userId: string): MediaFolder {
  return {
    id: MEDIA_LIBRARY_ROOT_ID,
    name: 'Brand assets',
    color: '#2B2568',
    description: 'All images and videos across your media library.',
    created_at: new Date(0).toISOString(),
    permanent: true,
    owner_user_id: userId,
  };
}

export async function listDurableMediaFolders(input: {
  workspaceId: string;
  userId: string;
}): Promise<MediaFolder[]> {
  if (!process.env.DATABASE_URL?.trim()) return [rootFolder(input.userId)];
  await ensureMediaLibrarySchema();
  const rows = await sql`
    SELECT id, name, color, description, created_at, user_id
    FROM public.media_folders
    WHERE workspace_id = ${input.workspaceId}
      AND user_id = ${input.userId}
    ORDER BY created_at DESC
  `;
  const folders = (rows || []).map((row) => ({
    id: String(row.id),
    name: String(row.name ?? 'Folder'),
    color: String(row.color ?? '#2B2568'),
    description: String(row.description ?? ''),
    created_at: String(row.created_at ?? new Date().toISOString()),
    owner_user_id: String(row.user_id ?? input.userId),
  }));
  return [rootFolder(input.userId), ...folders];
}

export async function createDurableMediaFolder(input: {
  workspaceId: string;
  userId: string;
  name: string;
  color?: string;
  description?: string;
}): Promise<MediaFolder> {
  const folder: MediaFolder = {
    id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: input.name.trim() || 'Untitled folder',
    color: input.color || '#2B2568',
    description: (input.description ?? '').trim(),
    created_at: new Date().toISOString(),
    owner_user_id: input.userId,
  };
  if (!process.env.DATABASE_URL?.trim()) return folder;
  await ensureMediaLibrarySchema();
  await sql`
    INSERT INTO public.media_folders (
      id, workspace_id, user_id, name, color, description
    ) VALUES (
      ${folder.id},
      ${input.workspaceId},
      ${input.userId},
      ${folder.name},
      ${folder.color},
      ${folder.description}
    )
  `;
  return folder;
}

export async function renameDurableMediaFolder(input: {
  workspaceId: string;
  userId: string;
  id: string;
  name: string;
}): Promise<MediaFolder | null> {
  const next = input.name.trim();
  if (!next) return null;
  if (isMediaLibraryRoot(input.id)) {
    return { ...rootFolder(input.userId), name: next };
  }
  if (!process.env.DATABASE_URL?.trim()) return null;
  await ensureMediaLibrarySchema();
  const rows = await sql`
    UPDATE public.media_folders
    SET name = ${next}, updated_at = now()
    WHERE id = ${input.id}
      AND workspace_id = ${input.workspaceId}
      AND user_id = ${input.userId}
    RETURNING id, name, color, description, created_at, user_id
  `;
  const row = rows?.[0];
  if (!row) return null;
  return {
    id: String(row.id),
    name: String(row.name),
    color: String(row.color ?? '#2B2568'),
    description: String(row.description ?? ''),
    created_at: String(row.created_at),
    owner_user_id: String(row.user_id ?? input.userId),
  };
}

export async function deleteDurableMediaFolder(input: {
  workspaceId: string;
  userId: string;
  id: string;
}): Promise<boolean> {
  if (isMediaLibraryRoot(input.id)) return false;
  if (!process.env.DATABASE_URL?.trim()) return false;
  await ensureMediaLibrarySchema();
  // Move assets back to Brand assets root before deleting the folder.
  await sql`
    UPDATE public.media_library
    SET folder_id = ${MEDIA_LIBRARY_ROOT_ID}
    WHERE workspace_id = ${input.workspaceId}
      AND folder_id = ${input.id}
  `;
  const rows = await sql`
    DELETE FROM public.media_folders
    WHERE id = ${input.id}
      AND workspace_id = ${input.workspaceId}
      AND user_id = ${input.userId}
    RETURNING id
  `;
  return Array.isArray(rows) && rows.length > 0;
}

/** Move a durable asset into a folder (or Brand assets root). */
export async function moveDurableMediaAsset(input: {
  workspaceId: string;
  userId: string;
  assetId: string;
  folderId: string | null;
}): Promise<MediaAsset | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  await ensureMediaLibrarySchema();

  const nextFolder =
    !input.folderId || isMediaLibraryRoot(input.folderId)
      ? MEDIA_LIBRARY_ROOT_ID
      : input.folderId;

  if (nextFolder !== MEDIA_LIBRARY_ROOT_ID) {
    const folders = await sql`
      SELECT id FROM public.media_folders
      WHERE id = ${nextFolder}
        AND workspace_id = ${input.workspaceId}
        AND user_id = ${input.userId}
      LIMIT 1
    `;
    if (!Array.isArray(folders) || folders.length === 0) return null;
  }

  const numericId = Number(input.assetId);
  const rows = Number.isFinite(numericId)
    ? await sql`
        UPDATE public.media_library
        SET folder_id = ${nextFolder}
        WHERE id = ${numericId}
          AND workspace_id = ${input.workspaceId}
          AND (user_id IS NULL OR user_id = ${input.userId})
        RETURNING id, workspace_id, file_name, file_url, file_type, size_bytes,
                  source, external_id, folder_id
      `
    : await sql`
        UPDATE public.media_library
        SET folder_id = ${nextFolder}
        WHERE id::text = ${input.assetId}
          AND workspace_id = ${input.workspaceId}
          AND (user_id IS NULL OR user_id = ${input.userId})
        RETURNING id, workspace_id, file_name, file_url, file_type, size_bytes,
                  source, external_id, folder_id
      `;

  const row = rows?.[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  return recordToMediaAsset({
    id: row.id as number | string,
    workspace_id: String(row.workspace_id),
    file_name: String(row.file_name),
    file_url: String(row.file_url),
    file_type: String(row.file_type),
    size_bytes: Number(row.size_bytes) || 0,
    source: String(row.source || 'upload'),
    external_id: row.external_id != null ? String(row.external_id) : null,
    folder_id: row.folder_id != null ? String(row.folder_id) : MEDIA_LIBRARY_ROOT_ID,
  });
}

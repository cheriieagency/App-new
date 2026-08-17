/**
 * Project file folders + documents (PDFs, docs, etc.) scoped to a campaign.
 * Persists when DATABASE_URL is set; otherwise uses an in-memory fallback.
 */

import sql from '@/app/api/utils/sql';

export type ProjectFileFolder = {
  id: string;
  campaign_id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
};

export type ProjectFile = {
  id: string;
  campaign_id: string;
  folder_id: string | null;
  file_name: string;
  file_url: string;
  file_type: string;
  size_bytes: number;
  created_at: string;
};

let schemaReady: Promise<void> | null = null;
const SCHEMA_VERSION = 1;
let schemaVersionApplied = 0;

type MemoryStore = {
  folders: ProjectFileFolder[];
  files: ProjectFile[];
};

const memoryByKey = new Map<string, MemoryStore>();

function memKey(workspaceId: string, userId: string) {
  return `${workspaceId}::${userId}`;
}

function storeFor(workspaceId: string, userId: string): MemoryStore {
  const key = memKey(workspaceId, userId);
  let store = memoryByKey.get(key);
  if (!store) {
    store = { folders: [], files: [] };
    memoryByKey.set(key, store);
  }
  return store;
}

function useDurable(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

async function safeAlter(label: string, run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    console.warn(`[project-files] schema heal skipped (${label})`, error);
  }
}

export async function ensureProjectFilesSchema(): Promise<void> {
  if (!useDurable()) return;
  if (schemaReady && schemaVersionApplied >= SCHEMA_VERSION) return schemaReady;

  schemaReady = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS public.project_file_folders (
        id            text PRIMARY KEY,
        workspace_id  text NOT NULL,
        user_id       text NOT NULL,
        campaign_id   text NOT NULL,
        name          text NOT NULL,
        color         text NOT NULL DEFAULT '#2B2568',
        sort_order    integer NOT NULL DEFAULT 0,
        created_at    timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS public.project_files (
        id            text PRIMARY KEY,
        workspace_id  text NOT NULL,
        user_id       text NOT NULL,
        campaign_id   text NOT NULL,
        folder_id     text,
        file_name     text NOT NULL,
        file_url      text NOT NULL,
        file_type     text NOT NULL DEFAULT 'application/octet-stream',
        size_bytes    bigint NOT NULL DEFAULT 0,
        created_at    timestamptz NOT NULL DEFAULT now()
      )
    `;
    await safeAlter('project_file_folders_campaign_idx', () => sql`
      CREATE INDEX IF NOT EXISTS project_file_folders_campaign_idx
        ON public.project_file_folders (workspace_id, campaign_id, sort_order)
    `);
    await safeAlter('project_files_campaign_idx', () => sql`
      CREATE INDEX IF NOT EXISTS project_files_campaign_idx
        ON public.project_files (workspace_id, campaign_id, created_at DESC)
    `);
    schemaVersionApplied = SCHEMA_VERSION;
  })().catch((error) => {
    schemaReady = null;
    schemaVersionApplied = 0;
    throw error;
  });

  return schemaReady;
}

export async function listProjectFileFolders(input: {
  workspaceId: string;
  userId: string;
  campaignId: string;
}): Promise<ProjectFileFolder[]> {
  if (!useDurable()) {
    return storeFor(input.workspaceId, input.userId)
      .folders.filter((f) => f.campaign_id === input.campaignId)
      .sort((a, b) => a.sort_order - b.sort_order);
  }
  await ensureProjectFilesSchema();
  const rows = await sql`
    SELECT id, campaign_id, name, color, sort_order, created_at
    FROM public.project_file_folders
    WHERE workspace_id = ${input.workspaceId}
      AND user_id = ${input.userId}
      AND campaign_id = ${input.campaignId}
    ORDER BY sort_order ASC, created_at ASC
  `;
  return (rows || []).map((row) => ({
    id: String(row.id),
    campaign_id: String(row.campaign_id),
    name: String(row.name),
    color: String(row.color || '#2B2568'),
    sort_order: Number(row.sort_order) || 0,
    created_at: String(row.created_at),
  }));
}

export async function listProjectFiles(input: {
  workspaceId: string;
  userId: string;
  campaignId: string;
  folderId?: string | null;
}): Promise<ProjectFile[]> {
  if (!useDurable()) {
    const files = storeFor(input.workspaceId, input.userId).files.filter(
      (f) => f.campaign_id === input.campaignId
    );
    if (input.folderId === undefined) return [...files].reverse();
    if (input.folderId === null || input.folderId === '') {
      return files.filter((f) => !f.folder_id).reverse();
    }
    return files.filter((f) => f.folder_id === input.folderId).reverse();
  }
  await ensureProjectFilesSchema();
  const rows =
    input.folderId === undefined
      ? await sql`
          SELECT id, campaign_id, folder_id, file_name, file_url, file_type,
                 size_bytes, created_at
          FROM public.project_files
          WHERE workspace_id = ${input.workspaceId}
            AND user_id = ${input.userId}
            AND campaign_id = ${input.campaignId}
          ORDER BY created_at DESC
        `
      : input.folderId === null || input.folderId === ''
        ? await sql`
            SELECT id, campaign_id, folder_id, file_name, file_url, file_type,
                   size_bytes, created_at
            FROM public.project_files
            WHERE workspace_id = ${input.workspaceId}
              AND user_id = ${input.userId}
              AND campaign_id = ${input.campaignId}
              AND (folder_id IS NULL OR folder_id = '')
            ORDER BY created_at DESC
          `
        : await sql`
            SELECT id, campaign_id, folder_id, file_name, file_url, file_type,
                   size_bytes, created_at
            FROM public.project_files
            WHERE workspace_id = ${input.workspaceId}
              AND user_id = ${input.userId}
              AND campaign_id = ${input.campaignId}
              AND folder_id = ${input.folderId}
            ORDER BY created_at DESC
          `;
  return (rows || []).map((row) => ({
    id: String(row.id),
    campaign_id: String(row.campaign_id),
    folder_id: row.folder_id != null ? String(row.folder_id) : null,
    file_name: String(row.file_name),
    file_url: String(row.file_url),
    file_type: String(row.file_type || 'application/octet-stream'),
    size_bytes: Number(row.size_bytes) || 0,
    created_at: String(row.created_at),
  }));
}

export async function createProjectFileFolder(input: {
  workspaceId: string;
  userId: string;
  campaignId: string;
  name: string;
  color?: string;
}): Promise<ProjectFileFolder> {
  const folders = await listProjectFileFolders(input);
  const nextOrder =
    folders.reduce((max, f) => Math.max(max, f.sort_order), -1) + 1;
  const folder: ProjectFileFolder = {
    id: `pff-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    campaign_id: input.campaignId,
    name: input.name.trim() || 'Untitled folder',
    color: input.color || '#2B2568',
    sort_order: nextOrder,
    created_at: new Date().toISOString(),
  };

  if (!useDurable()) {
    storeFor(input.workspaceId, input.userId).folders.push(folder);
    return folder;
  }
  await ensureProjectFilesSchema();
  await sql`
    INSERT INTO public.project_file_folders (
      id, workspace_id, user_id, campaign_id, name, color, sort_order
    ) VALUES (
      ${folder.id},
      ${input.workspaceId},
      ${input.userId},
      ${input.campaignId},
      ${folder.name},
      ${folder.color},
      ${folder.sort_order}
    )
  `;
  return folder;
}

export async function deleteProjectFileFolder(input: {
  workspaceId: string;
  userId: string;
  campaignId: string;
  folderId: string;
}): Promise<boolean> {
  if (!useDurable()) {
    const store = storeFor(input.workspaceId, input.userId);
    const before = store.folders.length;
    store.folders = store.folders.filter(
      (f) =>
        !(f.id === input.folderId && f.campaign_id === input.campaignId)
    );
    for (const file of store.files) {
      if (file.folder_id === input.folderId) file.folder_id = null;
    }
    return store.folders.length < before;
  }
  await ensureProjectFilesSchema();
  await sql`
    UPDATE public.project_files
    SET folder_id = NULL
    WHERE workspace_id = ${input.workspaceId}
      AND user_id = ${input.userId}
      AND campaign_id = ${input.campaignId}
      AND folder_id = ${input.folderId}
  `;
  const rows = await sql`
    DELETE FROM public.project_file_folders
    WHERE id = ${input.folderId}
      AND workspace_id = ${input.workspaceId}
      AND user_id = ${input.userId}
      AND campaign_id = ${input.campaignId}
    RETURNING id
  `;
  return Array.isArray(rows) && rows.length > 0;
}

export async function addProjectFile(input: {
  workspaceId: string;
  userId: string;
  campaignId: string;
  folderId?: string | null;
  fileName: string;
  fileUrl: string;
  fileType?: string;
  sizeBytes?: number;
}): Promise<ProjectFile> {
  const file: ProjectFile = {
    id: `pf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    campaign_id: input.campaignId,
    folder_id: input.folderId?.trim() || null,
    file_name: input.fileName.trim() || 'Untitled file',
    file_url: input.fileUrl,
    file_type: input.fileType || 'application/octet-stream',
    size_bytes: Math.max(0, Math.round(input.sizeBytes || 0)),
    created_at: new Date().toISOString(),
  };

  if (!useDurable()) {
    storeFor(input.workspaceId, input.userId).files.unshift(file);
    return file;
  }
  await ensureProjectFilesSchema();
  await sql`
    INSERT INTO public.project_files (
      id, workspace_id, user_id, campaign_id, folder_id,
      file_name, file_url, file_type, size_bytes
    ) VALUES (
      ${file.id},
      ${input.workspaceId},
      ${input.userId},
      ${input.campaignId},
      ${file.folder_id},
      ${file.file_name},
      ${file.file_url},
      ${file.file_type},
      ${file.size_bytes}
    )
  `;
  return file;
}

export async function deleteProjectFile(input: {
  workspaceId: string;
  userId: string;
  campaignId: string;
  fileId: string;
}): Promise<boolean> {
  if (!useDurable()) {
    const store = storeFor(input.workspaceId, input.userId);
    const before = store.files.length;
    store.files = store.files.filter(
      (f) => !(f.id === input.fileId && f.campaign_id === input.campaignId)
    );
    return store.files.length < before;
  }
  await ensureProjectFilesSchema();
  const rows = await sql`
    DELETE FROM public.project_files
    WHERE id = ${input.fileId}
      AND workspace_id = ${input.workspaceId}
      AND user_id = ${input.userId}
      AND campaign_id = ${input.campaignId}
    RETURNING id
  `;
  return Array.isArray(rows) && rows.length > 0;
}

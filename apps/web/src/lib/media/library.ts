/**
 * Persistent media_library rows for Drive imports (and future uploads).
 */

import sql from '@/app/api/utils/sql';

export type MediaLibraryRecord = {
  id: number | string;
  workspace_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  size_bytes: number;
  source: string;
  external_id: string | null;
};

let schemaReady: Promise<void> | null = null;

export async function ensureMediaLibrarySchema(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  if (schemaReady) return schemaReady;

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
        metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at    timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS media_library_workspace_idx
        ON public.media_library (workspace_id, created_at DESC)
    `;
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });

  return schemaReady;
}

/**
 * Store file bytes. Prefers data URLs (matches /api/upload) so imports work
 * without Supabase Storage; when SUPABASE_* + bucket exist, callers can swap later.
 */
export function bufferToDataUrl(buffer: Buffer, contentType: string): string {
  const mime = contentType || 'application/octet-stream';
  return `data:${mime};base64,${buffer.toString('base64')}`;
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
  metadata?: Record<string, unknown>;
}): Promise<MediaLibraryRecord | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  await ensureMediaLibrarySchema();

  const rows = await sql`
    INSERT INTO public.media_library (
      workspace_id, user_id, file_name, file_url, file_type,
      size_bytes, source, external_id, target, metadata
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
      ${JSON.stringify(input.metadata || {})}
    )
    RETURNING id, workspace_id, file_name, file_url, file_type, size_bytes, source, external_id
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
  };
}

export async function listMediaLibraryForWorkspace(
  workspaceId: string,
  limit = 40
): Promise<MediaLibraryRecord[]> {
  if (!process.env.DATABASE_URL?.trim()) return [];
  await ensureMediaLibrarySchema();
  const rows = await sql`
    SELECT id, workspace_id, file_name, file_url, file_type, size_bytes, source, external_id
    FROM public.media_library
    WHERE workspace_id = ${workspaceId}
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
  }));
}

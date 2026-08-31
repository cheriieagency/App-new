/**
 * Resolve workspace display name for report headers and emails.
 */

import sql from '@/app/api/utils/sql';

export async function resolveWorkspaceDisplayName(
  workspaceId: string
): Promise<string | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  const id = workspaceId.trim();
  if (!id) return null;
  try {
    const rows = await sql`
      SELECT name FROM public.workspaces
      WHERE id::text = ${id}
      LIMIT 1
    `;
    const name = (rows?.[0] as { name?: unknown } | undefined)?.name;
    const trimmed = name != null ? String(name).trim() : '';
    return trimmed || null;
  } catch {
    try {
      const rows = await sql`
        SELECT name FROM public.workspaces
        WHERE id = ${id}
        LIMIT 1
      `;
      const name = (rows?.[0] as { name?: unknown } | undefined)?.name;
      const trimmed = name != null ? String(name).trim() : '';
      return trimmed || null;
    } catch {
      return null;
    }
  }
}

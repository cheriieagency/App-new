/**
 * Ensure communities table has workspace-binding + pricing columns.
 * Safe to run on every request (IF NOT EXISTS).
 */

import sql from '@/app/api/utils/sql';

let ensured = false;

export async function ensureCommunitiesSchema(): Promise<void> {
  if (ensured) return;
  if (!process.env.DATABASE_URL?.trim()) {
    ensured = true;
    return;
  }
  try {
    await sql`
      ALTER TABLE communities
        ADD COLUMN IF NOT EXISTS workspace_id text,
        ADD COLUMN IF NOT EXISTS avatar_url text,
        ADD COLUMN IF NOT EXISTS cover_url text,
        ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS monthly_price_sek integer NOT NULL DEFAULT 0
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS communities_workspace_id_idx
        ON communities (workspace_id)
        WHERE workspace_id IS NOT NULL AND workspace_id <> ''
    `;
    // Backfill orphans so revenue + admin filters always have a workspace.
    await sql`
      UPDATE communities
      SET workspace_id = COALESCE(
        NULLIF(workspace_id, ''),
        NULLIF(creator_id, ''),
        'default-my-workspace'
      )
      WHERE workspace_id IS NULL OR workspace_id = ''
    `;
    ensured = true;
  } catch (error) {
    console.warn('[ensureCommunitiesSchema]', error);
    // Don't lock forever — allow retries on next request.
  }
}

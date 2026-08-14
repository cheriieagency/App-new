/**
 * Strict workspace ownership for social / OAuth / inbox APIs.
 * Guarantees workspace_id belongs to session.user.id before reads or writes.
 */

import sql from '@/app/api/utils/sql';

export type WorkspaceAccessResult =
  | { ok: true; workspaceId: string }
  | { ok: false; status: 400 | 403 | 503; error: string };

/**
 * True when public.workspaces has a row owned by this user.
 * Used in SQL filters: workspace_id IN (SELECT id FROM workspaces WHERE user_id = …).
 */
export async function userOwnsWorkspace(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const uid = userId?.trim();
  const wid = workspaceId?.trim();
  if (!uid || !wid) return false;
  if (!process.env.DATABASE_URL?.trim()) return false;

  try {
    const rows = await sql`
      SELECT id
      FROM public.workspaces
      WHERE id = ${wid}
        AND user_id = ${uid}
      LIMIT 1
    `;
    return Array.isArray(rows) && Boolean(rows[0]?.id);
  } catch (error) {
    console.warn('[workspace-access] ownership check failed', error);
    return false;
  }
}

/**
 * Claim or verify workspace ownership before binding social accounts / rules.
 * - Missing row → insert owned by this user
 * - Row with null user_id → claim for this user
 * - Row owned by another user → forbidden
 */
export async function ensureWorkspaceOwnedByUser(
  userId: string,
  workspaceId: string | null | undefined
): Promise<WorkspaceAccessResult> {
  const uid = userId?.trim();
  const wid =
    typeof workspaceId === 'string' ? workspaceId.trim() : '';

  if (!uid) {
    return { ok: false, status: 403, error: 'Unauthorized' };
  }
  if (!wid) {
    return { ok: false, status: 400, error: 'workspace_id required' };
  }
  if (!process.env.DATABASE_URL?.trim()) {
    return { ok: false, status: 503, error: 'DATABASE_URL required' };
  }

  try {
    const existing = await sql`
      SELECT id, user_id
      FROM public.workspaces
      WHERE id = ${wid}
      LIMIT 1
    `;

    if (Array.isArray(existing) && existing[0]) {
      const owner =
        existing[0].user_id != null ? String(existing[0].user_id).trim() : '';
      if (owner && owner !== uid) {
        return { ok: false, status: 403, error: 'workspace_forbidden' };
      }
      if (!owner) {
        try {
          await sql`
            UPDATE public.workspaces
            SET user_id = ${uid}, updated_at = now()
            WHERE id = ${wid}
              AND (user_id IS NULL OR user_id::text = '')
          `;
        } catch {
          await sql`
            UPDATE public.workspaces
            SET user_id = ${uid}
            WHERE id = ${wid}
              AND (user_id IS NULL OR user_id::text = '')
          `;
        }
      }
      return { ok: true, workspaceId: wid };
    }

    // Create workspace row owned by the authenticated user.
    try {
      await sql`
        INSERT INTO public.workspaces (id, user_id)
        VALUES (${wid}, ${uid})
        ON CONFLICT (id) DO UPDATE SET
          user_id = COALESCE(workspaces.user_id, EXCLUDED.user_id),
          updated_at = now()
      `;
    } catch {
      await sql`
        INSERT INTO public.workspaces (id, user_id)
        VALUES (${wid}, ${uid})
        ON CONFLICT (id) DO UPDATE SET
          user_id = COALESCE(workspaces.user_id, EXCLUDED.user_id)
      `;
    }

    // Race-safe re-check — never bind if another user won the claim.
    const owned = await userOwnsWorkspace(uid, wid);
    if (!owned) {
      return { ok: false, status: 403, error: 'workspace_forbidden' };
    }
    return { ok: true, workspaceId: wid };
  } catch (error) {
    console.warn('[workspace-access] ensure failed', error);
    return { ok: false, status: 403, error: 'workspace_verify_failed' };
  }
}

/**
 * Read-path guard: workspace must already belong to the user (no silent claim).
 * Prefer ensureWorkspaceOwnedByUser for OAuth / first-bind flows.
 */
export async function requireOwnedWorkspace(
  userId: string,
  workspaceId: string | null | undefined
): Promise<WorkspaceAccessResult> {
  const uid = userId?.trim();
  const wid =
    typeof workspaceId === 'string' ? workspaceId.trim() : '';

  if (!uid) {
    return { ok: false, status: 403, error: 'Unauthorized' };
  }
  if (!wid) {
    return { ok: false, status: 400, error: 'workspace_id required' };
  }

  // Soft-claim empty/unowned rows so localStorage workspace ids work after login.
  return ensureWorkspaceOwnedByUser(uid, wid);
}

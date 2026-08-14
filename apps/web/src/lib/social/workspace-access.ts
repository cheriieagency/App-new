/**
 * Strict workspace ownership for social / OAuth / inbox APIs.
 * Guarantees workspace_id belongs to session.user.id before reads or writes.
 *
 * OAuth paths use resolveWorkspaceForOAuthUser — never hard-fail with
 * workspace_forbidden when the cookie/state id is missing or owned by someone else;
 * fall back to the user's primary workspace or auto-create one.
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

async function findPrimaryWorkspaceId(userId: string): Promise<string | null> {
  try {
    const rows = await sql`
      SELECT id
      FROM public.workspaces
      WHERE user_id = ${userId}
      ORDER BY created_at ASC NULLS LAST, id ASC
      LIMIT 1
    `;
    if (Array.isArray(rows) && rows[0]?.id) return String(rows[0].id);
  } catch (error) {
    console.warn('[workspace-access] primary lookup failed', error);
  }
  return null;
}

async function createDefaultWorkspaceForUser(input: {
  userId: string;
  email?: string | null;
}): Promise<string | null> {
  const uid = input.userId.trim();
  const handle = (input.email || '')
    .split('@')[0]
    ?.replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 24);
  const name = handle ? `${handle}'s Workspace` : 'My Workspace';
  const slug = `ws-${uid.substring(0, 8)}`;
  // Per-user id — never reuse shared "default-my-workspace" (causes ownership fights).
  const id = `ws-${uid.substring(0, 12)}`;

  try {
    await sql`
      INSERT INTO public.workspaces (id, user_id, name, slug)
      VALUES (${id}, ${uid}, ${name}, ${slug})
      ON CONFLICT (id) DO UPDATE SET
        user_id = COALESCE(workspaces.user_id, EXCLUDED.user_id),
        name = COALESCE(workspaces.name, EXCLUDED.name),
        slug = COALESCE(workspaces.slug, EXCLUDED.slug),
        updated_at = now()
    `;
  } catch {
    try {
      await sql`
        INSERT INTO public.workspaces (id, user_id)
        VALUES (${id}, ${uid})
        ON CONFLICT (id) DO UPDATE SET
          user_id = COALESCE(workspaces.user_id, EXCLUDED.user_id)
      `;
    } catch (error) {
      console.warn('[workspace-access] create default workspace failed', error);
      return null;
    }
  }

  const owned = await userOwnsWorkspace(uid, id);
  return owned ? id : null;
}

/**
 * Claim preferred workspace when unowned / missing; never steal another user's row.
 */
async function tryClaimPreferredWorkspace(
  userId: string,
  workspaceId: string
): Promise<string | null> {
  const uid = userId.trim();
  const wid = workspaceId.trim();
  if (!wid) return null;

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
      if (owner === uid) return wid;
      if (owner && owner !== uid) {
        // Owned by someone else — do not steal; caller will fall back.
        return null;
      }
      // Unowned row — claim for this user.
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
      return (await userOwnsWorkspace(uid, wid)) ? wid : null;
    }

    // Missing row — create with the preferred id for this user.
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
    return (await userOwnsWorkspace(uid, wid)) ? wid : null;
  } catch (error) {
    console.warn('[workspace-access] claim preferred failed', error);
    return null;
  }
}

/**
 * OAuth / connect flows: resolve a workspace the user definitely owns.
 * Preferred id from state/cookie → claim if possible → else primary → else create.
 * Never returns workspace_forbidden for a "wrong cookie" — falls back instead.
 */
export async function resolveWorkspaceForOAuthUser(input: {
  userId: string;
  preferredWorkspaceId?: string | null;
  email?: string | null;
}): Promise<WorkspaceAccessResult> {
  const uid = input.userId?.trim();
  if (!uid) {
    return { ok: false, status: 403, error: 'Unauthorized' };
  }
  if (!process.env.DATABASE_URL?.trim()) {
    return { ok: false, status: 503, error: 'DATABASE_URL required' };
  }

  const preferred =
    typeof input.preferredWorkspaceId === 'string'
      ? input.preferredWorkspaceId.trim()
      : '';

  if (preferred) {
    const claimed = await tryClaimPreferredWorkspace(uid, preferred);
    if (claimed) {
      return { ok: true, workspaceId: claimed };
    }
    console.warn(
      '[workspace-access] preferred workspace unavailable — falling back',
      { preferred, userId: uid }
    );
  }

  const primary = await findPrimaryWorkspaceId(uid);
  if (primary) {
    return { ok: true, workspaceId: primary };
  }

  const created = await createDefaultWorkspaceForUser({
    userId: uid,
    email: input.email,
  });
  if (created) {
    return { ok: true, workspaceId: created };
  }

  return { ok: false, status: 403, error: 'workspace_create_failed' };
}

/**
 * Claim or verify workspace ownership before binding social accounts / rules.
 * - Missing row → insert owned by this user
 * - Row with null user_id → claim for this user
 * - Row owned by another user → forbidden (use resolveWorkspaceForOAuthUser for OAuth)
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

  const claimed = await tryClaimPreferredWorkspace(uid, wid);
  if (claimed) {
    return { ok: true, workspaceId: claimed };
  }

  // Preferred id belongs to someone else — OAuth callers should use
  // resolveWorkspaceForOAuthUser; API reads still get a clear 403.
  return { ok: false, status: 403, error: 'workspace_forbidden' };
}

/**
 * Read-path guard with soft-claim for unowned rows.
 * Prefer resolveWorkspaceForOAuthUser for OAuth / first-bind flows.
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

  return ensureWorkspaceOwnedByUser(uid, wid);
}

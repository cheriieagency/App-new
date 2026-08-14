/**
 * Strict workspace ownership for social / OAuth / inbox APIs.
 * OAuth paths must never fail with workspace_forbidden on a bad cookie —
 * fall back to primary workspace or auto-create a per-user workspace.
 */

import sql from '@/app/api/utils/sql';

export type WorkspaceAccessResult =
  | { ok: true; workspaceId: string }
  | { ok: false; status: 400 | 403 | 503; error: string };

function decodeWorkspaceId(raw: string | null | undefined): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    return decodeURIComponent(trimmed).trim();
  } catch {
    return trimmed;
  }
}

/**
 * True when public.workspaces has a row owned by this user.
 * Compares as text so uuid / text column types both work.
 */
export async function userOwnsWorkspace(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const uid = userId?.trim();
  const wid = decodeWorkspaceId(workspaceId);
  if (!uid || !wid) return false;
  if (!process.env.DATABASE_URL?.trim()) return false;

  try {
    const rows = await sql`
      SELECT id
      FROM public.workspaces
      WHERE id::text = ${wid}
        AND user_id::text = ${uid}
      LIMIT 1
    `;
    return Array.isArray(rows) && Boolean(rows[0]?.id);
  } catch (error) {
    // Fallback without casts if the driver/schema rejects ::text.
    try {
      const rows = await sql`
        SELECT id
        FROM public.workspaces
        WHERE id = ${wid}
          AND user_id = ${uid}
        LIMIT 1
      `;
      return Array.isArray(rows) && Boolean(rows[0]?.id);
    } catch (inner) {
      console.warn('[workspace-access] ownership check failed', inner || error);
      return false;
    }
  }
}

async function findPrimaryWorkspaceId(userId: string): Promise<string | null> {
  try {
    const rows = await sql`
      SELECT id
      FROM public.workspaces
      WHERE user_id::text = ${userId}
      ORDER BY created_at ASC NULLS LAST, id ASC
      LIMIT 1
    `;
    if (Array.isArray(rows) && rows[0]?.id) return String(rows[0].id);
  } catch {
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
  }
  return null;
}

/**
 * Always create a workspace this user owns.
 * Uses a unique id when the stable id is already taken by someone else.
 */
export async function createDefaultWorkspaceForUser(input: {
  userId: string;
  email?: string | null;
}): Promise<string | null> {
  const uid = input.userId.trim();
  if (!uid) return null;

  const handle = (input.email || '')
    .split('@')[0]
    ?.replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 24);
  const name = handle ? `${handle}'s Workspace` : 'My Workspace';
  const slugBase = `ws-${uid.substring(0, 8)}`;

  // Prefer stable per-user id; on conflict with another owner, mint a unique one.
  const candidates = [
    `ws-${uid.substring(0, 12)}`,
    `ws-${uid.substring(0, 8)}-${Date.now().toString(36)}`,
    `ws-${uid.substring(0, 8)}-${Math.random().toString(36).slice(2, 8)}`,
  ];

  for (const id of candidates) {
    const slug = id === candidates[0] ? slugBase : `${slugBase}-${id.slice(-6)}`;
    try {
      await sql`
        INSERT INTO public.workspaces (id, user_id, name, slug)
        VALUES (${id}, ${uid}, ${name}, ${slug})
        ON CONFLICT (id) DO NOTHING
      `;
    } catch {
      try {
        await sql`
          INSERT INTO public.workspaces (id, user_id)
          VALUES (${id}, ${uid})
          ON CONFLICT (id) DO NOTHING
        `;
      } catch (error) {
        console.warn('[workspace-access] insert attempt failed', id, error);
        continue;
      }
    }

    if (await userOwnsWorkspace(uid, id)) return id;

    // Row exists but not ours — try next candidate.
  }

  // Last resort: force-upsert a unique id that cannot conflict.
  const forced = `ws-${uid.substring(0, 8)}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
  try {
    await sql`
      INSERT INTO public.workspaces (id, user_id, name, slug)
      VALUES (${forced}, ${uid}, ${name}, ${forced})
    `;
  } catch {
    try {
      await sql`
        INSERT INTO public.workspaces (id, user_id)
        VALUES (${forced}, ${uid})
      `;
    } catch (error) {
      console.warn('[workspace-access] forced create failed', error);
      return null;
    }
  }

  return (await userOwnsWorkspace(uid, forced)) ? forced : null;
}

/**
 * Claim preferred workspace when unowned / missing; never steal another user's row.
 */
async function tryClaimPreferredWorkspace(
  userId: string,
  workspaceId: string
): Promise<string | null> {
  const uid = userId.trim();
  const wid = decodeWorkspaceId(workspaceId);
  if (!wid) return null;

  try {
    const existing = await sql`
      SELECT id, user_id
      FROM public.workspaces
      WHERE id::text = ${wid}
      LIMIT 1
    `;

    if (Array.isArray(existing) && existing[0]) {
      const owner =
        existing[0].user_id != null ? String(existing[0].user_id).trim() : '';
      if (owner === uid) return String(existing[0].id);
      if (owner && owner !== uid) {
        return null;
      }
      // Unowned row — claim for this user.
      try {
        await sql`
          UPDATE public.workspaces
          SET user_id = ${uid}, updated_at = now()
          WHERE id::text = ${wid}
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
 * Preferred id → claim if possible → primary → auto-create.
 * Never returns workspace_forbidden for a wrong cookie.
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

  const preferred = decodeWorkspaceId(input.preferredWorkspaceId);

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

  return { ok: false, status: 503, error: 'workspace_create_failed' };
}

/**
 * Claim or verify a specific workspace id (no fallback).
 * Prefer resolveWorkspaceForOAuthUser for OAuth callbacks.
 */
export async function ensureWorkspaceOwnedByUser(
  userId: string,
  workspaceId: string | null | undefined
): Promise<WorkspaceAccessResult> {
  const uid = userId?.trim();
  const wid = decodeWorkspaceId(workspaceId);

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

  return { ok: false, status: 403, error: 'workspace_forbidden' };
}

export async function requireOwnedWorkspace(
  userId: string,
  workspaceId: string | null | undefined
): Promise<WorkspaceAccessResult> {
  return ensureWorkspaceOwnedByUser(userId, workspaceId);
}

/**
 * Strict workspace ownership for social / OAuth / inbox APIs.
 * OAuth paths must never fail with workspace_forbidden on a bad cookie —
 * fall back to primary workspace or auto-create a per-user workspace.
 */

import sql from '@/app/api/utils/sql';
import { resolveInitialWorkspaceName } from '@/lib/workspace-naming';

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

/**
 * Prefer a workspace that already has Instagram connected (inbox / automations),
 * then most recently updated, then oldest row. Avoids empty remaps when the
 * browser cookie points at a foreign/legacy id like default-my-workspace.
 */
async function findPrimaryWorkspaceId(userId: string): Promise<string | null> {
  try {
    const withIg = await sql`
      SELECT w.id
      FROM public.workspaces w
      INNER JOIN public.social_accounts sa
        ON sa.workspace_id::text = w.id::text
       AND sa.user_id::text = ${userId}
       AND lower(sa.platform::text) = 'instagram'
       AND sa.access_token IS NOT NULL
       AND sa.access_token <> ''
      WHERE w.user_id::text = ${userId}
      ORDER BY
        CASE WHEN sa.handle IS NOT NULL AND sa.handle <> '' THEN 0 ELSE 1 END,
        w.updated_at DESC NULLS LAST,
        w.created_at DESC NULLS LAST,
        w.id DESC
      LIMIT 1
    `;
    if (Array.isArray(withIg) && withIg[0]?.id) return String(withIg[0].id);
  } catch (error) {
    console.warn('[workspace-access] IG-linked workspace lookup failed', error);
  }

  try {
    const rows = await sql`
      SELECT id
      FROM public.workspaces
      WHERE user_id::text = ${userId}
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
      LIMIT 1
    `;
    if (Array.isArray(rows) && rows[0]?.id) return String(rows[0].id);
  } catch {
    try {
      const rows = await sql`
        SELECT id
        FROM public.workspaces
        WHERE user_id = ${userId}
        ORDER BY created_at DESC NULLS LAST, id DESC
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
 * Uses signup workspace metadata when provided; otherwise "[First]'s Workspace".
 * Idempotent: returns an existing workspace if the user already has one.
 */
export async function createDefaultWorkspaceForUser(input: {
  userId: string;
  email?: string | null;
  userName?: string | null;
  workspaceName?: string | null;
}): Promise<string | null> {
  const uid = input.userId.trim();
  if (!uid) return null;

  // Never spawn a second default when the account already has a workspace.
  const existing = await findPrimaryWorkspaceId(uid);
  if (existing) {
    const name = resolveInitialWorkspaceName({
      workspaceName: input.workspaceName,
      userName: input.userName,
      email: input.email,
    });
    if (input.workspaceName?.trim()) {
      try {
        await sql`
          UPDATE public.workspaces
          SET name = COALESCE(NULLIF(name, ''), ${name})
          WHERE id = ${existing} AND user_id::text = ${uid}
        `;
      } catch {
        /* ignore */
      }
    }
    return existing;
  }

  const name = resolveInitialWorkspaceName({
    workspaceName: input.workspaceName,
    userName: input.userName,
    email: input.email,
  });
  // Stable id shared with ensureDurableDefaultWorkspace — one row per user.
  const id = `ws-${uid.substring(0, 12)}`;
  const slug = `ws-${uid.substring(0, 8)}`;

  try {
    await sql`
      INSERT INTO public.workspaces (id, user_id, name, slug)
      VALUES (${id}, ${uid}, ${name}, ${slug})
      ON CONFLICT (id) DO UPDATE SET
        user_id = COALESCE(public.workspaces.user_id, EXCLUDED.user_id),
        name = COALESCE(NULLIF(public.workspaces.name, ''), EXCLUDED.name)
    `;
  } catch {
    try {
      await sql`
        INSERT INTO public.workspaces (id, user_id, name)
        VALUES (${id}, ${uid}, ${name})
        ON CONFLICT (id) DO NOTHING
      `;
    } catch (error) {
      console.warn('[workspace-access] default insert failed', error);
      return findPrimaryWorkspaceId(uid);
    }
  }

  if (await userOwnsWorkspace(uid, id)) return id;
  return findPrimaryWorkspaceId(uid);
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

    // Preferred id does not exist. Do NOT insert a second stub for a stale
    // cookie (e.g. default-my-workspace) when the user already has a workspace.
    const primary = await findPrimaryWorkspaceId(uid);
    if (primary) return primary;

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
 */
export async function resolveWorkspaceForOAuthUser(input: {
  userId: string;
  preferredWorkspaceId?: string | null;
  email?: string | null;
  userName?: string | null;
  workspaceName?: string | null;
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
    userName: input.userName,
    workspaceName: input.workspaceName,
  });
  if (created) {
    return { ok: true, workspaceId: created };
  }

  return { ok: false, status: 503, error: 'workspace_create_failed' };
}

/**
 * Claim or verify a specific workspace id (no fallback).
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

/**
 * OAuth callbacks: always return a workspace this user owns.
 */
export async function resolveOwnedWorkspaceForOAuth(input: {
  userId: string;
  email?: string | null;
  userName?: string | null;
  workspaceName?: string | null;
  preferredWorkspaceId?: string | null;
}): Promise<string | null> {
  const uid = input.userId?.trim();
  if (!uid) return null;

  const access = await resolveWorkspaceForOAuthUser({
    userId: uid,
    preferredWorkspaceId: input.preferredWorkspaceId,
    email: input.email,
    userName: input.userName,
    workspaceName: input.workspaceName,
  });

  if (access.ok && (await userOwnsWorkspace(uid, access.workspaceId))) {
    return access.workspaceId;
  }

  const created = await createDefaultWorkspaceForUser({
    userId: uid,
    email: input.email,
    userName: input.userName,
    workspaceName: input.workspaceName,
  });
  if (created && (await userOwnsWorkspace(uid, created))) {
    return created;
  }

  return null;
}

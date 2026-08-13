/**
 * Workspace binding helpers for communities + community storefront revenue.
 */

import sql from '@/app/api/utils/sql';
import { ensureCommunitiesSchema } from '@/lib/communities/schema';

/** Default local workspace id used across clikd: when none is set. */
export const DEFAULT_WORKSPACE_ID = 'default-my-workspace';

/**
 * Resolve the active workspace from request signals, then fall back to the
 * user's primary workspace row (never null for authenticated creators).
 */
export async function resolvePrimaryWorkspaceForUser(
  userId: string
): Promise<string> {
  if (!userId) return DEFAULT_WORKSPACE_ID;
  if (!process.env.DATABASE_URL?.trim()) return DEFAULT_WORKSPACE_ID;

  try {
    const rows = await sql`
      SELECT id FROM public.workspaces
      WHERE user_id = ${userId}
      ORDER BY updated_at DESC NULLS LAST
      LIMIT 1
    `;
    if (rows?.[0]?.id) return String(rows[0].id);
  } catch {
    /* fall through */
  }

  // Prefer creator_id-scoped communities already bound to a workspace.
  try {
    await ensureCommunitiesSchema();
    const rows = await sql`
      SELECT workspace_id FROM communities
      WHERE creator_id = ${userId}
        AND workspace_id IS NOT NULL
        AND workspace_id <> ''
      ORDER BY created_at DESC NULLS LAST
      LIMIT 1
    `;
    if (rows?.[0]?.workspace_id) return String(rows[0].workspace_id);
  } catch {
    /* fall through */
  }

  return DEFAULT_WORKSPACE_ID;
}

export type CommunityBillingWorkspace = {
  workspaceId: string | null;
  creatorId: string | null;
  communityId: number | null;
};

/**
 * Look up the workspace that should receive revenue for a community
 * (or a storefront product belonging to that community).
 */
export async function resolveCommunityBillingWorkspace(input: {
  communityId?: number | string | null;
  productId?: number | string | null;
}): Promise<CommunityBillingWorkspace> {
  const empty: CommunityBillingWorkspace = {
    workspaceId: null,
    creatorId: null,
    communityId: null,
  };
  if (!process.env.DATABASE_URL?.trim()) return empty;

  try {
    await ensureCommunitiesSchema();

    let communityId: number | null =
      input.communityId != null && String(input.communityId).trim() !== ''
        ? Number(input.communityId)
        : null;

    // productId may be "community_13" from membership checkout.
    if (
      (communityId == null || Number.isNaN(communityId)) &&
      input.productId != null
    ) {
      const raw = String(input.productId);
      const m = raw.match(/^community_(\d+)$/i);
      if (m) communityId = Number(m[1]);
    }

    // Resolve via products.community_id when only a numeric product id is known.
    if (
      (communityId == null || Number.isNaN(communityId)) &&
      input.productId != null &&
      /^\d+$/.test(String(input.productId))
    ) {
      try {
        const prod = await sql`
          SELECT community_id FROM products
          WHERE id = ${Number(input.productId)}
          LIMIT 1
        `;
        if (prod?.[0]?.community_id != null) {
          communityId = Number(prod[0].community_id);
        }
      } catch {
        /* products table may be absent */
      }
    }

    if (communityId == null || Number.isNaN(communityId)) return empty;

    const rows = await sql`
      SELECT id, workspace_id, creator_id
      FROM communities
      WHERE id = ${communityId}
      LIMIT 1
    `;
    const row = rows?.[0] as
      | { id?: unknown; workspace_id?: unknown; creator_id?: unknown }
      | undefined;
    if (!row) return empty;

    const workspaceId =
      row.workspace_id != null && String(row.workspace_id).trim()
        ? String(row.workspace_id).trim()
        : row.creator_id != null && String(row.creator_id).trim()
          ? String(row.creator_id).trim()
          : null;

    return {
      workspaceId,
      creatorId:
        row.creator_id != null ? String(row.creator_id).trim() : null,
      communityId: Number(row.id),
    };
  } catch (error) {
    console.warn('[resolveCommunityBillingWorkspace]', error);
    return empty;
  }
}

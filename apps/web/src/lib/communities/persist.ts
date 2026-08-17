/**
 * Persist a new community row to Postgres with workspace + owner bindings.
 * Both admin create endpoints use this so communities never land as orphans.
 */

import sql from '@/app/api/utils/sql';
import { ensureCommunitiesSchema } from '@/lib/communities/schema';

export type PersistCommunityInput = {
  name: string;
  slug: string;
  description: string;
  category: string;
  coverColor?: string;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  isFree: boolean;
  monthlyPriceSek: number;
  isPublished?: boolean;
  /** Owning Better Auth user id — stored on creator_id + user_id when columns allow. */
  userId: string;
  userName?: string | null;
  userImage?: string | null;
  /** Active workspace id — required so admin lists stay correct after refresh. */
  workspaceId: string;
};

export type PersistCommunityResult =
  | { ok: true; community: Record<string, unknown> }
  | { ok: false; error: string; status: number };

/**
 * Insert community + owner membership. Returns the full DB row.
 */
export async function persistCommunityToDatabase(
  input: PersistCommunityInput,
): Promise<PersistCommunityResult> {
  const name = input.name.trim();
  if (!name) {
    return { ok: false, error: 'Name is required', status: 400 };
  }
  const userId = input.userId.trim();
  const workspaceId = input.workspaceId.trim();
  if (!userId || !workspaceId) {
    return { ok: false, error: 'Workspace binding required', status: 403 };
  }

  await ensureCommunitiesSchema();

  const slug = input.slug.trim() || `community-${Date.now().toString(36)}`;
  const description = input.description.trim() || 'Your creator community.';
  const category = input.category.trim() || 'Other';
  const coverColor = input.coverColor?.trim() || '#2B2568';
  const avatarUrl = input.avatarUrl?.trim() || null;
  const coverUrl = input.coverUrl?.trim() || null;
  const isFree = Boolean(input.isFree);
  const monthlyPriceSek = isFree
    ? 0
    : Math.max(0, Math.round(Number(input.monthlyPriceSek) || 0));
  const isPublished = input.isPublished !== false;
  const creatorName = input.userName?.trim() || 'Creator';
  const creatorImage = input.userImage?.trim() || null;

  let community: Record<string, unknown> | null = null;

  // Full ownership trail: creator_id + user_id + workspace_id.
  try {
    const rows = (await sql`
      INSERT INTO communities (
        name, slug, description, category,
        creator_id, user_id, creator_name, creator_image,
        avatar_url, cover_url, cover_image, cover_color,
        member_count, is_featured, is_published,
        workspace_id, is_free, monthly_price_sek
      ) VALUES (
        ${name},
        ${slug},
        ${description},
        ${category},
        ${userId},
        ${userId},
        ${creatorName},
        ${creatorImage},
        ${avatarUrl},
        ${coverUrl},
        ${coverUrl},
        ${coverColor},
        ${1},
        ${false},
        ${isPublished},
        ${workspaceId},
        ${isFree},
        ${monthlyPriceSek}
      )
      RETURNING *
    `) as Record<string, unknown>[];
    community = rows[0] ?? null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // creator_id / user_id may FK to a different users table — keep workspace_id either way.
    const dropOwnerCols = /creator_id|user_id|foreign key|violates foreign key/i.test(msg);
    if (!dropOwnerCols) {
      console.error('[communities] persist failed:', err);
      return { ok: false, error: msg || 'Failed to create community', status: 500 };
    }

    try {
      const rows = (await sql`
        INSERT INTO communities (
          name, slug, description, category,
          creator_name, creator_image,
          avatar_url, cover_url, cover_image, cover_color,
          member_count, is_featured, is_published,
          workspace_id, is_free, monthly_price_sek
        ) VALUES (
          ${name},
          ${slug},
          ${description},
          ${category},
          ${creatorName},
          ${creatorImage},
          ${avatarUrl},
          ${coverUrl},
          ${coverUrl},
          ${coverColor},
          ${1},
          ${false},
          ${isPublished},
          ${workspaceId},
          ${isFree},
          ${monthlyPriceSek}
        )
        RETURNING *
      `) as Record<string, unknown>[];
      community = rows[0] ?? null;

      // Best-effort: stamp user_id / creator_id after insert if columns accept text.
      if (community?.id) {
        try {
          const patched = (await sql`
            UPDATE communities
            SET
              user_id = COALESCE(user_id, ${userId}),
              creator_id = COALESCE(creator_id, ${userId}),
              workspace_id = ${workspaceId},
              updated_at = NOW()
            WHERE id = ${Number(community.id)}
            RETURNING *
          `) as Record<string, unknown>[];
          if (patched[0]) community = patched[0];
        } catch {
          try {
            await sql`
              UPDATE communities
              SET workspace_id = ${workspaceId}
              WHERE id = ${Number(community.id)}
            `;
          } catch {
            /* workspace already set on insert */
          }
        }
      }
    } catch (err2) {
      console.error('[communities] persist without owner cols failed:', err2);
      return {
        ok: false,
        error: err2 instanceof Error ? err2.message : 'Failed to create community',
        status: 500,
      };
    }
  }

  if (!community?.id) {
    return { ok: false, error: 'Community was not saved', status: 500 };
  }

  const communityId = Number(community.id);

  // Owner membership so the creator always appears in members / access checks.
  try {
    await sql`
      INSERT INTO community_memberships (user_id, community_id, role)
      VALUES (${userId}, ${communityId}, 'owner')
      ON CONFLICT (user_id, community_id) DO UPDATE SET role = 'owner'
    `;
  } catch (membershipErr) {
    console.warn('[communities] owner membership insert failed (community still saved):', membershipErr);
  }

  // Re-read so callers get columns after any triggers / defaults.
  try {
    const verified = (await sql`
      SELECT * FROM communities WHERE id = ${communityId} LIMIT 1
    `) as Record<string, unknown>[];
    if (verified[0]) community = verified[0];
  } catch {
    /* keep INSERT RETURNING row */
  }

  // Guarantee workspace binding even if a trigger stripped it.
  const storedWorkspace = String(community.workspace_id ?? '').trim();
  if (storedWorkspace !== workspaceId) {
    try {
      const patched = (await sql`
        UPDATE communities
        SET workspace_id = ${workspaceId}, updated_at = NOW()
        WHERE id = ${communityId}
        RETURNING *
      `) as Record<string, unknown>[];
      if (patched[0]) community = patched[0];
    } catch (patchErr) {
      console.warn('[communities] workspace patch after insert failed:', patchErr);
    }
  }

  return { ok: true, community };
}

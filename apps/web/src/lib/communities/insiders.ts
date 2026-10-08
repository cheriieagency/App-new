/**
 * Clikd Insiders — default community every new account joins.
 * Owner / admin is always hello@clikd.app (CLIKD_QA_ACCOUNT).
 */

import sql from '@/app/api/utils/sql';
import { ensureCommunitiesSchema } from '@/lib/communities/schema';
import { createDefaultWorkspaceForUser } from '@/lib/social/workspace-access';
import { CLIKD_QA_ACCOUNT } from '@/lib/test-accounts';

export const CLIKD_INSIDERS_SLUG = 'clikd-insiders';
export const CLIKD_INSIDERS_NAME = 'Clikd insiders';
export const CLIKD_INSIDERS_ADMIN_EMAIL = CLIKD_QA_ACCOUNT.email;

const FALLBACK_WORKSPACE_ID = 'clikd-insiders-workspace';

type AdminUser = {
  id: string;
  name: string | null;
  image: string | null;
};

type CommunityRow = {
  id: number;
};

let ensureInFlight: Promise<number | null> | null = null;

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

async function findAdminUser(): Promise<AdminUser | null> {
  try {
    const rows = (await sql`
      SELECT id, name, image
      FROM "user"
      WHERE lower(trim(email)) = ${CLIKD_INSIDERS_ADMIN_EMAIL.toLowerCase()}
      LIMIT 1
    `) as Array<{ id?: unknown; name?: unknown; image?: unknown }>;
    const row = rows?.[0];
    if (!row?.id) return null;
    return {
      id: String(row.id),
      name: row.name != null ? String(row.name) : null,
      image: row.image != null ? String(row.image) : null,
    };
  } catch (error) {
    console.warn('[clikd-insiders] admin lookup failed', error);
    return null;
  }
}

async function findInsidersCommunity(): Promise<CommunityRow | null> {
  try {
    const rows = (await sql`
      SELECT id
      FROM communities
      WHERE slug = ${CLIKD_INSIDERS_SLUG}
         OR lower(trim(name)) = ${CLIKD_INSIDERS_NAME.toLowerCase()}
      ORDER BY
        CASE WHEN slug = ${CLIKD_INSIDERS_SLUG} THEN 0 ELSE 1 END,
        id ASC
      LIMIT 1
    `) as Array<{ id?: unknown }>;
    const id = rows?.[0]?.id != null ? Number(rows[0].id) : NaN;
    return Number.isFinite(id) ? { id } : null;
  } catch (error) {
    console.warn('[clikd-insiders] community lookup failed', error);
    return null;
  }
}

async function resolveAdminWorkspaceId(admin: AdminUser): Promise<string> {
  const workspaceId = await createDefaultWorkspaceForUser({
    userId: admin.id,
    email: CLIKD_INSIDERS_ADMIN_EMAIL,
    userName: admin.name || CLIKD_QA_ACCOUNT.name,
    workspaceName: 'Clikd',
  });
  return workspaceId || FALLBACK_WORKSPACE_ID;
}

/**
 * Ensure the published Clikd Insiders community exists and is owned by
 * hello@clikd.app when that account is present.
 */
export async function ensureClikdInsidersCommunity(): Promise<number | null> {
  if (!hasDatabase()) return null;
  if (ensureInFlight) return ensureInFlight;

  ensureInFlight = (async () => {
    try {
      await ensureCommunitiesSchema();
      const admin = await findAdminUser();
      let community = await findInsidersCommunity();

      if (!community) {
        const workspaceId = admin
          ? await resolveAdminWorkspaceId(admin)
          : FALLBACK_WORKSPACE_ID;
        const creatorId = admin?.id ?? null;
        const creatorName = admin?.name?.trim() || CLIKD_QA_ACCOUNT.name;
        const creatorImage = admin?.image ?? null;

        try {
          const inserted = (await sql`
            INSERT INTO communities (
              name, slug, description, category,
              creator_id, user_id, creator_name, creator_image,
              cover_color, member_count, is_featured, is_published,
              workspace_id, is_free, monthly_price_sek
            ) VALUES (
              ${CLIKD_INSIDERS_NAME},
              ${CLIKD_INSIDERS_SLUG},
              ${'Your creator community.'},
              ${'Community'},
              ${creatorId},
              ${creatorId},
              ${creatorName},
              ${creatorImage},
              ${'#2C3B2E'},
              ${admin ? 1 : 0},
              ${true},
              ${true},
              ${workspaceId},
              ${true},
              ${0}
            )
            RETURNING id
          `) as Array<{ id?: unknown }>;
          const id = inserted?.[0]?.id != null ? Number(inserted[0].id) : NaN;
          if (Number.isFinite(id)) community = { id };
        } catch (error) {
          // Race: another process may have created it; re-read.
          console.warn('[clikd-insiders] create failed, retrying lookup', error);
          community = await findInsidersCommunity();
        }
      }

      if (!community) return null;

      // Keep catalog fields + ownership aligned even if the row pre-existed.
      try {
        if (admin) {
          const workspaceId = await resolveAdminWorkspaceId(admin);
          await sql`
            UPDATE communities
            SET
              name = ${CLIKD_INSIDERS_NAME},
              slug = ${CLIKD_INSIDERS_SLUG},
              is_published = true,
              is_featured = true,
              is_free = true,
              monthly_price_sek = 0,
              creator_id = ${admin.id},
              user_id = ${admin.id},
              creator_name = ${admin.name?.trim() || CLIKD_QA_ACCOUNT.name},
              creator_image = COALESCE(${admin.image}, creator_image),
              workspace_id = COALESCE(NULLIF(workspace_id, ''), ${workspaceId}),
              updated_at = NOW()
            WHERE id = ${community.id}
          `;
        } else {
          await sql`
            UPDATE communities
            SET
              name = ${CLIKD_INSIDERS_NAME},
              slug = ${CLIKD_INSIDERS_SLUG},
              is_published = true,
              is_featured = true,
              is_free = true,
              monthly_price_sek = 0,
              updated_at = NOW()
            WHERE id = ${community.id}
          `;
        }
      } catch (error) {
        console.warn('[clikd-insiders] community patch failed', error);
      }

      // hello@clikd.app is always the owner / admin when the account exists.
      if (admin) {
        try {
          await sql`
            INSERT INTO community_memberships (user_id, community_id, role)
            VALUES (${admin.id}, ${community.id}, 'owner')
            ON CONFLICT (user_id, community_id) DO UPDATE
              SET role = 'owner'
          `;
        } catch (error) {
          console.warn('[clikd-insiders] owner membership failed', error);
        }
      }

      return community.id;
    } catch (error) {
      console.warn('[clikd-insiders] ensure failed', error);
      return null;
    } finally {
      ensureInFlight = null;
    }
  })();

  return ensureInFlight;
}

/**
 * Add a user to Clikd Insiders. hello@clikd.app gets owner; everyone else member.
 * Idempotent — safe to call from signup hooks and seed routes.
 */
export async function enrollUserInClikdInsiders(input: {
  userId: string;
  email?: string | null;
  name?: string | null;
}): Promise<{ communityId: number | null; enrolled: boolean }> {
  const userId = input.userId?.trim();
  if (!userId || !hasDatabase()) {
    return { communityId: null, enrolled: false };
  }

  const communityId = await ensureClikdInsidersCommunity();
  if (!communityId) return { communityId: null, enrolled: false };

  const email = (input.email ?? '').trim().toLowerCase();
  const isAdmin = email === CLIKD_INSIDERS_ADMIN_EMAIL.toLowerCase();
  const role = isAdmin ? 'owner' : 'member';

  try {
    const existing = (await sql`
      SELECT role
      FROM community_memberships
      WHERE user_id = ${userId} AND community_id = ${communityId}
      LIMIT 1
    `) as Array<{ role?: string }>;

    if (existing?.[0]) {
      if (isAdmin && existing[0].role !== 'owner') {
        await sql`
          UPDATE community_memberships
          SET role = 'owner'
          WHERE user_id = ${userId} AND community_id = ${communityId}
        `;
      }
      return { communityId, enrolled: false };
    }

    await sql`
      INSERT INTO community_memberships (user_id, community_id, role)
      VALUES (${userId}, ${communityId}, ${role})
      ON CONFLICT (user_id, community_id) DO NOTHING
    `;
    await sql`
      UPDATE communities
      SET member_count = member_count + 1
      WHERE id = ${communityId}
    `;

    if (isAdmin) {
      await sql`
        UPDATE communities
        SET
          creator_id = ${userId},
          user_id = ${userId},
          creator_name = ${input.name?.trim() || CLIKD_QA_ACCOUNT.name}
        WHERE id = ${communityId}
      `;
    }

    return { communityId, enrolled: true };
  } catch (error) {
    console.warn('[clikd-insiders] enroll failed', error);
    return { communityId, enrolled: false };
  }
}

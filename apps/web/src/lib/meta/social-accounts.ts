/**
 * Persist Meta-connected Instagram & Facebook accounts.
 * Uses Neon/Postgres `social_accounts` + `profiles` when DATABASE_URL is set; otherwise demo memory.
 */

import sql from '@/app/api/utils/sql';
import type { MetaOAuthTarget, MetaPageAccount } from '@/lib/meta/oauth';
import type { ConnectedSocialAccount, SocialPlatform } from '@/lib/mock-content-planner';

export type StoredSocialAccount = {
  id: string;
  user_id: string;
  platform: 'instagram' | 'facebook';
  external_id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  followers_count: number | null;
  media_count: number | null;
  access_token: string;
  token_expires_at: string | null;
  page_id: string | null;
  page_name: string | null;
  connected_at: string;
};

const demoByUser = new Map<string, StoredSocialAccount[]>();

function toConnected(row: StoredSocialAccount): ConnectedSocialAccount {
  return {
    platform: row.platform,
    connected: true,
    handle: row.handle,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    connected_at: row.connected_at,
    page_name: row.page_name,
    follower_count: row.followers_count,
    external_id: row.external_id,
  };
}

function mapDbRow(row: Record<string, unknown>): StoredSocialAccount {
  const meta =
    row.meta && typeof row.meta === 'object'
      ? (row.meta as Record<string, unknown>)
      : {};
  const followersFromMeta =
    typeof meta.followers_count === 'number' ? meta.followers_count : null;
  const mediaFromMeta =
    typeof meta.media_count === 'number' ? meta.media_count : null;

  return {
    id: String(row.id),
    user_id: String(row.user_id),
    platform: row.platform as 'instagram' | 'facebook',
    external_id: String(row.external_id),
    handle: (row.handle as string) || null,
    display_name: (row.display_name as string) || null,
    avatar_url: (row.avatar_url as string) || null,
    followers_count:
      typeof row.followers_count === 'number'
        ? row.followers_count
        : followersFromMeta,
    media_count: mediaFromMeta,
    access_token: String(row.access_token),
    token_expires_at: row.token_expires_at ? String(row.token_expires_at) : null,
    page_id: (row.page_id as string) || null,
    page_name: (row.page_name as string) || null,
    connected_at: String(row.connected_at),
  };
}

/** Upsert creator profile avatar / handle / followers from the primary IG Business account. */
async function upsertProfileFromInstagram(input: {
  userId: string;
  username?: string | null;
  avatarUrl?: string | null;
  followersCount?: number | null;
  displayName?: string | null;
}): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;

  const handle = input.username
    ? `@${input.username.replace(/^@/, '')}`
    : null;

  try {
    await sql`
      INSERT INTO profiles (id, display_name, handle, avatar_url, followers_count)
      VALUES (
        ${input.userId},
        ${input.displayName ?? handle},
        ${handle},
        ${input.avatarUrl ?? null},
        ${input.followersCount ?? null}
      )
      ON CONFLICT (id) DO UPDATE SET
        display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
        handle = COALESCE(EXCLUDED.handle, profiles.handle),
        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
        followers_count = COALESCE(EXCLUDED.followers_count, profiles.followers_count)
    `;
  } catch (error) {
    // Older schemas may lack avatar_url / followers_count — fall back to handle only.
    console.warn('[social_accounts] profiles upsert (full) failed, trying handle', error);
    try {
      await sql`
        UPDATE profiles
        SET
          handle = COALESCE(${handle}, handle),
          display_name = COALESCE(${input.displayName ?? handle}, display_name)
        WHERE id = ${input.userId}
      `;
    } catch (fallbackError) {
      console.warn('[social_accounts] profiles upsert skipped', fallbackError);
    }
  }
}

/** Upsert FB pages + IG business accounts from OAuth callback (target-filtered). */
export async function upsertMetaSocialAccounts(input: {
  userId: string;
  pages: MetaPageAccount[];
  /** Long-lived user token expiry (seconds from now), if known. */
  expiresIn?: number;
  /** Which platforms to persist — default both. */
  target?: MetaOAuthTarget;
}): Promise<StoredSocialAccount[]> {
  const target: MetaOAuthTarget = input.target ?? 'both';
  const storeInstagram = target === 'instagram' || target === 'both';
  const storeFacebook = target === 'facebook' || target === 'both';

  const expiresAt =
    typeof input.expiresIn === 'number'
      ? new Date(Date.now() + input.expiresIn * 1000).toISOString()
      : null;

  const rows: StoredSocialAccount[] = [];
  let primaryIg: MetaPageAccount['instagram_business_account'] | undefined;

  for (const page of input.pages) {
    if (storeFacebook) {
      rows.push({
        id: `fb-${page.id}`,
        user_id: input.userId,
        platform: 'facebook',
        external_id: page.id,
        handle: page.name,
        display_name: page.name,
        avatar_url: null,
        followers_count: null,
        media_count: null,
        access_token: page.access_token,
        token_expires_at: expiresAt,
        page_id: page.id,
        page_name: page.name,
        connected_at: new Date().toISOString(),
      });
    }

    const ig = page.instagram_business_account;
    if (storeInstagram && ig?.id) {
      if (!primaryIg) primaryIg = ig;
      const handle = ig.username
        ? `@${ig.username.replace(/^@/, '')}`
        : null;
      rows.push({
        id: `ig-${ig.id}`,
        user_id: input.userId,
        platform: 'instagram',
        external_id: ig.id,
        handle,
        display_name: ig.name || ig.username || page.name,
        avatar_url: ig.profile_picture_url || null,
        followers_count:
          typeof ig.followers_count === 'number' ? ig.followers_count : null,
        media_count: typeof ig.media_count === 'number' ? ig.media_count : null,
        // Page token is used for IG Content Publishing API
        access_token: page.access_token,
        token_expires_at: expiresAt,
        page_id: page.id,
        page_name: page.name,
        connected_at: new Date().toISOString(),
      });
    }
  }

  if (!process.env.DATABASE_URL?.trim()) {
    // Merge into demo store so Instagram-only connect doesn't wipe Facebook.
    const existing = demoByUser.get(input.userId) ?? [];
    const kept = existing.filter((row) => {
      if (storeInstagram && row.platform === 'instagram') return false;
      if (storeFacebook && row.platform === 'facebook') return false;
      return true;
    });
    demoByUser.set(input.userId, [...kept, ...rows]);
    return rows;
  }

  try {
    for (const row of rows) {
      const metaJson = JSON.stringify({
        followers_count: row.followers_count,
        media_count: row.media_count,
      });

      try {
        await sql`
          INSERT INTO social_accounts (
            user_id, platform, external_id, handle, display_name, avatar_url,
            followers_count, access_token, token_expires_at, page_id, page_name,
            meta, connected_at, updated_at
          )
          VALUES (
            ${row.user_id},
            ${row.platform},
            ${row.external_id},
            ${row.handle},
            ${row.display_name},
            ${row.avatar_url},
            ${row.followers_count},
            ${row.access_token},
            ${row.token_expires_at},
            ${row.page_id},
            ${row.page_name},
            ${metaJson},
            now(),
            now()
          )
          ON CONFLICT (user_id, platform, external_id) DO UPDATE SET
            handle = EXCLUDED.handle,
            display_name = EXCLUDED.display_name,
            avatar_url = EXCLUDED.avatar_url,
            followers_count = EXCLUDED.followers_count,
            access_token = EXCLUDED.access_token,
            token_expires_at = EXCLUDED.token_expires_at,
            page_id = EXCLUDED.page_id,
            page_name = EXCLUDED.page_name,
            meta = EXCLUDED.meta,
            connected_at = now(),
            updated_at = now()
        `;
      } catch {
        // Schema without followers_count column — store metrics in meta jsonb.
        await sql`
          INSERT INTO social_accounts (
            user_id, platform, external_id, handle, display_name, avatar_url,
            access_token, token_expires_at, page_id, page_name, meta, connected_at, updated_at
          )
          VALUES (
            ${row.user_id},
            ${row.platform},
            ${row.external_id},
            ${row.handle},
            ${row.display_name},
            ${row.avatar_url},
            ${row.access_token},
            ${row.token_expires_at},
            ${row.page_id},
            ${row.page_name},
            ${metaJson},
            now(),
            now()
          )
          ON CONFLICT (user_id, platform, external_id) DO UPDATE SET
            handle = EXCLUDED.handle,
            display_name = EXCLUDED.display_name,
            avatar_url = EXCLUDED.avatar_url,
            access_token = EXCLUDED.access_token,
            token_expires_at = EXCLUDED.token_expires_at,
            page_id = EXCLUDED.page_id,
            page_name = EXCLUDED.page_name,
            meta = EXCLUDED.meta,
            connected_at = now(),
            updated_at = now()
        `;
      }
    }

    if (primaryIg && storeInstagram) {
      await upsertProfileFromInstagram({
        userId: input.userId,
        username: primaryIg.username,
        avatarUrl: primaryIg.profile_picture_url,
        followersCount: primaryIg.followers_count,
        displayName: primaryIg.name || primaryIg.username,
      });
    }

    return rows;
  } catch (error) {
    console.error('[social_accounts] upsert failed, using demo store', error);
    demoByUser.set(input.userId, rows);
    return rows;
  }
}

/** Refresh followers / avatar on an existing IG row after Graph profile sync. */
export async function updateStoredInstagramProfile(input: {
  userId: string;
  externalId: string;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  followersCount?: number | null;
  mediaCount?: number | null;
}): Promise<void> {
  const handle = input.username
    ? `@${input.username.replace(/^@/, '')}`
    : null;
  const metaJson = JSON.stringify({
    followers_count: input.followersCount ?? null,
    media_count: input.mediaCount ?? null,
  });

  if (!process.env.DATABASE_URL?.trim()) {
    const list = demoByUser.get(input.userId) ?? [];
    const idx = list.findIndex(
      (a) => a.platform === 'instagram' && a.external_id === input.externalId
    );
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        handle: handle ?? list[idx].handle,
        display_name: input.displayName ?? list[idx].display_name,
        avatar_url: input.avatarUrl ?? list[idx].avatar_url,
        followers_count: input.followersCount ?? list[idx].followers_count,
        media_count: input.mediaCount ?? list[idx].media_count,
      };
      demoByUser.set(input.userId, list);
    }
    return;
  }

  try {
    try {
      await sql`
        UPDATE social_accounts SET
          handle = COALESCE(${handle}, handle),
          display_name = COALESCE(${input.displayName ?? null}, display_name),
          avatar_url = COALESCE(${input.avatarUrl ?? null}, avatar_url),
          followers_count = COALESCE(${input.followersCount ?? null}, followers_count),
          meta = ${metaJson},
          updated_at = now()
        WHERE user_id = ${input.userId}
          AND platform = 'instagram'
          AND external_id = ${input.externalId}
      `;
    } catch {
      await sql`
        UPDATE social_accounts SET
          handle = COALESCE(${handle}, handle),
          display_name = COALESCE(${input.displayName ?? null}, display_name),
          avatar_url = COALESCE(${input.avatarUrl ?? null}, avatar_url),
          meta = ${metaJson},
          updated_at = now()
        WHERE user_id = ${input.userId}
          AND platform = 'instagram'
          AND external_id = ${input.externalId}
      `;
    }

    await upsertProfileFromInstagram({
      userId: input.userId,
      username: input.username,
      avatarUrl: input.avatarUrl,
      followersCount: input.followersCount,
      displayName: input.displayName,
    });
  } catch (error) {
    console.warn('[social_accounts] update IG profile failed', error);
  }
}

export async function listMetaSocialAccountsForUser(
  userId: string
): Promise<ConnectedSocialAccount[]> {
  if (!process.env.DATABASE_URL?.trim()) {
    return (demoByUser.get(userId) ?? []).map(toConnected);
  }

  try {
    const rows = await sql`
      SELECT platform, external_id, handle, display_name, avatar_url, page_name, connected_at,
             followers_count, meta
      FROM social_accounts
      WHERE user_id = ${userId}
        AND platform IN ('instagram', 'facebook')
      ORDER BY platform ASC, connected_at DESC
    `;
    if (!Array.isArray(rows) || rows.length === 0) {
      return (demoByUser.get(userId) ?? []).map(toConnected);
    }

    // One card per platform (prefer most recent)
    const byPlatform = new Map<SocialPlatform, ConnectedSocialAccount>();
    for (const r of rows as Array<Record<string, unknown>>) {
      const platform = r.platform as SocialPlatform;
      if (byPlatform.has(platform)) continue;
      const mapped = mapDbRow({
        id: `${platform}-list`,
        user_id: userId,
        access_token: '',
        ...r,
      });
      byPlatform.set(platform, toConnected(mapped));
    }
    return [...byPlatform.values()];
  } catch (error) {
    // Column followers_count may be missing — retry without it.
    try {
      const rows = await sql`
        SELECT platform, external_id, handle, display_name, avatar_url, page_name, connected_at, meta
        FROM social_accounts
        WHERE user_id = ${userId}
          AND platform IN ('instagram', 'facebook')
        ORDER BY platform ASC, connected_at DESC
      `;
      if (!Array.isArray(rows) || rows.length === 0) {
        return (demoByUser.get(userId) ?? []).map(toConnected);
      }
      const byPlatform = new Map<SocialPlatform, ConnectedSocialAccount>();
      for (const r of rows as Array<Record<string, unknown>>) {
        const platform = r.platform as SocialPlatform;
        if (byPlatform.has(platform)) continue;
        const mapped = mapDbRow({
          id: `${platform}-list`,
          user_id: userId,
          access_token: '',
          ...r,
        });
        byPlatform.set(platform, toConnected(mapped));
      }
      return [...byPlatform.values()];
    } catch (fallbackError) {
      console.error('[social_accounts] list failed', fallbackError);
      return (demoByUser.get(userId) ?? []).map(toConnected);
    }
  }
}

export async function listStoredMetaAccounts(
  userId: string
): Promise<StoredSocialAccount[]> {
  if (!process.env.DATABASE_URL?.trim()) {
    return [...(demoByUser.get(userId) ?? [])];
  }

  try {
    const rows = await sql`
      SELECT *
      FROM social_accounts
      WHERE user_id = ${userId}
        AND platform IN ('instagram', 'facebook')
      ORDER BY platform ASC, connected_at DESC
    `;
    if (!Array.isArray(rows) || rows.length === 0) {
      return [...(demoByUser.get(userId) ?? [])];
    }
    return (rows as Array<Record<string, unknown>>).map(mapDbRow);
  } catch (error) {
    console.error('[social_accounts] listStored failed', error);
    return [...(demoByUser.get(userId) ?? [])];
  }
}

export async function getMetaAccessToken(input: {
  userId: string;
  platform: 'instagram' | 'facebook';
  externalId?: string;
}): Promise<StoredSocialAccount | null> {
  if (!process.env.DATABASE_URL?.trim()) {
    const list = demoByUser.get(input.userId) ?? [];
    return (
      list.find(
        (a) =>
          a.platform === input.platform &&
          (!input.externalId || a.external_id === input.externalId)
      ) ?? null
    );
  }

  try {
    const rows = input.externalId
      ? await sql`
          SELECT *
          FROM social_accounts
          WHERE user_id = ${input.userId}
            AND platform = ${input.platform}
            AND external_id = ${input.externalId}
          LIMIT 1
        `
      : await sql`
          SELECT *
          FROM social_accounts
          WHERE user_id = ${input.userId}
            AND platform = ${input.platform}
          ORDER BY connected_at DESC
          LIMIT 1
        `;
    const row = Array.isArray(rows) ? (rows[0] as Record<string, unknown>) : null;
    if (!row) return null;
    return mapDbRow(row);
  } catch {
    return null;
  }
}

/**
 * Delete a single Meta platform row for the user.
 * Does not remove the other platform (Instagram vs Facebook stay independent).
 */
export async function deleteMetaSocialAccount(input: {
  userId: string;
  platform: 'instagram' | 'facebook';
  platformUserId: string;
}): Promise<{ deleted: boolean }> {
  const externalId = input.platformUserId.trim();
  if (!externalId) return { deleted: false };

  if (!process.env.DATABASE_URL?.trim()) {
    const list = demoByUser.get(input.userId) ?? [];
    const next = list.filter(
      (a) =>
        !(a.platform === input.platform && a.external_id === externalId)
    );
    const deleted = next.length !== list.length;
    demoByUser.set(input.userId, next);
    return { deleted };
  }

  try {
    const rows = await sql`
      DELETE FROM social_accounts
      WHERE user_id = ${input.userId}
        AND platform = ${input.platform}
        AND external_id = ${externalId}
      RETURNING id
    `;
    return { deleted: Array.isArray(rows) && rows.length > 0 };
  } catch (error) {
    console.error('[social_accounts] delete failed', error);
    // Fall back to demo store cleanup if DB delete fails.
    const list = demoByUser.get(input.userId) ?? [];
    const next = list.filter(
      (a) =>
        !(a.platform === input.platform && a.external_id === externalId)
    );
    const deleted = next.length !== list.length;
    demoByUser.set(input.userId, next);
    return { deleted };
  }
}

/**
 * Delete all rows for a platform for the user (when external id unknown).
 */
export async function deleteMetaSocialPlatform(input: {
  userId: string;
  platform: 'instagram' | 'facebook';
}): Promise<{ deleted: number }> {
  if (!process.env.DATABASE_URL?.trim()) {
    const list = demoByUser.get(input.userId) ?? [];
    const next = list.filter((a) => a.platform !== input.platform);
    const deleted = list.length - next.length;
    demoByUser.set(input.userId, next);
    return { deleted };
  }

  try {
    const rows = await sql`
      DELETE FROM social_accounts
      WHERE user_id = ${input.userId}
        AND platform = ${input.platform}
      RETURNING id
    `;
    return { deleted: Array.isArray(rows) ? rows.length : 0 };
  } catch (error) {
    console.error('[social_accounts] delete platform failed', error);
    const list = demoByUser.get(input.userId) ?? [];
    const next = list.filter((a) => a.platform !== input.platform);
    const deleted = list.length - next.length;
    demoByUser.set(input.userId, next);
    return { deleted };
  }
}

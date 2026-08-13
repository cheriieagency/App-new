/**
 * Persist Meta-connected Instagram & Facebook accounts.
 * Uses Neon/Postgres `social_accounts` + `profiles` when DATABASE_URL is set; otherwise demo memory.
 */

import sql from '@/app/api/utils/sql';
import type { MetaOAuthTarget, MetaPageAccount } from '@/lib/meta/oauth';
import type { ConnectedSocialAccount, SocialPlatform } from '@/lib/mock-content-planner';
import {
  deleteSocialAccountRow,
  ensureUserProfile,
  upsertSocialAccountRow,
} from '@/lib/social/persist';

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
    external_id: String(
      row.platform_user_id ?? row.external_id ?? ''
    ),
    handle: (row.handle as string) || null,
    display_name:
      (row.display_name as string) ||
      (row.platform_user_name as string) ||
      null,
    avatar_url: (row.avatar_url as string) || null,
    followers_count:
      typeof row.followers_count === 'number'
        ? row.followers_count
        : followersFromMeta,
    media_count: mediaFromMeta,
    access_token: String(row.access_token),
    token_expires_at: row.expires_at
      ? String(row.expires_at)
      : row.token_expires_at
        ? String(row.token_expires_at)
        : null,
    page_id: (row.page_id as string) || null,
    page_name: (row.page_name as string) || null,
    connected_at: String(
      row.connected_at || row.created_at || new Date().toISOString()
    ),
  };
}

/** Upsert creator profile avatar / handle from the primary IG Business account.
 * Never requires followers_count on public.profiles (column may be absent).
 */
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
  const displayName = input.displayName ?? handle;

  // 1) Core columns only — safe across schemas without followers_count.
  try {
    await sql`
      INSERT INTO profiles (id, display_name, handle, avatar_url)
      VALUES (
        ${input.userId},
        ${displayName},
        ${handle},
        ${input.avatarUrl ?? null}
      )
      ON CONFLICT (id) DO UPDATE SET
        display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
        handle = COALESCE(EXCLUDED.handle, profiles.handle),
        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url)
    `;
  } catch (error) {
    console.warn(
      '[social_accounts] profiles upsert (core) failed, trying minimal',
      error
    );
    try {
      await sql`
        INSERT INTO profiles (id, display_name, handle)
        VALUES (${input.userId}, ${displayName}, ${handle})
        ON CONFLICT (id) DO UPDATE SET
          display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
          handle = COALESCE(EXCLUDED.handle, profiles.handle)
      `;
    } catch {
      try {
        await sql`
          UPDATE profiles
          SET
            handle = COALESCE(${handle}, handle),
            display_name = COALESCE(${displayName}, display_name)
          WHERE id = ${input.userId}
        `;
      } catch (fallbackError) {
        console.warn(
          '[social_accounts] profiles upsert skipped',
          fallbackError
        );
        return;
      }
    }
  }

  // 2) Optional followers_count — omit entirely if column is missing.
  if (
    typeof input.followersCount === 'number' &&
    Number.isFinite(input.followersCount)
  ) {
    try {
      await sql`
        UPDATE profiles
        SET followers_count = ${input.followersCount}
        WHERE id = ${input.userId}
      `;
    } catch (followersError) {
      console.warn(
        '[social_accounts] profiles.followers_count skipped (column missing?)',
        followersError
      );
    }
  }
}

/** Upsert FB pages + IG business accounts from OAuth callback (target-filtered). */
export async function upsertMetaSocialAccounts(input: {
  userId: string;
  pages: MetaPageAccount[];
  /** Long-lived user token — used when a page token is missing (portfolio IG). */
  userAccessToken?: string | null;
  /** Long-lived user token expiry (seconds from now), if known. */
  expiresIn?: number;
  /** Which platforms to persist — default both. */
  target?: MetaOAuthTarget;
  /** Active workspace id (optional). */
  workspaceId?: string | null;
  /** Pre-resolved IG (from page or Business Portfolio fallback). */
  instagram?: MetaPageAccount['instagram_business_account'] | null;
  instagramPage?: MetaPageAccount | null;
}): Promise<StoredSocialAccount[]> {
  const target: MetaOAuthTarget = input.target ?? 'both';
  const storeInstagram = target === 'instagram' || target === 'both';
  const storeFacebook = target === 'facebook' || target === 'both';
  const workspaceId = input.workspaceId?.trim() || null;
  const userToken = input.userAccessToken?.trim() || '';

  const rows: StoredSocialAccount[] = [];
  let primaryIg: MetaPageAccount['instagram_business_account'] | undefined;
  let primaryPage: MetaPageAccount | undefined;

  // Real Facebook Pages only (skip synthetic portfolio shells without page tokens).
  const facebookPages = input.pages.filter(
    (p) => p.access_token && !String(p.id).startsWith('user-')
  );

  for (const page of facebookPages) {
    // Always persist the Page-specific access_token (never the user token).
    const pageAccessToken = String(page.access_token || '').trim();
    if (!pageAccessToken) {
      console.warn(
        '[social_accounts] skipping page without page.access_token',
        page.id
      );
      continue;
    }

    if (storeFacebook && !rows.some((r) => r.platform === 'facebook')) {
      // One Facebook row per user (UNIQUE user_id, platform) — keep first page.
      const saved = await upsertSocialAccountRow({
        userId: input.userId,
        platform: 'facebook',
        platformUserId: page.id,
        platformUserName: page.name,
        accessToken: pageAccessToken,
        expiresIn: input.expiresIn,
        workspaceId,
        pageId: page.id,
        pageName: page.name,
        handle: page.name,
        meta: {
          ...(page.category ? { category: page.category } : {}),
          token_source: 'page',
        },
      });
      console.log(
        '[social_accounts] stored Facebook Page Access Token',
        page.id
      );
      rows.push({
        id: `fb-${page.id}`,
        user_id: input.userId,
        platform: 'facebook',
        external_id: page.id,
        handle: saved.handle,
        display_name: saved.display_name,
        avatar_url: saved.avatar_url,
        followers_count: null,
        media_count: null,
        access_token: pageAccessToken,
        token_expires_at: null,
        page_id: page.id,
        page_name: page.name,
        connected_at: saved.connected_at || new Date().toISOString(),
      });
    }
  }

  // Prefer pre-resolved IG (portfolio-aware), else scan every page.
  const resolvedIg =
    input.instagram?.id
      ? {
          ig: input.instagram,
          page: input.instagramPage ?? null,
        }
      : (() => {
          for (const page of input.pages) {
            const ig = page.instagram_business_account;
            if (ig?.id) return { ig, page };
          }
          return null;
        })();

  if (storeInstagram && resolvedIg?.ig.id) {
    const ig = resolvedIg.ig;
    const page = resolvedIg.page;
    primaryIg = ig;
    primaryPage = page ?? undefined;
    const handle = ig.username
      ? `@${ig.username.replace(/^@/, '')}`
      : null;
    // Prefer the linked Facebook Page Access Token for IG (required for subscribed_apps + messaging).
    const pageAccessToken =
      page?.access_token && !String(page.id || '').startsWith('user-')
        ? String(page.access_token).trim()
        : '';
    const accessToken = pageAccessToken || userToken;
    if (!accessToken) {
      throw new Error('No page or user access token available for Instagram');
    }
    if (!pageAccessToken) {
      console.warn(
        '[social_accounts] Instagram stored with user token — reconnect after granting pages_manage_metadata so Page Access Token is available'
      );
    } else {
      console.log(
        '[social_accounts] stored Instagram with Page Access Token',
        { igUserId: ig.id, pageId: page?.id }
      );
    }
    const saved = await upsertSocialAccountRow({
      userId: input.userId,
      platform: 'instagram',
      platformUserId: ig.id,
      platformUserName: ig.username || ig.name || page?.name || 'Instagram',
      accessToken,
      expiresIn: input.expiresIn,
      avatarUrl: ig.profile_picture_url || null,
      handle,
      workspaceId,
      pageId: page && !String(page.id).startsWith('user-') ? page.id : null,
      pageName: page && !String(page.id).startsWith('user-') ? page.name : null,
      followersCount:
        typeof ig.followers_count === 'number' ? ig.followers_count : null,
      meta: {
        media_count: ig.media_count ?? null,
        followers_count: ig.followers_count ?? null,
        token_source: pageAccessToken ? 'page' : 'user_long_lived',
      },
    });
    rows.push({
      id: `ig-${ig.id}`,
      user_id: input.userId,
      platform: 'instagram',
      external_id: ig.id,
      handle: saved.handle,
      display_name: saved.display_name,
      avatar_url: saved.avatar_url,
      followers_count: saved.follower_count ?? null,
      media_count: typeof ig.media_count === 'number' ? ig.media_count : null,
      access_token: accessToken,
      token_expires_at: null,
      page_id: page && !String(page.id).startsWith('user-') ? page.id : null,
      page_name: page && !String(page.id).startsWith('user-') ? page.name : null,
      connected_at: saved.connected_at || new Date().toISOString(),
    });
  }

  if (primaryIg) {
    await ensureUserProfile({
      userId: input.userId,
      displayName: primaryIg.name || primaryIg.username,
      handle: primaryIg.username
        ? `@${primaryIg.username.replace(/^@/, '')}`
        : null,
      avatarUrl: primaryIg.profile_picture_url,
    });
  }

  void primaryPage;
  return rows;
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
          platform_user_name = COALESCE(${input.displayName ?? handle}, platform_user_name),
          avatar_url = COALESCE(${input.avatarUrl ?? null}, avatar_url),
          followers_count = COALESCE(${input.followersCount ?? null}, followers_count),
          meta = ${metaJson},
          updated_at = now()
        WHERE user_id = ${input.userId}
          AND platform = 'instagram'
          AND (
            platform_user_id = ${input.externalId}
            OR platform_user_id IS NULL
          )
      `;
    } catch {
      await sql`
        UPDATE social_accounts SET
          handle = COALESCE(${handle}, handle),
          display_name = COALESCE(${input.displayName ?? null}, display_name),
          platform_user_name = COALESCE(${input.displayName ?? handle}, platform_user_name),
          avatar_url = COALESCE(${input.avatarUrl ?? null}, avatar_url),
          meta = ${metaJson},
          updated_at = now()
        WHERE user_id = ${input.userId}
          AND platform = 'instagram'
          AND (
            platform_user_id = ${input.externalId}
            OR platform_user_id IS NULL
          )
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
    let rows: unknown;
    try {
      rows = await sql`
        SELECT platform, platform_user_id, handle, display_name, platform_user_name,
               avatar_url, page_name, connected_at, created_at, followers_count, meta
        FROM social_accounts
        WHERE user_id = ${userId}
          AND platform IN ('instagram', 'facebook')
        ORDER BY platform ASC, id DESC
      `;
    } catch {
      // Older schemas may lack followers_count / connected_at — omit them.
      rows = await sql`
        SELECT platform, platform_user_id, handle, display_name, platform_user_name,
               avatar_url, page_name, meta
        FROM social_accounts
        WHERE user_id = ${userId}
          AND platform IN ('instagram', 'facebook')
        ORDER BY platform ASC, id DESC
      `;
    }
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
    // Older schemas may lack some columns — retry with a minimal SELECT *.
    try {
      const rows = await sql`
        SELECT *
        FROM social_accounts
        WHERE user_id = ${userId}
          AND platform IN ('instagram', 'facebook')
        ORDER BY created_at DESC
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
      ORDER BY platform ASC, COALESCE(connected_at, created_at) DESC
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
            AND (
              platform_user_id = ${input.externalId}
              OR platform_user_id IS NULL
            )
          LIMIT 1
        `
      : await sql`
          SELECT *
          FROM social_accounts
          WHERE user_id = ${input.userId}
            AND platform = ${input.platform}
          ORDER BY COALESCE(connected_at, created_at) DESC
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
  return deleteSocialAccountRow({
    userId: input.userId,
    platform: input.platform,
    platformUserId: input.platformUserId,
  });
}

/**
 * Delete all rows for a platform for the user (when external id unknown).
 */
export async function deleteMetaSocialPlatform(input: {
  userId: string;
  platform: 'instagram' | 'facebook';
}): Promise<{ deleted: number }> {
  const result = await deleteSocialAccountRow({
    userId: input.userId,
    platform: input.platform,
  });
  return { deleted: result.deleted ? 1 : 0 };
}

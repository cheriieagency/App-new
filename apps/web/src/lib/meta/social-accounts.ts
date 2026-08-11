/**
 * Persist Meta-connected Instagram & Facebook accounts.
 * Uses Neon/Postgres `social_accounts` when DATABASE_URL is set; otherwise demo memory.
 */

import sql from '@/app/api/utils/sql';
import type { MetaPageAccount } from '@/lib/meta/oauth';
import type { ConnectedSocialAccount, SocialPlatform } from '@/lib/mock-content-planner';

export type StoredSocialAccount = {
  id: string;
  user_id: string;
  platform: 'instagram' | 'facebook';
  external_id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
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
    follower_count: null,
  };
}

/** Upsert FB pages + IG business accounts from OAuth callback. */
export async function upsertMetaSocialAccounts(input: {
  userId: string;
  pages: MetaPageAccount[];
  /** Long-lived user token expiry (seconds from now), if known. */
  expiresIn?: number;
}): Promise<StoredSocialAccount[]> {
  const expiresAt =
    typeof input.expiresIn === 'number'
      ? new Date(Date.now() + input.expiresIn * 1000).toISOString()
      : null;

  const rows: StoredSocialAccount[] = [];

  for (const page of input.pages) {
    rows.push({
      id: `fb-${page.id}`,
      user_id: input.userId,
      platform: 'facebook',
      external_id: page.id,
      handle: page.name,
      display_name: page.name,
      avatar_url: null,
      access_token: page.access_token,
      token_expires_at: expiresAt,
      page_id: page.id,
      page_name: page.name,
      connected_at: new Date().toISOString(),
    });

    const ig = page.instagram_business_account;
    if (ig?.id) {
      rows.push({
        id: `ig-${ig.id}`,
        user_id: input.userId,
        platform: 'instagram',
        external_id: ig.id,
        handle: ig.username ? `@${ig.username.replace(/^@/, '')}` : null,
        display_name: ig.username || page.name,
        avatar_url: ig.profile_picture_url || null,
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
    demoByUser.set(input.userId, rows);
    return rows;
  }

  try {
    for (const row of rows) {
      await sql`
        INSERT INTO social_accounts (
          user_id, platform, external_id, handle, display_name, avatar_url,
          access_token, token_expires_at, page_id, page_name, connected_at, updated_at
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
          connected_at = now(),
          updated_at = now()
      `;
    }
    return rows;
  } catch (error) {
    console.error('[social_accounts] upsert failed, using demo store', error);
    demoByUser.set(input.userId, rows);
    return rows;
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
      SELECT platform, handle, display_name, avatar_url, page_name, connected_at
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
      byPlatform.set(platform, {
        platform,
        connected: true,
        handle: (r.handle as string) || null,
        display_name: (r.display_name as string) || null,
        avatar_url: (r.avatar_url as string) || null,
        connected_at: String(r.connected_at),
        page_name: (r.page_name as string) || null,
      });
    }
    return [...byPlatform.values()];
  } catch (error) {
    console.error('[social_accounts] list failed', error);
    return (demoByUser.get(userId) ?? []).map(toConnected);
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
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return null;
    return {
      id: String(row.id),
      user_id: String(row.user_id),
      platform: row.platform as 'instagram' | 'facebook',
      external_id: String(row.external_id),
      handle: (row.handle as string) || null,
      display_name: (row.display_name as string) || null,
      avatar_url: (row.avatar_url as string) || null,
      access_token: String(row.access_token),
      token_expires_at: row.token_expires_at ? String(row.token_expires_at) : null,
      page_id: (row.page_id as string) || null,
      page_name: (row.page_name as string) || null,
      connected_at: String(row.connected_at),
    };
  } catch {
    return null;
  }
}

/**
 * Generic OAuth social account persistence (YouTube, LinkedIn, etc.).
 * Shares the `social_accounts` table with Meta Instagram/Facebook rows.
 */

import sql from '@/app/api/utils/sql';
import type { ConnectedSocialAccount, SocialPlatform } from '@/lib/mock-content-planner';
import { ensureUserProfile } from '@/lib/social/persist';

export type OAuthSocialPlatform = 'youtube' | 'linkedin' | 'tiktok' | 'instagram' | 'facebook';

export type UpsertOAuthSocialAccountInput = {
  userId: string;
  platform: OAuthSocialPlatform;
  externalId: string;
  handle?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  followersCount?: number | null;
  subscriberCount?: number | null;
  accessToken: string;
  refreshToken?: string | null;
  expiresIn?: number | null;
  companyUrl?: string | null;
  workspaceId?: string | null;
};

type DemoRow = UpsertOAuthSocialAccountInput & { connected_at: string };

const demoByUser = new Map<string, DemoRow[]>();

function pickString(row: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const v = row[key];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return null;
}

function pickNumber(row: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const v = row[key];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return null;
}

function toConnected(row: DemoRow | Record<string, unknown>): ConnectedSocialAccount {
  const r = row as Record<string, unknown>;
  const platform = String(r.platform) as SocialPlatform;
  const meta =
    r.meta && typeof r.meta === 'object'
      ? (r.meta as Record<string, unknown>)
      : {};

  const subscriberCount =
    pickNumber(r, 'subscriberCount', 'subscriber_count') ??
    pickNumber(meta, 'subscriber_count') ??
    (platform === 'youtube'
      ? pickNumber(r, 'followersCount', 'followers_count')
      : null);

  const followersCount =
    pickNumber(r, 'followersCount', 'followers_count') ??
    pickNumber(meta, 'followers_count');

  return {
    platform,
    connected: true,
    handle: pickString(r, 'handle'),
    display_name: pickString(r, 'displayName', 'display_name'),
    avatar_url: pickString(r, 'avatarUrl', 'avatar_url'),
    connected_at: String(r.connected_at ?? new Date().toISOString()),
    follower_count: followersCount,
    subscriber_count: subscriberCount,
    company_url:
      pickString(r, 'companyUrl', 'company_url') ??
      pickString(meta, 'company_url'),
    external_id: pickString(r, 'externalId', 'external_id') ?? '',
  };
}

/** Upsert one OAuth-connected social account for the user. */
export async function upsertOAuthSocialAccount(
  input: UpsertOAuthSocialAccountInput
): Promise<ConnectedSocialAccount> {
  // Critical: FK social_accounts.user_id → profiles.id
  await ensureUserProfile({
    userId: input.userId,
    displayName: input.displayName,
    handle: input.handle,
    avatarUrl: input.avatarUrl,
  });

  const expiresAt =
    typeof input.expiresIn === 'number'
      ? new Date(Date.now() + input.expiresIn * 1000).toISOString()
      : null;
  const connectedAt = new Date().toISOString();
  const workspaceId = input.workspaceId?.trim() || null;
  const metaJson = JSON.stringify({
    refresh_token: input.refreshToken ?? null,
    subscriber_count: input.subscriberCount ?? null,
    followers_count: input.followersCount ?? null,
    company_url: input.companyUrl ?? null,
  });
  const followers =
    input.subscriberCount ?? input.followersCount ?? null;

  const demoRow: DemoRow = { ...input, connected_at: connectedAt };

  if (!process.env.DATABASE_URL?.trim()) {
    const list = demoByUser.get(input.userId) ?? [];
    const next = list.filter(
      (r) =>
        !(r.platform === input.platform && r.externalId === input.externalId)
    );
    next.push(demoRow);
    demoByUser.set(input.userId, next);
    return toConnected(demoRow);
  }

  try {
    try {
      await sql`
        INSERT INTO social_accounts (
          user_id, platform, external_id, handle, display_name, avatar_url,
          followers_count, access_token, refresh_token, token_expires_at,
          workspace_id, meta, connected_at, updated_at
        )
        VALUES (
          ${input.userId},
          ${input.platform},
          ${input.externalId},
          ${input.handle ?? null},
          ${input.displayName ?? null},
          ${input.avatarUrl ?? null},
          ${followers},
          ${input.accessToken},
          ${input.refreshToken ?? null},
          ${expiresAt},
          ${workspaceId},
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
          refresh_token = COALESCE(EXCLUDED.refresh_token, social_accounts.refresh_token),
          token_expires_at = EXCLUDED.token_expires_at,
          workspace_id = COALESCE(EXCLUDED.workspace_id, social_accounts.workspace_id),
          meta = EXCLUDED.meta,
          connected_at = now(),
          updated_at = now()
      `;
    } catch {
      await sql`
        INSERT INTO social_accounts (
          user_id, platform, external_id, handle, display_name, avatar_url,
          access_token, token_expires_at, meta, connected_at, updated_at
        )
        VALUES (
          ${input.userId},
          ${input.platform},
          ${input.externalId},
          ${input.handle ?? null},
          ${input.displayName ?? null},
          ${input.avatarUrl ?? null},
          ${input.accessToken},
          ${expiresAt},
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
          meta = EXCLUDED.meta,
          connected_at = now(),
          updated_at = now()
      `;
    }
    return toConnected(demoRow);
  } catch (error) {
    console.error('[oauth-accounts] upsert failed after profile ensure', error);
    throw error;
  }
}

/** List YouTube / LinkedIn / TikTok (and optionally all) OAuth rows for the user. */
export async function listOAuthSocialAccountsForUser(
  userId: string,
  platforms: OAuthSocialPlatform[] = ['youtube', 'linkedin', 'tiktok']
): Promise<ConnectedSocialAccount[]> {
  if (!process.env.DATABASE_URL?.trim()) {
    return (demoByUser.get(userId) ?? [])
      .filter((r) => platforms.includes(r.platform))
      .map(toConnected);
  }

  try {
    const rows = await sql`
      SELECT platform, external_id, handle, display_name, avatar_url,
             followers_count, meta, connected_at
      FROM social_accounts
      WHERE user_id = ${userId}
        AND platform IN ('youtube', 'linkedin', 'tiktok')
      ORDER BY platform ASC, connected_at DESC
    `;
    if (!Array.isArray(rows) || rows.length === 0) {
      return (demoByUser.get(userId) ?? [])
        .filter((r) => platforms.includes(r.platform))
        .map(toConnected);
    }

    const byPlatform = new Map<SocialPlatform, ConnectedSocialAccount>();
    for (const r of rows as Array<Record<string, unknown>>) {
      const platform = r.platform as SocialPlatform;
      if (!platforms.includes(platform as OAuthSocialPlatform)) continue;
      if (byPlatform.has(platform)) continue;
      byPlatform.set(platform, toConnected(r));
    }
    return [...byPlatform.values()];
  } catch (error) {
    console.error('[oauth-accounts] list failed', error);
    return (demoByUser.get(userId) ?? [])
      .filter((r) => platforms.includes(r.platform))
      .map(toConnected);
  }
}

/** Delete one platform row (does not touch other platforms). */
export async function deleteOAuthSocialAccount(input: {
  userId: string;
  platform: OAuthSocialPlatform;
  platformUserId: string;
}): Promise<{ deleted: boolean }> {
  const externalId = input.platformUserId.trim();
  if (!externalId) return { deleted: false };

  if (!process.env.DATABASE_URL?.trim()) {
    const list = demoByUser.get(input.userId) ?? [];
    const next = list.filter(
      (a) =>
        !(a.platform === input.platform && a.externalId === externalId)
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
    console.error('[oauth-accounts] delete failed', error);
    return { deleted: false };
  }
}

/** Delete all rows for a platform when external id is unknown. */
export async function deleteOAuthSocialPlatform(input: {
  userId: string;
  platform: OAuthSocialPlatform;
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
    console.error('[oauth-accounts] delete platform failed', error);
    return { deleted: 0 };
  }
}

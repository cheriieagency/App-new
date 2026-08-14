/**
 * Shared social_accounts persistence — workspace-scoped connections.
 * Unique per (user_id, workspace_id, platform).
 */

import sql from '@/app/api/utils/sql';
import type { ConnectedSocialAccount, SocialPlatform } from '@/lib/mock-content-planner';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
  readWorkspaceIdFromCookieHeader,
} from '@/lib/social/oauth-workspace';
import { userOwnsWorkspace, resolveWorkspaceForOAuthUser } from '@/lib/social/workspace-access';

export { ACTIVE_WORKSPACE_COOKIE, ACTIVE_WORKSPACE_COOKIE_ALIAS };

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  'instagram',
  'facebook',
  'tiktok',
  'youtube',
  'linkedin',
  'pinterest',
];

/** Content platforms + Google (Drive/Calendar/Meet integration). */
export type PersistablePlatform = SocialPlatform | 'google';

export type UpsertSocialAccountRow = {
  userId: string;
  platform: PersistablePlatform;
  platformUserId: string;
  platformUserName: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: string | null;
  expiresIn?: number | null;
  avatarUrl?: string | null;
  handle?: string | null;
  workspaceId?: string | null;
  pageId?: string | null;
  pageName?: string | null;
  followersCount?: number | null;
  meta?: Record<string, unknown> | null;
};

/** Ensure profiles(id) exists — social_accounts.user_id FKs to it. */
export async function ensureUserProfile(input: {
  userId: string;
  displayName?: string | null;
  handle?: string | null;
  avatarUrl?: string | null;
}): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  try {
    await sql`
      INSERT INTO profiles (id, display_name, handle, avatar_url)
      VALUES (
        ${input.userId},
        ${input.displayName ?? null},
        ${input.handle ?? null},
        ${input.avatarUrl ?? null}
      )
      ON CONFLICT (id) DO UPDATE SET
        display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
        handle = COALESCE(EXCLUDED.handle, profiles.handle),
        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
        updated_at = now()
    `;
  } catch (error) {
    console.warn('[social/persist] profiles upsert retry', error);
    await sql`
      INSERT INTO profiles (id, display_name)
      VALUES (${input.userId}, ${input.displayName ?? null})
      ON CONFLICT (id) DO NOTHING
    `;
  }
}

let schemaReady: Promise<void> | null = null;

export async function ensureSocialAccountsSchema(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  if (schemaReady) return schemaReady;

  schemaReady = (async () => {
    await sql`
      ALTER TABLE public.social_accounts
        ADD COLUMN IF NOT EXISTS platform_user_id text,
        ADD COLUMN IF NOT EXISTS avatar_url text,
        ADD COLUMN IF NOT EXISTS handle text,
        ADD COLUMN IF NOT EXISTS display_name text,
        ADD COLUMN IF NOT EXISTS workspace_id text,
        ADD COLUMN IF NOT EXISTS page_id text,
        ADD COLUMN IF NOT EXISTS page_name text,
        ADD COLUMN IF NOT EXISTS followers_count integer,
        ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS connected_at timestamptz DEFAULT now(),
        ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now()
    `;
    try {
      await sql`
        ALTER TABLE public.social_accounts
          DROP CONSTRAINT IF EXISTS social_accounts_user_id_platform_key
      `;
    } catch {
      /* ignore */
    }
    try {
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS social_accounts_user_workspace_platform_uidx
          ON public.social_accounts (user_id, workspace_id, platform)
          WHERE workspace_id IS NOT NULL AND workspace_id <> ''
      `;
    } catch (error) {
      console.warn('[social/persist] workspace unique index skipped', error);
    }
    // Allow Pinterest (and keep existing platforms) on the platform CHECK constraint.
    try {
      await sql`
        ALTER TABLE public.social_accounts
          DROP CONSTRAINT IF EXISTS social_accounts_platform_check
      `;
      await sql`
        ALTER TABLE public.social_accounts
          ADD CONSTRAINT social_accounts_platform_check
          CHECK (platform IN (
            'instagram', 'facebook', 'tiktok', 'linkedin', 'youtube', 'pinterest', 'google'
          ))
      `;
    } catch (error) {
      console.warn('[social/persist] platform check update skipped', error);
    }
  })().catch((error) => {
    schemaReady = null;
    console.warn('[social/persist] schema ensure skipped', error);
  });

  return schemaReady;
}

function expiresIso(input: UpsertSocialAccountRow): string | null {
  if (input.expiresAt) return input.expiresAt;
  if (typeof input.expiresIn === 'number') {
    return new Date(Date.now() + input.expiresIn * 1000).toISOString();
  }
  return null;
}

/** Upsert one platform row scoped to a workspace. */
export async function upsertSocialAccountRow(
  input: UpsertSocialAccountRow
): Promise<ConnectedSocialAccount> {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error('DATABASE_URL is not configured — cannot persist social accounts');
  }

  await ensureUserProfile({
    userId: input.userId,
    displayName: input.platformUserName,
    handle: input.handle,
    avatarUrl: input.avatarUrl,
  });
  await ensureSocialAccountsSchema();

  const expiresAt = expiresIso(input);
  const handle =
    input.handle ||
    (input.platformUserName.startsWith('@')
      ? input.platformUserName
      : null);
  const displayName = input.platformUserName;
  const metaJson = JSON.stringify(input.meta ?? {});
  const workspaceId = input.workspaceId?.trim() || null;
  const userId = input.userId?.trim();

  if (!userId) {
    throw new Error('user_id is required to bind social accounts');
  }
  if (!workspaceId) {
    throw new Error('workspace_id is required to bind social accounts');
  }

  // Bind only to a workspace this user owns (claim preferred or fall back / create).
  // Never throw workspace_forbidden — resolveWorkspaceForOAuthUser always falls back.
  const access = await resolveWorkspaceForOAuthUser({
    userId,
    preferredWorkspaceId: workspaceId,
  });
  if (!access.ok) {
    throw new Error(access.error || 'workspace_create_failed');
  }
  const boundWorkspaceId = access.workspaceId;

  // Workspace-scoped replace — always scoped to this user_id.
  await sql`
    DELETE FROM social_accounts
    WHERE user_id = ${userId}
      AND platform = ${input.platform}
      AND workspace_id = ${boundWorkspaceId}
  `;

  await sql`
    INSERT INTO social_accounts (
      user_id,
      platform,
      platform_user_id,
      platform_user_name,
      display_name,
      handle,
      avatar_url,
      access_token,
      refresh_token,
      expires_at,
      workspace_id,
      page_id,
      page_name,
      followers_count,
      meta,
      connected_at,
      updated_at,
      created_at
    )
    VALUES (
      ${userId},
      ${input.platform},
      ${input.platformUserId},
      ${input.platformUserName},
      ${displayName},
      ${handle},
      ${input.avatarUrl ?? null},
      ${input.accessToken},
      ${input.refreshToken ?? null},
      ${expiresAt},
      ${boundWorkspaceId},
      ${input.pageId ?? null},
      ${input.pageName ?? null},
      ${input.followersCount ?? null},
      ${metaJson},
      now(),
      now(),
      now()
    )
  `;

  return {
    platform: input.platform as SocialPlatform,
    connected: true,
    handle,
    display_name: displayName,
    avatar_url: input.avatarUrl ?? null,
    connected_at: new Date().toISOString(),
    page_name: input.pageName ?? null,
    follower_count: input.followersCount ?? null,
    subscriber_count:
      input.platform === 'youtube' ? input.followersCount ?? null : null,
    external_id: input.platformUserId,
    platform_user_id: input.platformUserId,
    workspace_id: boundWorkspaceId,
  };
}

function disconnectedStub(platform: SocialPlatform): ConnectedSocialAccount {
  return {
    platform,
    connected: false,
    handle: null,
    display_name: null,
    avatar_url: null,
    connected_at: null,
    follower_count: null,
    subscriber_count: null,
    page_name: null,
    company_url: null,
    external_id: null,
    id: null,
    platform_user_id: null,
    workspace_id: null,
  };
}

function mapRow(raw: Record<string, unknown>): ConnectedSocialAccount {
  const platform = raw.platform as SocialPlatform;
  const meta =
    raw.meta && typeof raw.meta === 'object'
      ? (raw.meta as Record<string, unknown>)
      : {};
  const name =
    (raw.display_name as string) ||
    (raw.platform_user_name as string) ||
    null;
  const handle =
    (raw.handle as string) ||
    (name?.startsWith('@') ? name : null);
  const followers =
    typeof raw.followers_count === 'number'
      ? raw.followers_count
      : typeof meta.followers_count === 'number'
        ? meta.followers_count
        : typeof meta.subscriber_count === 'number'
          ? meta.subscriber_count
          : null;
  const externalId =
    (raw.platform_user_id as string) ||
    (raw.external_id as string) ||
    '';

  return {
    platform,
    connected: true,
    handle,
    display_name: name,
    avatar_url: (raw.avatar_url as string) || null,
    connected_at: String(
      raw.connected_at || raw.created_at || new Date().toISOString()
    ),
    page_name: (raw.page_name as string) || null,
    follower_count: followers,
    subscriber_count:
      platform === 'youtube'
        ? typeof meta.subscriber_count === 'number'
          ? meta.subscriber_count
          : followers
        : null,
    company_url:
      typeof meta.company_url === 'string' ? meta.company_url : null,
    external_id: externalId || null,
    id: raw.id != null ? String(raw.id) : null,
    platform_user_id: externalId || null,
    workspace_id:
      raw.workspace_id != null ? String(raw.workspace_id) : null,
  };
}

/**
 * Live rows for the authenticated user only.
 * Always filters user_id = session user; optional workspace_id narrows further.
 * Never returns another user's connected accounts.
 */
export async function listLiveSocialAccountsForUser(input: {
  userId: string;
  workspaceId?: string | null;
}): Promise<ConnectedSocialAccount[]> {
  const userId = input.userId?.trim();
  if (!userId) {
    return SOCIAL_PLATFORMS.map(disconnectedStub);
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return SOCIAL_PLATFORMS.map(disconnectedStub);
  }

  await ensureSocialAccountsSchema();

  try {
    const workspaceId = input.workspaceId?.trim() || null;

    // When a workspace is specified, confirm it belongs to this user first.
    // Never return rows for a workspace owned by someone else.
    if (workspaceId) {
      const owned = await userOwnsWorkspace(userId, workspaceId);
      if (!owned) {
        return SOCIAL_PLATFORMS.map(disconnectedStub);
      }
    }

    const rows = workspaceId
      ? await sql`
          SELECT *
          FROM social_accounts
          WHERE user_id = ${userId}
            AND workspace_id = ${workspaceId}
          ORDER BY platform ASC, COALESCE(connected_at, created_at) DESC
        `
      : await sql`
          SELECT *
          FROM social_accounts
          WHERE user_id = ${userId}
          ORDER BY platform ASC, COALESCE(connected_at, created_at) DESC
        `;

    const byPlatform = new Map<SocialPlatform, ConnectedSocialAccount>();
    if (Array.isArray(rows)) {
      for (const raw of rows as Array<Record<string, unknown>>) {
        const platform = raw.platform as SocialPlatform;
        if (!platform || byPlatform.has(platform)) continue;
        byPlatform.set(platform, mapRow(raw));
      }
    }

    return SOCIAL_PLATFORMS.map(
      (platform) => byPlatform.get(platform) ?? disconnectedStub(platform)
    );
  } catch (error) {
    console.error('[social/persist] list failed', error);
    return SOCIAL_PLATFORMS.map(disconnectedStub);
  }
}

export async function deleteSocialAccountRow(input: {
  userId: string;
  platform?: PersistablePlatform | null;
  platformUserId?: string | null;
  workspaceId?: string | null;
  /** Prefer UUID row id when the UI has it. */
  accountId?: string | null;
}): Promise<{ deleted: boolean; deletedIds: string[] }> {
  if (!process.env.DATABASE_URL?.trim()) {
    return { deleted: false, deletedIds: [] };
  }

  await ensureSocialAccountsSchema();
  const userId = input.userId.trim();
  if (!userId) return { deleted: false, deletedIds: [] };

  const accountId = input.accountId?.trim() || null;
  const workspaceId = input.workspaceId?.trim() || null;
  const platformUserId = input.platformUserId?.trim() || null;
  const platform = input.platform ?? null;

  const collect = (rows: unknown): string[] =>
    Array.isArray(rows)
      ? rows
          .map((r) =>
            r && typeof r === 'object' && 'id' in r
              ? String((r as { id: unknown }).id)
              : ''
          )
          .filter(Boolean)
      : [];

  // 1) Exact row by id — still enforce user_id ownership.
  if (accountId) {
    const rows = await sql`
      DELETE FROM social_accounts
      WHERE id::text = ${accountId}
        AND user_id::text = ${userId}
      RETURNING id
    `;
    const ids = collect(rows);
    if (ids.length > 0) return { deleted: true, deletedIds: ids };
  }

  // 2) platform + platform_user_id (+ optional workspace)
  if (platform && platformUserId) {
    if (workspaceId) {
      const rows = await sql`
        DELETE FROM social_accounts
        WHERE user_id::text = ${userId}
          AND platform = ${platform}
          AND workspace_id = ${workspaceId}
          AND (
            platform_user_id = ${platformUserId}
            OR platform_user_id IS NULL
          )
        RETURNING id
      `;
      const ids = collect(rows);
      if (ids.length > 0) return { deleted: true, deletedIds: ids };
    }

    const rows = await sql`
      DELETE FROM social_accounts
      WHERE user_id::text = ${userId}
        AND platform = ${platform}
        AND platform_user_id = ${platformUserId}
      RETURNING id
    `;
    const ids = collect(rows);
    if (ids.length > 0) return { deleted: true, deletedIds: ids };
  }

  // 3) platform + workspace (all matching rows for this user)
  if (platform && workspaceId) {
    const rows = await sql`
      DELETE FROM social_accounts
      WHERE user_id::text = ${userId}
        AND platform = ${platform}
        AND workspace_id = ${workspaceId}
      RETURNING id
    `;
    const ids = collect(rows);
    if (ids.length > 0) return { deleted: true, deletedIds: ids };
  }

  // 4) Last resort: platform for this user (any workspace they own)
  if (platform) {
    const rows = await sql`
      DELETE FROM social_accounts
      WHERE user_id::text = ${userId}
        AND platform = ${platform}
      RETURNING id
    `;
    const ids = collect(rows);
    return { deleted: ids.length > 0, deletedIds: ids };
  }

  return { deleted: false, deletedIds: [] };
}

export function readWorkspaceIdFromRequest(request?: Request | null): string | null {
  if (!request) return null;
  const header =
    request.headers.get('x-workspace-id')?.trim() ||
    request.headers.get('x-active-workspace-id')?.trim();
  if (header) return header;
  return readWorkspaceIdFromCookieHeader(request.headers.get('cookie'));
}

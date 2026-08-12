/**
 * Shared social_accounts persistence — matches the live Supabase schema:
 *   user_id, platform, platform_user_id, platform_user_name,
 *   access_token, refresh_token, expires_at, avatar_url, workspace_id, …
 * UNIQUE (user_id, platform)
 */

import sql from '@/app/api/utils/sql';
import type { ConnectedSocialAccount, SocialPlatform } from '@/lib/mock-content-planner';

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  'instagram',
  'facebook',
  'tiktok',
  'youtube',
  'linkedin',
];

export const ACTIVE_WORKSPACE_COOKIE = 'nc_active_workspace_id';

export type UpsertSocialAccountRow = {
  userId: string;
  platform: SocialPlatform;
  /** Unique platform channel / account id */
  platformUserId: string;
  /** Display name or @handle */
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

/**
 * Additive migration — safe to call on every upsert/list until columns exist.
 * Aligns the live Supabase table with the app's expected fields.
 */
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

/** Upsert one platform row — UNIQUE (user_id, platform). */
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
      ${input.userId},
      ${input.platform},
      ${input.platformUserId},
      ${input.platformUserName},
      ${displayName},
      ${handle},
      ${input.avatarUrl ?? null},
      ${input.accessToken},
      ${input.refreshToken ?? null},
      ${expiresAt},
      ${workspaceId},
      ${input.pageId ?? null},
      ${input.pageName ?? null},
      ${input.followersCount ?? null},
      ${metaJson},
      now(),
      now(),
      now()
    )
    ON CONFLICT (user_id, platform) DO UPDATE SET
      platform_user_id = EXCLUDED.platform_user_id,
      platform_user_name = EXCLUDED.platform_user_name,
      display_name = EXCLUDED.display_name,
      handle = EXCLUDED.handle,
      avatar_url = EXCLUDED.avatar_url,
      access_token = EXCLUDED.access_token,
      refresh_token = COALESCE(EXCLUDED.refresh_token, social_accounts.refresh_token),
      expires_at = EXCLUDED.expires_at,
      workspace_id = COALESCE(EXCLUDED.workspace_id, social_accounts.workspace_id),
      page_id = EXCLUDED.page_id,
      page_name = EXCLUDED.page_name,
      followers_count = EXCLUDED.followers_count,
      meta = EXCLUDED.meta,
      connected_at = now(),
      updated_at = now()
  `;

  return {
    platform: input.platform,
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
    external_id: externalId,
  };
}

/** Live rows for the authenticated user — never mock seeds. */
export async function listLiveSocialAccountsForUser(input: {
  userId: string;
  workspaceId?: string | null;
}): Promise<ConnectedSocialAccount[]> {
  if (!process.env.DATABASE_URL?.trim()) {
    return SOCIAL_PLATFORMS.map(disconnectedStub);
  }

  await ensureSocialAccountsSchema();

  try {
    const workspaceId = input.workspaceId?.trim() || null;
    const rows = workspaceId
      ? await sql`
          SELECT *
          FROM social_accounts
          WHERE user_id = ${input.userId}
            AND (workspace_id = ${workspaceId} OR workspace_id IS NULL)
          ORDER BY platform ASC, COALESCE(connected_at, created_at) DESC
        `
      : await sql`
          SELECT *
          FROM social_accounts
          WHERE user_id = ${input.userId}
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
    // Minimal fallback for pre-migration schemas.
    try {
      const rows = await sql`
        SELECT *
        FROM social_accounts
        WHERE user_id = ${input.userId}
        ORDER BY created_at DESC
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
    } catch (fallbackError) {
      console.error('[social/persist] list fallback failed', fallbackError);
      return SOCIAL_PLATFORMS.map(disconnectedStub);
    }
  }
}

export async function deleteSocialAccountRow(input: {
  userId: string;
  platform: SocialPlatform;
  platformUserId?: string | null;
}): Promise<{ deleted: boolean }> {
  if (!process.env.DATABASE_URL?.trim()) return { deleted: false };

  await ensureSocialAccountsSchema();

  if (input.platformUserId?.trim()) {
    const rows = await sql`
      DELETE FROM social_accounts
      WHERE user_id = ${input.userId}
        AND platform = ${input.platform}
        AND (
          platform_user_id = ${input.platformUserId}
          OR platform_user_id IS NULL
        )
      RETURNING id
    `;
    if (Array.isArray(rows) && rows.length > 0) return { deleted: true };
  }

  const rows = await sql`
    DELETE FROM social_accounts
    WHERE user_id = ${input.userId}
      AND platform = ${input.platform}
    RETURNING id
  `;
  return { deleted: Array.isArray(rows) && rows.length > 0 };
}

export function readWorkspaceIdFromRequest(request?: Request | null): string | null {
  if (!request) return null;
  const header = request.headers.get('x-workspace-id')?.trim();
  if (header) return header;
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(
    new RegExp(`(?:^|;\\s*)${ACTIVE_WORKSPACE_COOKIE}=([^;]+)`)
  );
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

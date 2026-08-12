/**
 * Shared social_accounts persistence helpers.
 * Ensures profile FK exists so OAuth upserts don't fall into ephemeral memory.
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

/** Cookie / header name for the active admin workspace. */
export const ACTIVE_WORKSPACE_COOKIE = 'nc_active_workspace_id';

/**
 * Guarantee a profiles row exists for the Better Auth user id.
 * social_accounts.user_id FKs to profiles(id) — missing profile caused silent
 * fallback to in-memory demo maps that vanish on the next request.
 */
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
        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url)
    `;
  } catch (error) {
    // Older schemas may lack avatar_url — still ensure the id row exists.
    console.warn('[social/persist] profiles upsert (full) failed, retrying minimal', error);
    try {
      await sql`
        INSERT INTO profiles (id, display_name)
        VALUES (${input.userId}, ${input.displayName ?? null})
        ON CONFLICT (id) DO NOTHING
      `;
    } catch (fallbackError) {
      console.error('[social/persist] ensureUserProfile failed', fallbackError);
    }
  }
}

type DbSocialRow = {
  platform: SocialPlatform;
  external_id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  followers_count: number | null;
  page_name: string | null;
  connected_at: string;
  workspace_id: string | null;
  meta: Record<string, unknown> | null;
};

function rowToConnected(row: DbSocialRow): ConnectedSocialAccount {
  const meta = row.meta && typeof row.meta === 'object' ? row.meta : {};
  const subscriber =
    typeof meta.subscriber_count === 'number' ? meta.subscriber_count : null;
  const followers =
    typeof row.followers_count === 'number'
      ? row.followers_count
      : typeof meta.followers_count === 'number'
        ? meta.followers_count
        : null;

  return {
    platform: row.platform,
    connected: true,
    handle: row.handle,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    connected_at: row.connected_at,
    page_name: row.page_name,
    follower_count: followers,
    subscriber_count:
      row.platform === 'youtube' ? subscriber ?? followers : subscriber,
    company_url:
      typeof meta.company_url === 'string' ? meta.company_url : null,
    external_id: row.external_id,
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

/**
 * Load live social_accounts for a user (optionally scoped to a workspace).
 * Returns one card per platform — never falls back to mock/demo seeds.
 */
export async function listLiveSocialAccountsForUser(input: {
  userId: string;
  workspaceId?: string | null;
}): Promise<ConnectedSocialAccount[]> {
  if (!process.env.DATABASE_URL?.trim()) {
    return SOCIAL_PLATFORMS.map(disconnectedStub);
  }

  try {
    const workspaceId = input.workspaceId?.trim() || null;
    const rows = workspaceId
      ? await sql`
          SELECT platform, external_id, handle, display_name, avatar_url,
                 followers_count, page_name, connected_at, meta, workspace_id
          FROM social_accounts
          WHERE user_id = ${input.userId}
            AND (workspace_id = ${workspaceId} OR workspace_id IS NULL)
          ORDER BY platform ASC, connected_at DESC
        `
      : await sql`
          SELECT platform, external_id, handle, display_name, avatar_url,
                 followers_count, page_name, connected_at, meta, workspace_id
          FROM social_accounts
          WHERE user_id = ${input.userId}
          ORDER BY platform ASC, connected_at DESC
        `;

    const byPlatform = new Map<SocialPlatform, ConnectedSocialAccount>();
    if (Array.isArray(rows)) {
      for (const raw of rows as Array<Record<string, unknown>>) {
        const platform = raw.platform as SocialPlatform;
        if (byPlatform.has(platform)) continue;
        byPlatform.set(
          platform,
          rowToConnected({
            platform,
            external_id: String(raw.external_id ?? ''),
            handle: (raw.handle as string) || null,
            display_name: (raw.display_name as string) || null,
            avatar_url: (raw.avatar_url as string) || null,
            followers_count:
              typeof raw.followers_count === 'number' ? raw.followers_count : null,
            page_name: (raw.page_name as string) || null,
            connected_at: String(raw.connected_at ?? new Date().toISOString()),
            workspace_id: (raw.workspace_id as string) || null,
            meta:
              raw.meta && typeof raw.meta === 'object'
                ? (raw.meta as Record<string, unknown>)
                : null,
          })
        );
      }
    }

    return SOCIAL_PLATFORMS.map(
      (platform) => byPlatform.get(platform) ?? disconnectedStub(platform)
    );
  } catch (error) {
    // Schema without workspace_id / followers_count — retry minimal select.
    console.warn('[social/persist] list with workspace failed, retrying', error);
    try {
      const rows = await sql`
        SELECT platform, external_id, handle, display_name, avatar_url,
               page_name, connected_at, meta
        FROM social_accounts
        WHERE user_id = ${input.userId}
        ORDER BY platform ASC, connected_at DESC
      `;
      const byPlatform = new Map<SocialPlatform, ConnectedSocialAccount>();
      if (Array.isArray(rows)) {
        for (const raw of rows as Array<Record<string, unknown>>) {
          const platform = raw.platform as SocialPlatform;
          if (byPlatform.has(platform)) continue;
          byPlatform.set(
            platform,
            rowToConnected({
              platform,
              external_id: String(raw.external_id ?? ''),
              handle: (raw.handle as string) || null,
              display_name: (raw.display_name as string) || null,
              avatar_url: (raw.avatar_url as string) || null,
              followers_count: null,
              page_name: (raw.page_name as string) || null,
              connected_at: String(raw.connected_at ?? new Date().toISOString()),
              workspace_id: null,
              meta:
                raw.meta && typeof raw.meta === 'object'
                  ? (raw.meta as Record<string, unknown>)
                  : null,
            })
          );
        }
      }
      return SOCIAL_PLATFORMS.map(
        (platform) => byPlatform.get(platform) ?? disconnectedStub(platform)
      );
    } catch (fallbackError) {
      console.error('[social/persist] listLiveSocialAccounts failed', fallbackError);
      return SOCIAL_PLATFORMS.map(disconnectedStub);
    }
  }
}

/** Read workspace id from request cookies/headers when available. */
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

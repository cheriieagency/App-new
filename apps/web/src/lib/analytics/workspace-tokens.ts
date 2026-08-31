/**
 * Shared workspace-scoped social_accounts loader for analytics.
 * Uses ::text casts so UUID / text column mismatches never drop tokens silently.
 */

import sql from '@/app/api/utils/sql';

export type WorkspaceSocialToken = {
  platform: string;
  platform_user_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  page_id: string | null;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  page_name: string | null;
  followers_count: number | null;
  /** Raw meta jsonb — may include user_access_token for Marketing API. */
  meta?: Record<string, unknown> | null;
};

const MEDIA_PLATFORMS = ['instagram', 'facebook', 'tiktok'] as const;

/**
 * Load live tokens for the active workspace (optionally scoped to media platforms).
 * Deduplicates by platform — newest connected row wins via ORDER BY.
 */
export async function loadWorkspaceSocialTokens(input: {
  userId: string;
  workspaceId: string;
  /** When set, only return these platforms (default: IG + FB + TikTok). */
  platforms?: readonly string[];
}): Promise<WorkspaceSocialToken[]> {
  const userId = input.userId?.trim();
  const workspaceId = input.workspaceId?.trim();
  if (!userId || !workspaceId || !process.env.DATABASE_URL?.trim()) return [];

  const platforms = input.platforms?.length
    ? [...input.platforms]
    : [...MEDIA_PLATFORMS];

  try {
    // Prefer ::text casts (same pattern as lib/social/persist) so Neon/Supabase
    // uuid vs text columns still match session ids from better-auth.
    let rows: unknown;
    try {
      rows = await sql`
        SELECT platform, platform_user_id, access_token, refresh_token, expires_at,
               page_id, handle, display_name, avatar_url, page_name, followers_count, meta
        FROM social_accounts
        WHERE user_id::text = ${userId}
          AND workspace_id::text = ${workspaceId}
          AND platform = ANY(${platforms})
          AND access_token IS NOT NULL
          AND TRIM(access_token) <> ''
        ORDER BY COALESCE(connected_at, created_at) DESC NULLS LAST
      `;
    } catch {
      rows = await sql`
        SELECT platform, platform_user_id, access_token, refresh_token, expires_at,
               page_id, handle, display_name, avatar_url, page_name, followers_count, meta
        FROM social_accounts
        WHERE user_id = ${userId}
          AND workspace_id = ${workspaceId}
          AND platform = ANY(${platforms})
          AND access_token IS NOT NULL
          AND TRIM(access_token) <> ''
        ORDER BY COALESCE(connected_at, created_at) DESC NULLS LAST
      `;
    }

    const byPlatform = new Map<string, WorkspaceSocialToken>();
    for (const row of (rows as Array<Record<string, unknown>>) ?? []) {
      const platform = String(row?.platform || '');
      if (!platform || byPlatform.has(platform)) continue;
      const meta =
        row.meta && typeof row.meta === 'object' && !Array.isArray(row.meta)
          ? (row.meta as Record<string, unknown>)
          : null;
      byPlatform.set(platform, {
        platform,
        platform_user_id:
          row.platform_user_id != null ? String(row.platform_user_id) : null,
        access_token:
          row.access_token != null ? String(row.access_token) : null,
        refresh_token:
          row.refresh_token != null ? String(row.refresh_token) : null,
        expires_at: row.expires_at ? String(row.expires_at) : null,
        page_id: row.page_id != null ? String(row.page_id) : null,
        handle: row.handle != null ? String(row.handle) : null,
        display_name:
          row.display_name != null ? String(row.display_name) : null,
        avatar_url: row.avatar_url != null ? String(row.avatar_url) : null,
        page_name: row.page_name != null ? String(row.page_name) : null,
        followers_count:
          typeof row.followers_count === 'number' ? row.followers_count : null,
        meta,
      });
    }
    return [...byPlatform.values()];
  } catch (error) {
    console.warn('[analytics/workspace-tokens] load failed', error);
    return [];
  }
}

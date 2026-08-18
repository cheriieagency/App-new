/**
 * Resolve a fresh Google access token for a workspace's Drive/Calendar integration.
 */

import sql from '@/app/api/utils/sql';
import { ensureSocialAccountsSchema } from '@/lib/social/persist';
import { refreshGoogleAccessToken } from '@/lib/google/oauth';

export type GoogleIntegrationTokens = {
  accessToken: string;
  refreshToken: string | null;
  email: string | null;
  platformUserId: string;
  workspaceId: string;
  userId: string;
};

/** Load Google (platform=google) row for workspace, refreshing the access token if needed. */
export async function getGoogleAccessTokenForWorkspace(input: {
  userId: string;
  workspaceId: string;
}): Promise<GoogleIntegrationTokens | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  await ensureSocialAccountsSchema();

  const rows = await sql`
    SELECT
      access_token,
      refresh_token,
      expires_at,
      platform_user_id,
      platform_user_name,
      handle,
      meta,
      user_id,
      workspace_id
    FROM public.social_accounts
    WHERE user_id = ${input.userId}
      AND platform = 'google'
      AND (
        workspace_id = ${input.workspaceId}
        OR workspace_id IS NULL
      )
    ORDER BY CASE WHEN workspace_id = ${input.workspaceId} THEN 0 ELSE 1 END
    LIMIT 1
  `;

  const row = rows?.[0] as Record<string, unknown> | undefined;
  if (!row?.access_token && !row?.refresh_token) return null;

  let accessToken = row.access_token ? String(row.access_token) : '';
  const refreshToken = row.refresh_token ? String(row.refresh_token) : null;
  const expiresAt = row.expires_at ? new Date(String(row.expires_at)).getTime() : 0;
  const needsRefresh =
    !accessToken || !expiresAt || expiresAt < Date.now() + 60_000;

  if (needsRefresh && refreshToken) {
    try {
      const refreshed = await refreshGoogleAccessToken(refreshToken);
      accessToken = refreshed.access_token;
      const newExpiry =
        typeof refreshed.expires_in === 'number'
          ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
          : null;
      await sql`
        UPDATE public.social_accounts
        SET
          access_token = ${accessToken},
          expires_at = ${newExpiry},
          updated_at = now()
        WHERE user_id = ${input.userId}
          AND platform = 'google'
          AND (
            workspace_id = ${input.workspaceId}
            OR workspace_id IS NULL
          )
      `;
    } catch (error) {
      console.warn('[google/tokens] refresh failed', error);
      if (!accessToken) return null;
    }
  }

  if (!accessToken) return null;

  const meta =
    row.meta && typeof row.meta === 'object'
      ? (row.meta as Record<string, unknown>)
      : {};
  const email =
    (typeof meta.email === 'string' && meta.email) ||
    (row.handle && String(row.handle).includes('@')
      ? String(row.handle)
      : null) ||
    (row.platform_user_name && String(row.platform_user_name).includes('@')
      ? String(row.platform_user_name)
      : null);

  return {
    accessToken,
    refreshToken,
    email,
    platformUserId: String(row.platform_user_id || ''),
    workspaceId: String(row.workspace_id || input.workspaceId),
    userId: String(row.user_id || input.userId),
  };
}

/** Seller-side lookup by workspace owner (for public checkout Meet booking). */
export async function getGoogleAccessTokenForSellerWorkspace(input: {
  sellerUserId: string;
  workspaceId: string;
}): Promise<GoogleIntegrationTokens | null> {
  return getGoogleAccessTokenForWorkspace({
    userId: input.sellerUserId,
    workspaceId: input.workspaceId,
  });
}

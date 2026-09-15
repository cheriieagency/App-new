/**
 * Fresh Pinterest access token for a workspace social_accounts row.
 * Refreshes via refresh_token when access_token is missing/expired.
 */

import sql from '@/app/api/utils/sql';
import { ensureSocialAccountsSchema } from '@/lib/social/persist';
import { refreshPinterestAccessToken } from '@/lib/pinterest/oauth';

export async function getPinterestAccessTokenForWorkspace(input: {
  userId: string;
  workspaceId: string;
}): Promise<string | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  await ensureSocialAccountsSchema();

  const rows = await sql`
    SELECT access_token, refresh_token, expires_at
    FROM public.social_accounts
    WHERE user_id = ${input.userId}
      AND platform = 'pinterest'
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
      const refreshed = await refreshPinterestAccessToken(refreshToken);
      accessToken = refreshed.access_token;
      const newExpiry =
        typeof refreshed.expires_in === 'number'
          ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
          : null;
      const newRefresh = refreshed.refresh_token?.trim() || refreshToken;
      await sql`
        UPDATE public.social_accounts
        SET
          access_token = ${accessToken},
          refresh_token = ${newRefresh},
          expires_at = ${newExpiry},
          updated_at = now()
        WHERE user_id = ${input.userId}
          AND platform = 'pinterest'
          AND (
            workspace_id = ${input.workspaceId}
            OR workspace_id IS NULL
          )
      `;
    } catch (error) {
      console.warn('[pinterest/tokens] refresh failed', error);
      if (!accessToken) return null;
    }
  }

  return accessToken || null;
}

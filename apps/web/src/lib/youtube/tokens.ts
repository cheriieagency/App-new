/**
 * Fresh YouTube (Google) access token for a workspace social_accounts row.
 */

import sql from '@/app/api/utils/sql';
import { ensureSocialAccountsSchema } from '@/lib/social/persist';
import { refreshGoogleAccessToken } from '@/lib/google/oauth';

export async function getYouTubeAccessTokenForWorkspace(input: {
  userId: string;
  workspaceId: string;
}): Promise<string | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  await ensureSocialAccountsSchema();

  const rows = await sql`
    SELECT access_token, refresh_token, expires_at
    FROM public.social_accounts
    WHERE user_id = ${input.userId}
      AND workspace_id = ${input.workspaceId}
      AND platform = 'youtube'
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
          AND workspace_id = ${input.workspaceId}
          AND platform = 'youtube'
      `;
    } catch (error) {
      console.warn('[youtube/tokens] refresh failed', error);
      if (!accessToken) return null;
    }
  }

  return accessToken || null;
}

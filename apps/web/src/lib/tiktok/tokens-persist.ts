/**
 * Persist TikTok Business / Login Kit tokens in `tiktok_tokens`.
 */

import sql from '@/app/api/utils/sql';

let schemaReady: Promise<void> | null = null;

export type TikTokTokenRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  open_id: string | null;
  access_token: string;
  refresh_token: string | null;
  advertiser_ids: string[];
  scope: string | null;
  token_source: 'business' | 'login_kit' | 'mock';
  expires_at: string | null;
  updated_at: string;
};

export async function ensureTikTokTokensSchema(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  if (schemaReady) return schemaReady;

  schemaReady = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS public.tiktok_tokens (
        id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id    text NOT NULL,
        user_id         text NOT NULL,
        open_id         text,
        access_token    text NOT NULL,
        refresh_token   text,
        advertiser_ids  jsonb NOT NULL DEFAULT '[]'::jsonb,
        scope           text,
        token_source    text NOT NULL DEFAULT 'business',
        expires_at      timestamptz,
        created_at      timestamptz NOT NULL DEFAULT now(),
        updated_at      timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS tiktok_tokens_ws_user_uidx
        ON public.tiktok_tokens (workspace_id, user_id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS tiktok_tokens_open_id_idx
        ON public.tiktok_tokens (open_id)
        WHERE open_id IS NOT NULL
    `;
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });

  return schemaReady;
}

export async function upsertTikTokToken(input: {
  workspaceId: string;
  userId: string;
  openId?: string | null;
  accessToken: string;
  refreshToken?: string | null;
  advertiserIds?: string[];
  scope?: string | string[] | null;
  tokenSource: 'business' | 'login_kit' | 'mock';
  expiresIn?: number | null;
}): Promise<TikTokTokenRow | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  await ensureTikTokTokensSchema();

  const scope =
    Array.isArray(input.scope)
      ? input.scope.join(',')
      : input.scope?.toString() || null;
  const advertiserIds = input.advertiserIds ?? [];
  const expiresAt =
    typeof input.expiresIn === 'number' && input.expiresIn > 0
      ? new Date(Date.now() + input.expiresIn * 1000).toISOString()
      : null;

  const rows = await sql`
    INSERT INTO public.tiktok_tokens
      (workspace_id, user_id, open_id, access_token, refresh_token,
       advertiser_ids, scope, token_source, expires_at, updated_at)
    VALUES (
      ${input.workspaceId},
      ${input.userId},
      ${input.openId ?? null},
      ${input.accessToken},
      ${input.refreshToken ?? null},
      ${JSON.stringify(advertiserIds)}::jsonb,
      ${scope},
      ${input.tokenSource},
      ${expiresAt},
      now()
    )
    ON CONFLICT (workspace_id, user_id) DO UPDATE SET
      open_id = COALESCE(EXCLUDED.open_id, public.tiktok_tokens.open_id),
      access_token = EXCLUDED.access_token,
      refresh_token = COALESCE(EXCLUDED.refresh_token, public.tiktok_tokens.refresh_token),
      advertiser_ids = EXCLUDED.advertiser_ids,
      scope = COALESCE(EXCLUDED.scope, public.tiktok_tokens.scope),
      token_source = EXCLUDED.token_source,
      expires_at = EXCLUDED.expires_at,
      updated_at = now()
    RETURNING id, workspace_id, user_id, open_id, access_token, refresh_token,
              advertiser_ids, scope, token_source, expires_at, updated_at
  `;

  const row = rows?.[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  return mapTokenRow(row);
}

/** Write refreshed Login Kit tokens to both `tiktok_tokens` and `social_accounts`. */
export async function persistRefreshedTikTokTokens(input: {
  userId: string;
  workspaceId: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresIn?: number | null;
}): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  await ensureTikTokTokensSchema();

  const expiresAt =
    typeof input.expiresIn === 'number' && input.expiresIn > 0
      ? new Date(Date.now() + input.expiresIn * 1000).toISOString()
      : null;

  try {
    await sql`
      UPDATE public.tiktok_tokens
      SET access_token = ${input.accessToken},
          refresh_token = COALESCE(${input.refreshToken ?? null}, refresh_token),
          expires_at = ${expiresAt},
          updated_at = now()
      WHERE workspace_id = ${input.workspaceId}
        AND user_id = ${input.userId}
    `;
  } catch (error) {
    console.warn('[tiktok] tiktok_tokens refresh persist failed', error);
  }

  try {
    await sql`
      UPDATE public.social_accounts
      SET access_token = ${input.accessToken},
          refresh_token = COALESCE(${input.refreshToken ?? null}, refresh_token),
          expires_at = ${expiresAt},
          updated_at = now()
      WHERE user_id::text = ${input.userId}
        AND workspace_id::text = ${input.workspaceId}
        AND platform = 'tiktok'
    `;
  } catch (error) {
    console.warn('[tiktok] social_accounts refresh persist failed', error);
  }
}

export async function deleteTikTokTokenForWorkspace(input: {
  workspaceId: string;
  userId: string;
}): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  await ensureTikTokTokensSchema();
  await sql`
    DELETE FROM public.tiktok_tokens
    WHERE workspace_id = ${input.workspaceId}
      AND user_id = ${input.userId}
  `;
}

export async function getTikTokTokenForWorkspace(input: {
  workspaceId: string;
  userId?: string | null;
}): Promise<TikTokTokenRow | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  await ensureTikTokTokensSchema();

  const rows = input.userId
    ? await sql`
        SELECT id, workspace_id, user_id, open_id, access_token, refresh_token,
               advertiser_ids, scope, token_source, expires_at, updated_at
        FROM public.tiktok_tokens
        WHERE workspace_id = ${input.workspaceId}
          AND user_id = ${input.userId}
        LIMIT 1
      `
    : await sql`
        SELECT id, workspace_id, user_id, open_id, access_token, refresh_token,
               advertiser_ids, scope, token_source, expires_at, updated_at
        FROM public.tiktok_tokens
        WHERE workspace_id = ${input.workspaceId}
        ORDER BY updated_at DESC
        LIMIT 1
      `;

  const row = rows?.[0] as Record<string, unknown> | undefined;
  return row ? mapTokenRow(row) : null;
}

function mapTokenRow(row: Record<string, unknown>): TikTokTokenRow {
  let advertiserIds: string[] = [];
  const raw = row.advertiser_ids;
  if (Array.isArray(raw)) advertiserIds = raw.map(String);
  else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) advertiserIds = parsed.map(String);
    } catch {
      advertiserIds = [];
    }
  }

  const source = String(row.token_source || 'business');
  return {
    id: String(row.id),
    workspace_id: String(row.workspace_id),
    user_id: String(row.user_id),
    open_id: row.open_id ? String(row.open_id) : null,
    access_token: String(row.access_token || ''),
    refresh_token: row.refresh_token ? String(row.refresh_token) : null,
    advertiser_ids: advertiserIds,
    scope: row.scope ? String(row.scope) : null,
    token_source:
      source === 'login_kit' || source === 'mock' ? source : 'business',
    expires_at: row.expires_at ? String(row.expires_at) : null,
    updated_at: String(row.updated_at || new Date().toISOString()),
  };
}

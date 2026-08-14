/**
 * TikTok OAuth 2.0 helpers (Display API + Content Posting scopes).
 * Docs: https://developers.tiktok.com/doc/oauth-user-access-token-management
 * PKCE (S256) required for authorize → token exchange.
 */

import { createHash, randomBytes } from 'crypto';
import { appBaseUrl, tiktokEnv } from '@/lib/config/env';

export const TIKTOK_OAUTH_STATE_COOKIE = 'clikd_tiktok_oauth_state';
/** HTTP-only cookie holding the PKCE code_verifier until callback. */
export const TIKTOK_CODE_VERIFIER_COOKIE = 'tiktok_code_verifier';

/** Display + Content Posting scopes requested at authorize time. */
export const TIKTOK_OAUTH_SCOPES = [
  'user.info.basic',
  'user.info.stats',
  'video.list',
  'video.upload',
] as const;

export function getTikTokCallbackUrl(requestOrigin?: string | null): string {
  return `${appBaseUrl(requestOrigin)}/api/auth/callback/tiktok`;
}

/**
 * PKCE pair for TikTok OAuth v2.
 * code_verifier: 64 hex chars · code_challenge: BASE64URL(SHA256(verifier)) for S256.
 */
export function createTikTokPkce(): {
  codeVerifier: string;
  codeChallenge: string;
} {
  const codeVerifier = randomBytes(32).toString('hex');
  const codeChallenge = createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return { codeVerifier, codeChallenge };
}

export function buildTikTokLoginUrl(
  state: string,
  requestOrigin?: string | null,
  options?: { forceSelectAccount?: boolean; codeChallenge?: string }
): string {
  const clientKey = tiktokEnv.clientKey();
  if (!clientKey) throw new Error('TIKTOK_CLIENT_KEY is not configured');

  const codeChallenge = options?.codeChallenge?.trim();
  if (!codeChallenge) {
    throw new Error('TikTok PKCE code_challenge is required');
  }

  // Official Login Kit params only — unsupported keys (prompt, disable_auto_login)
  // can break authorize in the browser.
  // https://developers.tiktok.com/doc/login-kit-web
  const authUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
  authUrl.searchParams.set('client_key', clientKey);
  authUrl.searchParams.set('scope', TIKTOK_OAUTH_SCOPES.join(','));
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', getTikTokCallbackUrl(requestOrigin));
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  // Force consent / account UI (0 = skip for existing session, 1 = always show).
  if (options?.forceSelectAccount !== false) {
    authUrl.searchParams.set('disable_auto_auth', '1');
  }
  return authUrl.toString();
}

export type TikTokTokenResponse = {
  access_token: string;
  expires_in?: number;
  open_id?: string;
  refresh_expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

/** Exchange authorization code for access + refresh tokens (requires PKCE verifier). */
export async function exchangeTikTokCode(
  code: string,
  requestOrigin?: string | null,
  codeVerifier?: string | null
): Promise<TikTokTokenResponse> {
  const clientKey = tiktokEnv.clientKey();
  const clientSecret = tiktokEnv.clientSecret();
  if (!clientKey || !clientSecret) {
    throw new Error('TikTok OAuth credentials missing');
  }

  const verifier = codeVerifier?.trim();
  if (!verifier) {
    throw new Error('TikTok PKCE code_verifier is missing');
  }

  const params = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: getTikTokCallbackUrl(requestOrigin),
    code_verifier: verifier,
  });

  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = (await res.json()) as TikTokTokenResponse & {
    error?: string;
    error_description?: string;
    message?: string;
  };

  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error_description ||
        data.message ||
        data.error ||
        'TikTok token exchange failed'
    );
  }
  return data;
}

/**
 * Refresh an expired TikTok access token (Display API).
 * Docs: https://developers.tiktok.com/doc/oauth-user-access-token-management
 */
export async function refreshTikTokAccessToken(
  refreshToken: string
): Promise<TikTokTokenResponse> {
  const clientKey = tiktokEnv.clientKey();
  const clientSecret = tiktokEnv.clientSecret();
  if (!clientKey || !clientSecret) {
    throw new Error('TikTok OAuth credentials missing');
  }

  const params = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken.trim(),
  });

  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = (await res.json()) as TikTokTokenResponse & {
    error?: string;
    error_description?: string;
    message?: string;
  };

  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error_description ||
        data.message ||
        data.error ||
        'TikTok token refresh failed'
    );
  }
  return data;
}

/**
 * Return a usable TikTok access token — refresh + persist when near expiry.
 * Falls back to the stored access token if refresh is unavailable.
 */
export async function ensureFreshTikTokAccessToken(input: {
  userId: string;
  workspaceId: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: string | null;
}): Promise<string> {
  const accessToken = input.accessToken?.trim();
  if (!accessToken) throw new Error('TikTok access token missing');

  const refreshToken = input.refreshToken?.trim() || null;
  const expiresMs = input.expiresAt ? new Date(input.expiresAt).getTime() : NaN;
  // Refresh 2 minutes before expiry when we have a refresh_token.
  const needsRefresh =
    Boolean(refreshToken) &&
    Number.isFinite(expiresMs) &&
    expiresMs <= Date.now() + 120_000;

  if (!needsRefresh || !refreshToken) return accessToken;

  try {
    const tokens = await refreshTikTokAccessToken(refreshToken);
    const expiresAt =
      typeof tokens.expires_in === 'number' && tokens.expires_in > 0
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null;

    // Persist refreshed tokens for the workspace TikTok row.
    try {
      const sql = (await import('@/app/api/utils/sql')).default;
      await sql`
        UPDATE social_accounts
        SET access_token = ${tokens.access_token},
            refresh_token = ${tokens.refresh_token ?? refreshToken},
            expires_at = ${expiresAt},
            updated_at = now()
        WHERE user_id::text = ${input.userId}
          AND workspace_id::text = ${input.workspaceId}
          AND platform = 'tiktok'
      `;
    } catch (persistError) {
      console.warn('[tiktok] refreshed token persist failed', persistError);
    }

    return tokens.access_token;
  } catch (error) {
    console.warn('[tiktok] token refresh failed — using stored access token', error);
    return accessToken;
  }
}

export type TikTokUserProfile = {
  open_id: string;
  union_id?: string | null;
  display_name: string;
  avatar_url: string | null;
  follower_count: number;
  likes_count: number;
};

const USER_INFO_FIELDS = [
  'open_id',
  'union_id',
  'avatar_url',
  'display_name',
  'follower_count',
  'likes_count',
].join(',');

/** Fetch TikTok profile + follower stats for the connected open_id. */
export async function fetchTikTokUserInfo(
  accessToken: string
): Promise<TikTokUserProfile> {
  const url = new URL('https://open.tiktokapis.com/v2/user/info/');
  url.searchParams.set('fields', USER_INFO_FIELDS);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const payload = (await res.json()) as {
    data?: {
      user?: {
        open_id?: string;
        union_id?: string;
        avatar_url?: string;
        display_name?: string;
        follower_count?: number;
        likes_count?: number;
      };
    };
    error?: { code?: string; message?: string };
  };

  const user = payload.data?.user;
  if (!res.ok || !user?.open_id) {
    throw new Error(
      payload.error?.message || 'Failed to fetch TikTok user info'
    );
  }

  return {
    open_id: user.open_id,
    union_id: user.union_id ?? null,
    display_name: user.display_name || 'TikTok Creator',
    avatar_url: user.avatar_url || null,
    follower_count: Number(user.follower_count) || 0,
    likes_count: Number(user.likes_count) || 0,
  };
}

export type TikTokVideoItem = {
  id: string;
  title?: string;
  video_description?: string;
  cover_image_url?: string;
  share_url?: string;
  create_time?: number;
  duration?: number;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  view_count?: number;
};

const VIDEO_LIST_FIELDS = [
  'id',
  'title',
  'video_description',
  'cover_image_url',
  'share_url',
  'create_time',
  'duration',
  'like_count',
  'comment_count',
  'share_count',
  'view_count',
].join(',');

/**
 * List recent TikTok videos for the connected creator (Display API video.list).
 * Docs: POST /v2/video/list/
 */
export async function fetchTikTokVideos(
  accessToken: string,
  maxCount = 20
): Promise<TikTokVideoItem[]> {
  const url = new URL('https://open.tiktokapis.com/v2/video/list/');
  url.searchParams.set('fields', VIDEO_LIST_FIELDS);

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ max_count: Math.min(Math.max(maxCount, 1), 20) }),
  });

  const payload = (await res.json()) as {
    data?: { videos?: TikTokVideoItem[]; cursor?: number; has_more?: boolean };
    error?: { code?: string; message?: string };
  };

  if (!res.ok || (payload.error?.code && payload.error.code !== 'ok')) {
    throw new Error(
      payload.error?.message || `TikTok video.list failed (${res.status})`
    );
  }

  return payload.data?.videos ?? [];
}

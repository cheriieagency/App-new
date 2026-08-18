/**
 * TikTok OAuth 2.0 helpers (Display API + Content Posting scopes).
 * Docs: https://developers.tiktok.com/doc/oauth-user-access-token-management
 * PKCE (S256) required for authorize → token exchange.
 *
 * Note: TikTok Login Kit is a custom OAuth flow (not a NextAuth/Auth.js
 * provider). Callback must match exactly:
 *   `${requestOrigin|TIKTOK_REDIRECT_URI}/api/auth/callback/tiktok`
 */

import { createHash, randomBytes } from 'crypto';
import { appBaseUrl, tiktokEnv } from '@/lib/config/env';

export const TIKTOK_OAUTH_STATE_COOKIE = 'clikd_tiktok_oauth_state';
/** HTTP-only cookie holding the PKCE code_verifier until callback. */
export const TIKTOK_CODE_VERIFIER_COOKIE = 'tiktok_code_verifier';
/** Optional post-OAuth landing: `settings` | `inbox`. */
export const TIKTOK_RETURN_TO_COOKIE = 'clikd_tiktok_return_to';

/**
 * Login Kit + Content Posting scopes requested at authorize time.
 * Exact list sent as `scope=` on https://www.tiktok.com/v2/auth/authorize/
 * `video.publish` = Direct Post · `video.upload` = inbox drafts.
 */
export const TIKTOK_OAUTH_SCOPES = [
  'user.info.basic',
  'user.info.profile',
  'video.publish',
  'video.upload',
] as const;

function originOf(value?: string | null): string {
  const raw = value?.trim();
  if (!raw) return '';
  try {
    return new URL(raw).origin;
  } catch {
    return '';
  }
}

/**
 * Public origin for TikTok redirect_uri.
 * Prefer the request host (the callback that is actually running) so local
 * Connect TikTok does not bounce to production when NEXTAUTH_URL is clikd.app.
 * Optional TIKTOK_REDIRECT_URI overrides when the portal uses a fixed URI.
 */
export function getTikTokOAuthBaseUrl(requestOrigin?: string | null): string {
  const explicit = originOf(process.env.TIKTOK_REDIRECT_URI);
  if (explicit) return explicit;

  const request = originOf(requestOrigin);
  if (request) return request;

  const fromBetterAuth = originOf(process.env.BETTER_AUTH_URL);
  const fromPublic = originOf(process.env.NEXT_PUBLIC_APP_URL);
  const fromNextAuth = originOf(process.env.NEXTAUTH_URL);
  return fromBetterAuth || fromPublic || fromNextAuth || appBaseUrl(requestOrigin);
}

/**
 * Explicit TikTok OAuth callback URL registered in the TikTok Developer Portal.
 * Always: `${configuredBase}/api/auth/callback/tiktok`
 */
export function getTikTokCallbackUrl(requestOrigin?: string | null): string {
  return `${getTikTokOAuthBaseUrl(requestOrigin)}/api/auth/callback/tiktok`;
}

/** Resolve where to send the user after a successful TikTok connect. */
export function getTikTokSuccessRedirectPath(
  returnTo?: string | null
): string {
  const target = (returnTo || '').trim().toLowerCase();
  if (target === 'inbox' || target === '/inbox' || target === 'admin?tab=inbox') {
    return '/admin?tab=inbox';
  }
  // Default: settings / socials (where Connect TikTok lives).
  if (
    target === 'settings' ||
    target === '/settings' ||
    target === 'socials' ||
    target === '/admin/settings/socials'
  ) {
    return '/admin/settings/socials';
  }
  return '/admin/settings/socials';
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
  // Maps to process.env.TIKTOK_CLIENT_KEY via tiktokEnv.
  const clientKey = tiktokEnv.clientKey();
  if (!clientKey) throw new Error('TIKTOK_CLIENT_KEY is not configured');

  const codeChallenge = options?.codeChallenge?.trim();
  if (!codeChallenge) {
    throw new Error('TikTok PKCE code_challenge is required');
  }

  const redirectUri = getTikTokCallbackUrl(requestOrigin);

  // https://developers.tiktok.com/doc/login-kit-web
  const authUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
  authUrl.searchParams.set('client_key', clientKey);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  // Force the full consent screen so posting scopes are not reused from a cached grant.
  authUrl.searchParams.set('prompt', 'consent');
  // Force account picker (0 = skip for existing session, 1 = always show).
  if (options?.forceSelectAccount !== false) {
    authUrl.searchParams.set('disable_auto_auth', '1');
  }
  // Append scope with literal commas — URLSearchParams would encode them as %2C,
  // and TikTok must see `video.publish` in the query string as-is.
  return `${authUrl.toString()}&scope=user.info.basic,user.info.profile,video.publish,video.upload`;
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

/** Normalize TikTok error payloads (string or nested object). */
function tikTokErrorMessage(data: Record<string, unknown>): string | null {
  if (typeof data.error_description === 'string' && data.error_description) {
    return data.error_description;
  }
  if (typeof data.message === 'string' && data.message) return data.message;
  if (typeof data.error === 'string' && data.error) return data.error;
  const nested = data.error;
  if (nested && typeof nested === 'object') {
    const obj = nested as Record<string, unknown>;
    if (typeof obj.message === 'string' && obj.message) return obj.message;
    if (typeof obj.code === 'string' && obj.code) return obj.code;
  }
  return null;
}

/**
 * Exchange authorization code for access + refresh tokens (requires PKCE verifier).
 * POST https://open.tiktokapis.com/v2/oauth/token/
 * Uses TIKTOK_CLIENT_KEY + TIKTOK_CLIENT_SECRET and the same redirect_uri as authorize.
 */
export async function exchangeTikTokCode(
  code: string,
  requestOrigin?: string | null,
  codeVerifier?: string | null
): Promise<TikTokTokenResponse> {
  // Maps to process.env.TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET.
  const clientKey = tiktokEnv.clientKey();
  const clientSecret = tiktokEnv.clientSecret();
  if (!clientKey || !clientSecret) {
    throw new Error(
      'TikTok OAuth credentials missing (TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET)'
    );
  }

  const verifier = codeVerifier?.trim();
  if (!verifier) {
    throw new Error('TikTok PKCE code_verifier is missing');
  }

  // TikTok may return a URL-encoded code; URLSearchParams.get already decodes once.
  // Strip accidental wrapping whitespace only — do not re-encode.
  const authCode = code.trim();
  if (!authCode) throw new Error('TikTok authorization code is empty');

  // Must match the redirect_uri used in buildTikTokLoginUrl / Developer Portal.
  const redirectUri = getTikTokCallbackUrl(requestOrigin);

  const params = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code: authCode,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });

  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = (await res.json()) as TikTokTokenResponse & Record<string, unknown>;

  if (!res.ok || !data.access_token) {
    throw new Error(
      tikTokErrorMessage(data) || `TikTok token exchange failed (${res.status})`
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
 * Throws (do not publish with a stale token) when refresh is required and fails.
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
  const expiredOrUnknown =
    !Number.isFinite(expiresMs) || expiresMs <= Date.now() + 120_000;

  if (!expiredOrUnknown) return accessToken;

  if (!refreshToken) {
    if (Number.isFinite(expiresMs) && expiresMs <= Date.now()) {
      throw new Error('TikTok session expired — reconnect under Settings → Socials');
    }
    return accessToken;
  }

  try {
    const tokens = await refreshTikTokAccessToken(refreshToken);
    const { persistRefreshedTikTokTokens } = await import(
      '@/lib/tiktok/tokens-persist'
    );
    await persistRefreshedTikTokTokens({
      userId: input.userId,
      workspaceId: input.workspaceId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? refreshToken,
      expiresIn: tokens.expires_in ?? null,
    });
    return tokens.access_token;
  } catch (error) {
    console.warn('[tiktok] token refresh failed', error);
    throw new Error(
      error instanceof Error
        ? `TikTok session expired — reconnect under Settings → Socials (${error.message})`
        : 'TikTok session expired — reconnect under Settings → Socials'
    );
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

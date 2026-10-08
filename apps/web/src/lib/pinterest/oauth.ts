/**
 * Pinterest OAuth 2.0 helpers (boards + pins scopes).
 * Docs: https://developers.pinterest.com/docs/getting-started/authentication/
 */

import { appBaseUrl, pinterestEnv } from '@/lib/config/env';

export const PINTEREST_OAUTH_STATE_COOKIE = 'clikd_pinterest_oauth_state';

/** Scopes requested at authorize time. */
export const PINTEREST_OAUTH_SCOPES = [
  'boards:read',
  'boards:write',
  'pins:read',
  'pins:write',
  'user_accounts:read',
] as const;

function isLocalHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1'
  );
}

function isLocalOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  try {
    return isLocalHost(new URL(origin).hostname);
  } catch {
    return false;
  }
}

/**
 * Normalize OAuth redirect URIs for exact Pinterest matching:
 * no trailing slash, no query/hash.
 * Keep www. — stripping it breaks state cookies when users start on www.
 */
export function normalizeOAuthRedirectUri(uri: string): string {
  const parsed = new URL(uri.trim());
  parsed.search = '';
  parsed.hash = '';
  const path = parsed.pathname.replace(/\/+$/, '') || '';
  return `${parsed.protocol}//${parsed.host}${path}`;
}

/**
 * Absolute redirect_uri for authorize + token exchange (must be identical).
 *
 * Prefer the live request host so:
 * - localhost Connect never bounces to production
 * - www vs apex cookie host matches the callback host
 *
 * Env PINTEREST_REDIRECT_URI is only used when it shares the same hostname
 * as the request (or when no request origin is available).
 */
export function getPinterestCallbackUrl(requestOrigin?: string | null): string {
  const derivedFromRequest = requestOrigin
    ? normalizeOAuthRedirectUri(
        `${requestOrigin.replace(/\/+$/, '')}/api/auth/callback/pinterest`
      )
    : null;

  if (derivedFromRequest && isLocalOrigin(requestOrigin)) {
    return derivedFromRequest;
  }

  const explicit = pinterestEnv.redirectUri()?.trim();
  if (explicit) {
    const normalizedExplicit = normalizeOAuthRedirectUri(explicit);
    if (!derivedFromRequest) return normalizedExplicit;
    try {
      const reqHost = new URL(derivedFromRequest).hostname.replace(/^www\./, '');
      const envHost = new URL(normalizedExplicit).hostname.replace(/^www\./, '');
      // Same site (www/apex variants) → prefer the live request host.
      if (reqHost === envHost && derivedFromRequest) {
        return derivedFromRequest;
      }
      // Different host → keep env only when request host is unknown.
    } catch {
      /* fall through */
    }
  }

  if (derivedFromRequest) return derivedFromRequest;

  return normalizeOAuthRedirectUri(
    `${appBaseUrl(requestOrigin)}/api/auth/callback/pinterest`
  );
}

/** Cookie Domain so www + apex share OAuth state on production. */
export function pinterestOAuthCookieDomain(
  requestOrigin?: string | null
): string | undefined {
  if (!requestOrigin) return undefined;
  try {
    const host = new URL(requestOrigin).hostname;
    if (isLocalHost(host)) return undefined;
    if (host === 'clikd.app' || host.endsWith('.clikd.app')) {
      return '.clikd.app';
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

export function buildPinterestLoginUrl(
  state: string,
  requestOrigin?: string | null
): string {
  const clientId = pinterestEnv.appId();
  if (!clientId) throw new Error('PINTEREST_APP_ID is not configured');

  const url = new URL('https://www.pinterest.com/oauth/');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', getPinterestCallbackUrl(requestOrigin));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', PINTEREST_OAUTH_SCOPES.join(','));
  url.searchParams.set('state', state);
  return url.toString();
}

export type PinterestTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_token_expires_in?: number;
  token_type?: string;
  scope?: string;
};

function basicAuthHeader(): string {
  const id = pinterestEnv.appId();
  const secret = pinterestEnv.appSecret();
  if (!id || !secret) {
    throw new Error('Pinterest OAuth credentials missing');
  }
  const raw = `${id}:${secret}`;
  return `Basic ${Buffer.from(raw, 'utf8').toString('base64')}`;
}

/** Exchange authorization code for access + refresh tokens (Basic Auth). */
export async function exchangePinterestCode(
  code: string,
  requestOrigin?: string | null
): Promise<PinterestTokenResponse> {
  const redirectUri = getPinterestCallbackUrl(requestOrigin);
  const res = await fetch('https://api.pinterest.com/v5/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      // Longer-lived rotating refresh tokens (Pinterest v5).
      continuous_refresh: 'true',
    }),
  });

  const data = (await res.json()) as PinterestTokenResponse & {
    message?: string;
    code?: number;
    error?: string;
  };

  if (!res.ok || !data.access_token) {
    const base =
      data.message || data.error || `Pinterest token exchange failed (${res.status})`;
    // Pinterest returns this when App ID/Secret or redirect_uri do not match the console.
    if (/authentication failed/i.test(base)) {
      throw new Error(
        `Authentication failed. Register this exact Redirect URI in the Pinterest app: ${redirectUri}`
      );
    }
    throw new Error(base);
  }
  return data;
}

/** Refresh an expired Pinterest access token (Basic Auth + refresh_token grant). */
export async function refreshPinterestAccessToken(
  refreshToken: string
): Promise<PinterestTokenResponse> {
  const res = await fetch('https://api.pinterest.com/v5/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken.trim(),
      continuous_refresh: 'true',
    }),
  });

  const data = (await res.json()) as PinterestTokenResponse & {
    message?: string;
    error?: string;
  };

  if (!res.ok || !data.access_token) {
    throw new Error(
      data.message || data.error || `Pinterest token refresh failed (${res.status})`
    );
  }
  return data;
}

export type PinterestUserAccount = {
  username?: string;
  account_type?: string;
  /** Brand / business display name when account_type is BUSINESS. */
  business_name?: string | null;
  profile_image?: string;
  website_url?: string;
  id?: string;
  follower_count?: number | null;
};

/** Resolve a human label + @handle from a Pinterest user_account payload. */
export function resolvePinterestAccountIdentity(profile: PinterestUserAccount & Record<string, unknown>): {
  externalId: string;
  username: string | null;
  displayName: string;
  handle: string | null;
  avatarUrl: string | null;
} {
  // Pinterest may expose username under a few shapes depending on account type.
  const usernameRaw =
    profile.username ||
    (typeof profile['user_name'] === 'string' ? profile['user_name'] : '') ||
    (typeof profile['full_name'] === 'string' ? '' : '') ||
    '';
  const username = String(usernameRaw).trim().replace(/^@/, '') || null;
  const businessName =
    (profile.business_name || '').trim() ||
    (typeof profile['businessName'] === 'string' ? profile['businessName'].trim() : '') ||
    null;
  const externalId = String(profile.id || username || '').trim();
  const displayName =
    businessName ||
    username ||
    (externalId && !/^[a-z0-9]{16,}$/i.test(externalId)
      ? externalId
      : null) ||
    'Pinterest account';
  const handle = username ? `@${username}` : null;
  const avatarUrl =
    profile.profile_image?.trim() ||
    (typeof profile['profile_image_url'] === 'string'
      ? profile['profile_image_url'].trim()
      : null) ||
    null;
  return { externalId, username, displayName, handle, avatarUrl };
}

/** Fetch authenticated user_account profile. */
export async function fetchPinterestUserAccount(
  accessToken: string
): Promise<PinterestUserAccount> {
  const res = await fetch('https://api.pinterest.com/v5/user_account', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const data = (await res.json()) as PinterestUserAccount & {
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message || `Pinterest user_account failed (${res.status})`);
  }
  return data;
}

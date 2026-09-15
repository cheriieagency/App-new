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

function isLocalOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  try {
    const host = new URL(origin).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
}

/**
 * Normalize OAuth redirect URIs for exact Pinterest matching:
 * no trailing slash, no www., no query/hash.
 */
export function normalizeOAuthRedirectUri(uri: string): string {
  const parsed = new URL(uri.trim());
  if (parsed.hostname.startsWith('www.')) {
    parsed.hostname = parsed.hostname.slice(4);
  }
  parsed.search = '';
  parsed.hash = '';
  const path = parsed.pathname.replace(/\/+$/, '') || '';
  return `${parsed.protocol}//${parsed.host}${path}`;
}

/**
 * Absolute redirect_uri for authorize + token exchange (must be identical).
 * On localhost, always derive from the live request origin so a production
 * PINTEREST_REDIRECT_URI in .env.local does not send the code to clikd.app.
 * Otherwise prefer the explicit env URI when set (must match Pinterest console).
 */
export function getPinterestCallbackUrl(requestOrigin?: string | null): string {
  const derived = normalizeOAuthRedirectUri(
    `${appBaseUrl(requestOrigin)}/api/auth/callback/pinterest`
  );
  if (isLocalOrigin(requestOrigin) || isLocalOrigin(derived)) {
    return derived;
  }
  const explicit = pinterestEnv.redirectUri()?.trim();
  if (explicit) return normalizeOAuthRedirectUri(explicit);
  return derived;
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
  profile_image?: string;
  website_url?: string;
  id?: string;
};

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

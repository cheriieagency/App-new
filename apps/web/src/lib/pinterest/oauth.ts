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

export function getPinterestCallbackUrl(requestOrigin?: string | null): string {
  return `${appBaseUrl(requestOrigin)}/api/auth/callback/pinterest`;
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
  const res = await fetch('https://api.pinterest.com/v5/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: getPinterestCallbackUrl(requestOrigin),
    }),
  });

  const data = (await res.json()) as PinterestTokenResponse & {
    message?: string;
    code?: number;
    error?: string;
  };

  if (!res.ok || !data.access_token) {
    throw new Error(
      data.message || data.error || `Pinterest token exchange failed (${res.status})`
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

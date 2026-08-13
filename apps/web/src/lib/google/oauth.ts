/**
 * Google OAuth for Drive (readonly) + Calendar/Meet (events).
 * Separate from YouTube OAuth (different redirect URI + scopes).
 */

import { appBaseUrl, youtubeEnv } from '@/lib/config/env';

export const GOOGLE_OAUTH_STATE_COOKIE = 'clikd_google_oauth_state';

export const GOOGLE_OAUTH_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/calendar.events',
] as const;

export function getGoogleCallbackUrl(requestOrigin?: string | null): string {
  return `${appBaseUrl(requestOrigin)}/api/auth/callback/google`;
}

export function buildGoogleLoginUrl(
  state: string,
  requestOrigin?: string | null
): string {
  const clientId = youtubeEnv.googleClientId();
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID is not configured');

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', getGoogleCallbackUrl(requestOrigin));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', GOOGLE_OAUTH_SCOPES.join(' '));
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('state', state);
  return url.toString();
}

export type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
};

export async function exchangeGoogleCode(
  code: string,
  requestOrigin?: string | null
): Promise<GoogleTokenResponse> {
  const clientId = youtubeEnv.googleClientId();
  const clientSecret = youtubeEnv.googleClientSecret();
  if (!clientId || !clientSecret) throw new Error('Google OAuth credentials missing');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getGoogleCallbackUrl(requestOrigin),
      grant_type: 'authorization_code',
    }),
  });
  const data = (await res.json()) as GoogleTokenResponse & {
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Google token exchange failed');
  }
  return data;
}

export async function refreshGoogleAccessToken(
  refreshToken: string
): Promise<GoogleTokenResponse> {
  const clientId = youtubeEnv.googleClientId();
  const clientSecret = youtubeEnv.googleClientSecret();
  if (!clientId || !clientSecret) throw new Error('Google OAuth credentials missing');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = (await res.json()) as GoogleTokenResponse & {
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Google token refresh failed');
  }
  return data;
}

export type GoogleUserInfo = {
  id: string;
  email: string | null;
  name: string | null;
  picture: string | null;
};

export async function fetchGoogleUserInfo(
  accessToken: string
): Promise<GoogleUserInfo> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await res.json()) as {
    id?: string;
    email?: string;
    name?: string;
    picture?: string;
    error?: { message?: string };
  };
  if (!res.ok || !data.id) {
    throw new Error(data.error?.message || 'Failed to fetch Google user info');
  }
  return {
    id: data.id,
    email: data.email ?? null,
    name: data.name ?? null,
    picture: data.picture ?? null,
  };
}

/**
 * LinkedIn OAuth 2.0 (OpenID Connect + w_member_social) helpers.
 */

import { appBaseUrl, linkedinEnv } from '@/lib/config/env';

export const LINKEDIN_OAUTH_STATE_COOKIE = 'clikd_linkedin_oauth_state';

export const LINKEDIN_OAUTH_SCOPES = [
  'openid',
  'profile',
  'email',
  'w_member_social',
] as const;

export function getLinkedInCallbackUrl(requestOrigin?: string | null): string {
  return `${appBaseUrl(requestOrigin)}/api/auth/callback/linkedin`;
}

export function buildLinkedInLoginUrl(
  state: string,
  requestOrigin?: string | null
): string {
  const clientId = linkedinEnv.clientId();
  if (!clientId) throw new Error('LINKEDIN_CLIENT_ID is not configured');

  const url = new URL('https://www.linkedin.com/oauth/v2/authorization');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', getLinkedInCallbackUrl(requestOrigin));
  url.searchParams.set('state', state);
  url.searchParams.set('scope', LINKEDIN_OAUTH_SCOPES.join(' '));
  return url.toString();
}

export type LinkedInTokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

export async function exchangeLinkedInCode(
  code: string,
  requestOrigin?: string | null
): Promise<LinkedInTokenResponse> {
  const clientId = linkedinEnv.clientId();
  const clientSecret = linkedinEnv.clientSecret();
  if (!clientId || !clientSecret) {
    throw new Error('LinkedIn OAuth credentials missing');
  }

  const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: getLinkedInCallbackUrl(requestOrigin),
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  const data = (await res.json()) as LinkedInTokenResponse & {
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error_description || data.error || 'LinkedIn token exchange failed'
    );
  }
  return data;
}

export type LinkedInProfile = {
  sub: string;
  name: string;
  picture: string | null;
  email?: string | null;
};

/** OpenID userinfo — sub, name, picture, email. */
export async function fetchLinkedInProfile(
  accessToken: string
): Promise<LinkedInProfile> {
  const res = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await res.json()) as {
    sub?: string;
    name?: string;
    picture?: string;
    email?: string;
    message?: string;
  };
  if (!res.ok || !data.sub) {
    throw new Error(data.message || 'Failed to fetch LinkedIn profile');
  }
  return {
    sub: data.sub,
    name: data.name || 'LinkedIn Member',
    picture: data.picture || null,
    email: data.email || null,
  };
}

/**
 * TikTok Business / Marketing API OAuth helpers.
 * Authorize: https://business-api.tiktok.com/portal/auth
 * Token:    POST https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/
 */

import { tiktokEnv } from '@/lib/config/env';
import { getTikTokCallbackUrl, getTikTokOAuthBaseUrl } from '@/lib/tiktok/oauth';

export const TIKTOK_BUSINESS_FLOW_COOKIE = 'clikd_tiktok_oauth_flow';

export type TikTokBusinessTokenResponse = {
  access_token: string;
  refresh_token?: string | null;
  advertiser_ids?: string[];
  scope?: string[] | string | null;
  expires_in?: number | null;
  open_id?: string | null;
};

/** Build Business Portal authorize URL (app_id + redirect_uri + state). */
export function buildTikTokBusinessLoginUrl(
  state: string,
  requestOrigin?: string | null
): string {
  const appId = tiktokEnv.businessAppId();
  if (!appId) throw new Error('TIKTOK_BUSINESS_APP_ID is not configured');

  const redirectUri = getTikTokCallbackUrl(requestOrigin);
  const authUrl = new URL('https://business-api.tiktok.com/portal/auth');
  authUrl.searchParams.set('app_id', appId);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  return authUrl.toString();
}

/**
 * Exchange Business auth_code → access_token.
 * Body: { app_id, secret, auth_code } JSON.
 */
export async function exchangeTikTokBusinessAuthCode(
  authCode: string
): Promise<TikTokBusinessTokenResponse> {
  const appId = tiktokEnv.businessAppId();
  const secret = tiktokEnv.businessSecret();
  if (!appId || !secret) {
    throw new Error(
      'TikTok Business credentials missing (TIKTOK_BUSINESS_APP_ID / TIKTOK_BUSINESS_SECRET)'
    );
  }

  const code = authCode.trim();
  if (!code) throw new Error('TikTok Business auth_code is empty');

  const res = await fetch(
    'https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: appId,
        secret,
        auth_code: code,
      }),
    }
  );

  const payload = (await res.json()) as {
    code?: number;
    message?: string;
    data?: {
      access_token?: string;
      refresh_token?: string;
      advertiser_ids?: Array<string | number>;
      scope?: string[] | string;
      expires_in?: number;
      open_id?: string;
    };
  };

  const data = payload.data;
  if (!res.ok || payload.code !== 0 || !data?.access_token) {
    throw new Error(
      payload.message ||
        `TikTok Business token exchange failed (${res.status})`
    );
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? null,
    advertiser_ids: (data.advertiser_ids || []).map(String),
    scope: data.scope ?? null,
    expires_in: data.expires_in ?? null,
    open_id: data.open_id ?? null,
  };
}

export function isTikTokBusinessMockMode(): boolean {
  // Mock inbox / connect when Business secret is not yet provisioned.
  return !tiktokEnv.businessSecret()?.trim();
}

export function getTikTokBusinessOAuthBaseUrl(requestOrigin?: string | null) {
  return getTikTokOAuthBaseUrl(requestOrigin);
}

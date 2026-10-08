/**
 * Instagram Login API (Instagram-only OAuth — no Facebook Page required).
 *
 * Authorize: https://api.instagram.com/oauth/authorize
 * Token:     POST https://api.instagram.com/oauth/access_token
 * Profile:   GET  https://graph.instagram.com/me
 *
 * Distinct from Meta Facebook Login (`/api/auth/meta/login`) which uses
 * facebook.com dialog + graph.facebook.com Pages → linked IG.
 */

import { instagramEnv } from '@/lib/config/env';
import { getSiteUrl } from '@/lib/site';

export const IG_ONLY_OAUTH_STATE_COOKIE = 'clikd_ig_only_oauth_state';

/** Instagram API with Instagram Login — Business Login scopes. */
export const INSTAGRAM_ONLY_OAUTH_SCOPES = [
  'instagram_business_basic',
  'instagram_business_content_publish',
  'instagram_business_manage_messages',
  'instagram_business_manage_comments',
  'instagram_business_manage_insights',
] as const;

export function instagramAppId(): string | undefined {
  return instagramEnv.appId();
}

export function instagramAppSecret(): string | undefined {
  return instagramEnv.appSecret();
}

function isLocalHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1'
  );
}

/**
 * Exact redirect_uri for authorize + token exchange.
 * Prefer live request origin so localhost never bounces to production.
 */
export function getInstagramOnlyCallbackUrl(
  requestOrigin?: string | null
): string {
  const fromRequest = requestOrigin?.trim();
  if (fromRequest) {
    try {
      return `${new URL(fromRequest).origin}/api/auth/instagram-only/callback`;
    } catch {
      /* fall through */
    }
  }

  const fromEnv =
    process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI?.trim() ||
    process.env.INSTAGRAM_REDIRECT_URI?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.BETTER_AUTH_URL?.trim() ||
    getSiteUrl();

  try {
    const url = new URL(fromEnv);
    if (url.pathname.includes('/api/auth/instagram-only/callback')) {
      return `${url.origin}/api/auth/instagram-only/callback`;
    }
    return `${url.origin}/api/auth/instagram-only/callback`;
  } catch {
    return `${getSiteUrl()}/api/auth/instagram-only/callback`;
  }
}

/** Cookie Domain so www + apex share OAuth state on production. */
export function instagramOnlyOAuthCookieDomain(
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

/** Build Instagram Login authorize URL. */
export function buildInstagramOnlyLoginUrl(
  state: string,
  requestOrigin?: string | null
): string {
  const clientId = instagramAppId();
  if (!clientId) throw new Error('INSTAGRAM_APP_ID is not configured');

  const redirectUri = getInstagramOnlyCallbackUrl(requestOrigin);
  const authUrl = new URL('https://api.instagram.com/oauth/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', state);
  // Force full consent so newly added scopes appear.
  authUrl.searchParams.set('force_reauth', 'true');
  // Literal commas — Instagram expects unencoded scope separators.
  return `${authUrl.toString()}&scope=${INSTAGRAM_ONLY_OAUTH_SCOPES.join(',')}`;
}

export type InstagramOnlyTokenResponse = {
  access_token: string;
  user_id: string | number;
  permissions?: string[];
};

/**
 * Exchange authorization code → short-lived Instagram user token.
 * POST https://api.instagram.com/oauth/access_token (form body).
 */
export async function exchangeInstagramOnlyCode(
  code: string,
  requestOrigin?: string | null
): Promise<InstagramOnlyTokenResponse> {
  const clientId = instagramAppId();
  const clientSecret = instagramAppSecret();
  if (!clientId || !clientSecret) {
    throw new Error(
      'Instagram app credentials missing (INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET)'
    );
  }

  const redirectUri = getInstagramOnlyCallbackUrl(requestOrigin);
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code: code.trim(),
  });

  const res = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = (await res.json()) as InstagramOnlyTokenResponse & {
    error_type?: string;
    error_message?: string;
    error?: { message?: string; type?: string };
  };

  if (!res.ok || !data.access_token) {
    const msg =
      data.error_message ||
      data.error?.message ||
      data.error_type ||
      `Instagram token exchange failed (${res.status})`;
    if (/redirect_uri|OAuthException/i.test(msg)) {
      throw new Error(
        `${msg} — register this exact Redirect URI in the Instagram app: ${redirectUri}`
      );
    }
    throw new Error(msg);
  }

  return {
    access_token: data.access_token,
    user_id: data.user_id,
    permissions: data.permissions,
  };
}

export type InstagramLongLivedToken = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

/**
 * Exchange short-lived → long-lived Instagram user token (~60 days).
 * GET https://graph.instagram.com/access_token
 */
export async function exchangeInstagramOnlyLongLivedToken(
  shortLivedToken: string
): Promise<InstagramLongLivedToken> {
  const clientSecret = instagramAppSecret();
  if (!clientSecret) {
    throw new Error('INSTAGRAM_APP_SECRET is not configured');
  }

  const url = new URL('https://graph.instagram.com/access_token');
  url.searchParams.set('grant_type', 'ig_exchange_token');
  url.searchParams.set('client_secret', clientSecret);
  url.searchParams.set('access_token', shortLivedToken.trim());

  const res = await fetch(url.toString());
  const data = (await res.json()) as InstagramLongLivedToken & {
    error?: { message?: string };
  };

  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error?.message ||
        `Instagram long-lived token exchange failed (${res.status})`
    );
  }

  return {
    access_token: data.access_token,
    token_type: data.token_type,
    expires_in: data.expires_in,
  };
}

export type InstagramOnlyProfile = {
  id: string;
  username?: string | null;
  name?: string | null;
  profile_picture_url?: string | null;
};

/** Fetch IG user profile — no Facebook Page lookup. */
export async function fetchInstagramOnlyProfile(
  accessToken: string
): Promise<InstagramOnlyProfile> {
  const url = new URL('https://graph.instagram.com/me');
  url.searchParams.set('fields', 'id,username,name,profile_picture_url');
  url.searchParams.set('access_token', accessToken.trim());

  const res = await fetch(url.toString());
  const data = (await res.json()) as InstagramOnlyProfile & {
    error?: { message?: string; code?: number };
  };

  if (!res.ok || !data.id) {
    throw new Error(
      data.error?.message || `Failed to fetch Instagram profile (${res.status})`
    );
  }

  return {
    id: String(data.id),
    username: data.username ?? null,
    name: data.name ?? null,
    profile_picture_url: data.profile_picture_url ?? null,
  };
}

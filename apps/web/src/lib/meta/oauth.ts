/**
 * Meta OAuth helpers — login URL, token exchange, page/IG account fetch.
 */

import { metaEnv } from '@/lib/config/env';
import { getSiteUrl } from '@/lib/site';
import { GRAPH_BASE } from '@/lib/meta/graph-api';

/** Which Meta products the user asked to connect. */
export type MetaOAuthTarget = 'instagram' | 'facebook' | 'both';

export const META_OAUTH_STATE_COOKIE = 'clikd_meta_oauth_state';
export const META_OAUTH_TARGET_COOKIE = 'clikd_meta_oauth_target';

const INSTAGRAM_SCOPES = [
  'public_profile',
  'instagram_basic',
  'instagram_content_publish',
  'instagram_manage_insights',
  'instagram_manage_comments',
  'pages_show_list',
  'pages_read_engagement',
] as const;

const FACEBOOK_SCOPES = [
  'public_profile',
  'pages_show_list',
  'pages_manage_posts',
  'pages_read_engagement',
] as const;

/** @deprecated Prefer scopesForMetaTarget — kept for callers expecting the full suite. */
export const META_OAUTH_SCOPES = [
  ...new Set([...INSTAGRAM_SCOPES, ...FACEBOOK_SCOPES, 'email']),
] as const;

export function parseMetaOAuthTarget(raw: string | null | undefined): MetaOAuthTarget {
  if (raw === 'instagram' || raw === 'facebook' || raw === 'both') return raw;
  return 'both';
}

/** Scopes for the chosen connect target. */
export function scopesForMetaTarget(target: MetaOAuthTarget): string[] {
  if (target === 'instagram') return [...INSTAGRAM_SCOPES];
  if (target === 'facebook') return [...FACEBOOK_SCOPES];
  return [...new Set([...INSTAGRAM_SCOPES, ...FACEBOOK_SCOPES])];
}

/**
 * Encode nonce + target into the OAuth `state` (and cookie) so the callback
 * knows whether to store Instagram, Facebook, or both.
 */
export function encodeMetaOAuthState(nonce: string, target: MetaOAuthTarget): string {
  return `${nonce}.${target}`;
}

export function decodeMetaOAuthState(state: string | null | undefined): {
  nonce: string;
  target: MetaOAuthTarget;
} | null {
  if (!state || !state.includes('.')) return null;
  const idx = state.lastIndexOf('.');
  const nonce = state.slice(0, idx);
  const target = parseMetaOAuthTarget(state.slice(idx + 1));
  if (!nonce) return null;
  return { nonce, target };
}

export function getMetaCallbackUrl(requestOrigin?: string | null): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    requestOrigin?.trim() ||
    getSiteUrl();
  try {
    return `${new URL(base).origin}/api/auth/callback/meta`;
  } catch {
    return `${getSiteUrl()}/api/auth/callback/meta`;
  }
}

export function buildMetaLoginUrl(
  state: string,
  requestOrigin?: string | null,
  target: MetaOAuthTarget = 'both'
): string {
  const appId = metaEnv.appId();
  if (!appId) throw new Error('META_APP_ID is not configured');

  const url = new URL('https://www.facebook.com/v19.0/dialog/oauth');
  url.searchParams.set('client_id', appId);
  url.searchParams.set('redirect_uri', getMetaCallbackUrl(requestOrigin));
  url.searchParams.set('state', state);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scopesForMetaTarget(target).join(','));
  // Always re-prompt permissions + page selection (even if previously granted).
  url.searchParams.set('auth_type', 'rerequest');
  url.searchParams.set('prompt', 'consent');
  return url.toString();
}

export type MetaTokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

/** Exchange OAuth code → short-lived user access token. */
export async function exchangeCodeForShortLivedToken(
  code: string,
  requestOrigin?: string | null
): Promise<MetaTokenResponse> {
  const appId = metaEnv.appId();
  const appSecret = metaEnv.appSecret();
  if (!appId || !appSecret) throw new Error('Meta app credentials missing');

  const url = new URL(`${GRAPH_BASE}/oauth/access_token`);
  url.searchParams.set('client_id', appId);
  url.searchParams.set('client_secret', appSecret);
  url.searchParams.set('redirect_uri', getMetaCallbackUrl(requestOrigin));
  url.searchParams.set('code', code);

  const res = await fetch(url.toString());
  const data = (await res.json()) as MetaTokenResponse & {
    error?: { message?: string };
  };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error?.message || 'Failed to exchange OAuth code');
  }
  return data;
}

/** Exchange short-lived token → ~60-day long-lived user access token. */
export async function exchangeForLongLivedToken(
  shortLivedToken: string
): Promise<MetaTokenResponse> {
  const appId = metaEnv.appId();
  const appSecret = metaEnv.appSecret();
  if (!appId || !appSecret) throw new Error('Meta app credentials missing');

  const url = new URL(`${GRAPH_BASE}/oauth/access_token`);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', appId);
  url.searchParams.set('client_secret', appSecret);
  url.searchParams.set('fb_exchange_token', shortLivedToken);

  const res = await fetch(url.toString());
  const data = (await res.json()) as MetaTokenResponse & {
    error?: { message?: string };
  };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error?.message || 'Failed to exchange for long-lived token');
  }
  return data;
}

export type MetaIgBusinessAccount = {
  id: string;
  username?: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
  media_count?: number;
};

export type MetaPageAccount = {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: MetaIgBusinessAccount;
};

export type MetaAccountsResponse = {
  data?: MetaPageAccount[];
};

/**
 * Fetch Facebook Pages + linked Instagram Business accounts (profile metadata).
 * Graph: me/accounts?fields=id,name,access_token,instagram_business_account{…}
 */
export async function fetchMetaPagesWithInstagram(
  userAccessToken: string
): Promise<MetaPageAccount[]> {
  const url = new URL(`${GRAPH_BASE}/me/accounts`);
  url.searchParams.set(
    'fields',
    'id,name,access_token,instagram_business_account{id,username,name,profile_picture_url,followers_count,media_count}'
  );
  url.searchParams.set('access_token', userAccessToken);

  const res = await fetch(url.toString());
  const data = (await res.json()) as MetaAccountsResponse & {
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to fetch Meta pages');
  }
  return data.data ?? [];
}

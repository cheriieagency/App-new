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

/**
 * Canonical Meta OAuth scopes — must include Pages + Instagram permissions
 * so /me/accounts returns pages with linked IG Business accounts.
 */
export const META_OAUTH_SCOPES = [
  'public_profile',
  'email',
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'pages_messaging',
  'instagram_basic',
  'instagram_content_publish',
  'instagram_manage_insights',
  'instagram_manage_comments',
  // Instagram Messaging API (Inbox DMs via Page conversations).
  'instagram_manage_messages',
  'business_management',
] as const;

export function parseMetaOAuthTarget(raw: string | null | undefined): MetaOAuthTarget {
  if (raw === 'instagram' || raw === 'facebook' || raw === 'both') return raw;
  return 'both';
}

/** Scopes for the chosen connect target (full Pages+IG set for every target). */
export function scopesForMetaTarget(_target: MetaOAuthTarget): string[] {
  void _target;
  return [...META_OAUTH_SCOPES];
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
  // Explicit comma-joined scope string (Pages + Instagram + email).
  url.searchParams.set(
    'scope',
    scopesForMetaTarget(target).join(',')
  );
  // Force Meta to re-prompt page/IG permissions on every Connect click.
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
  category?: string;
  tasks?: string[];
  instagram_business_account?: MetaIgBusinessAccount;
};

export type MetaAccountsResponse = {
  data?: MetaPageAccount[];
};

export type MetaBusinessPortfolioResponse = {
  id?: string;
  name?: string;
  instagram_business_account?: MetaIgBusinessAccount;
  accounts?: {
    data?: MetaPageAccount[];
  };
  error?: { message?: string };
};

export type ResolvedMetaGraphAccounts = {
  pages: MetaPageAccount[];
  /** IG found on a Page or via Business Portfolio /me fallback. */
  instagram: MetaIgBusinessAccount | null;
  /** Page that owns the IG (null when IG came from user portfolio only). */
  instagramPage: MetaPageAccount | null;
  source: 'me_accounts' | 'business_portfolio' | 'mixed';
};

const PAGE_ACCOUNT_FIELDS =
  'id,name,access_token,category,tasks,instagram_business_account{id,username,profile_picture_url,name,followers_count,media_count}';

/**
 * Step B — Fetch Facebook Pages + linked Instagram Business accounts.
 * Graph v19: /me/accounts?fields=id,name,access_token,category,tasks,instagram_business_account{…}
 */
export async function fetchMetaPagesWithInstagram(
  userAccessToken: string
): Promise<MetaPageAccount[]> {
  const url = new URL(`${GRAPH_BASE}/me/accounts`);
  url.searchParams.set('fields', PAGE_ACCOUNT_FIELDS);
  url.searchParams.set('access_token', userAccessToken);

  const res = await fetch(url.toString());
  const data = (await res.json()) as MetaAccountsResponse & {
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to fetch Meta pages');
  }

  const pages = data.data ?? [];
  return [...pages].sort((a, b) => {
    const aIg = a.instagram_business_account?.id ? 1 : 0;
    const bIg = b.instagram_business_account?.id ? 1 : 0;
    return bIg - aIg;
  });
}

/**
 * Step C — Fallback for Meta Business Portfolios / Business Manager assets.
 * Graph: /me?fields=id,name,instagram_business_account{…},accounts{…}
 */
export async function fetchMetaBusinessPortfolio(
  userAccessToken: string
): Promise<MetaBusinessPortfolioResponse> {
  const url = new URL(`${GRAPH_BASE}/me`);
  url.searchParams.set(
    'fields',
    [
      'id',
      'name',
      'instagram_business_account{id,username,profile_picture_url,name,followers_count,media_count}',
      `accounts{${PAGE_ACCOUNT_FIELDS}}`,
    ].join(',')
  );
  url.searchParams.set('access_token', userAccessToken);

  const res = await fetch(url.toString());
  const data = (await res.json()) as MetaBusinessPortfolioResponse;
  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to fetch Meta business portfolio');
  }
  return data;
}

/** First Instagram Business account found across any page list. */
export function findInstagramAcrossPages(
  pages: MetaPageAccount[]
): { page: MetaPageAccount; ig: MetaIgBusinessAccount } | null {
  for (const page of pages) {
    const ig = page.instagram_business_account;
    if (ig?.id) return { page, ig };
  }
  return null;
}

/**
 * Resolve Pages + IG via /me/accounts, then Business Portfolio fallback when
 * pages are empty or no Instagram Business account is attached.
 */
export async function resolveMetaPagesAndInstagram(
  userAccessToken: string
): Promise<ResolvedMetaGraphAccounts> {
  let pages: MetaPageAccount[] = [];
  try {
    pages = await fetchMetaPagesWithInstagram(userAccessToken);
  } catch (error) {
    console.warn('[meta/oauth] /me/accounts failed, trying portfolio fallback', error);
  }

  let igMatch = findInstagramAcrossPages(pages);
  let source: ResolvedMetaGraphAccounts['source'] = 'me_accounts';

  if (!pages.length || !igMatch) {
    try {
      const portfolio = await fetchMetaBusinessPortfolio(userAccessToken);
      const portfolioPages = portfolio.accounts?.data ?? [];

      // Merge portfolio pages (by id) into the primary list.
      const byId = new Map<string, MetaPageAccount>();
      for (const p of pages) byId.set(p.id, p);
      for (const p of portfolioPages) {
        const existing = byId.get(p.id);
        byId.set(p.id, {
          ...existing,
          ...p,
          access_token: p.access_token || existing?.access_token || '',
          instagram_business_account:
            p.instagram_business_account || existing?.instagram_business_account,
        });
      }
      pages = [...byId.values()].sort((a, b) => {
        const aIg = a.instagram_business_account?.id ? 1 : 0;
        const bIg = b.instagram_business_account?.id ? 1 : 0;
        return bIg - aIg;
      });

      igMatch = findInstagramAcrossPages(pages);

      // Direct user-level IG Business account (portfolio-linked, no Page edge).
      if (!igMatch && portfolio.instagram_business_account?.id) {
        const syntheticPage: MetaPageAccount = {
          id: `user-${portfolio.id || 'portfolio'}`,
          name: portfolio.name || 'Meta Business Portfolio',
          access_token: '',
          instagram_business_account: portfolio.instagram_business_account,
        };
        pages = [syntheticPage, ...pages];
        igMatch = {
          page: syntheticPage,
          ig: portfolio.instagram_business_account,
        };
      }

      source = pages.length && igMatch ? 'mixed' : 'business_portfolio';
    } catch (error) {
      console.warn('[meta/oauth] business portfolio fallback failed', error);
    }
  }

  return {
    pages,
    instagram: igMatch?.ig ?? null,
    instagramPage: igMatch?.page ?? null,
    source,
  };
}

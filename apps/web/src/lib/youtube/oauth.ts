/**
 * YouTube Data API v3 + Google OAuth helpers.
 */

import { appBaseUrl, youtubeEnv } from '@/lib/config/env';

export const YOUTUBE_OAUTH_STATE_COOKIE = 'clikd_youtube_oauth_state';

export const YOUTUBE_OAUTH_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.upload',
] as const;

export function getYouTubeCallbackUrl(requestOrigin?: string | null): string {
  return `${appBaseUrl(requestOrigin)}/api/auth/callback/youtube`;
}

export function buildYouTubeLoginUrl(
  state: string,
  requestOrigin?: string | null
): string {
  const clientId = youtubeEnv.googleClientId();
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID is not configured');

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', getYouTubeCallbackUrl(requestOrigin));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', YOUTUBE_OAUTH_SCOPES.join(' '));
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
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

export async function exchangeYouTubeCode(
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
      redirect_uri: getYouTubeCallbackUrl(requestOrigin),
      grant_type: 'authorization_code',
    }),
  });
  const data = (await res.json()) as GoogleTokenResponse & {
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'YouTube token exchange failed');
  }
  return data;
}

export type YouTubeChannel = {
  id: string;
  title: string;
  handle: string | null;
  avatarUrl: string | null;
  subscriberCount: number | null;
};

/** Fetch the authenticated user's YouTube channel (snippet + statistics). */
export async function fetchYouTubeChannel(
  accessToken: string
): Promise<YouTubeChannel | null> {
  const url = new URL('https://www.googleapis.com/youtube/v3/channels');
  url.searchParams.set('part', 'snippet,statistics');
  url.searchParams.set('mine', 'true');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await res.json()) as {
    items?: Array<{
      id: string;
      snippet?: {
        title?: string;
        customUrl?: string;
        thumbnails?: { default?: { url?: string }; medium?: { url?: string } };
      };
      statistics?: { subscriberCount?: string };
    }>;
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to fetch YouTube channel');
  }
  const item = data.items?.[0];
  if (!item?.id) return null;

  const custom = item.snippet?.customUrl?.trim();
  const handle = custom
    ? custom.startsWith('@')
      ? custom
      : `@${custom.replace(/^@/, '')}`
    : null;
  const subs = item.statistics?.subscriberCount
    ? Number(item.statistics.subscriberCount)
    : null;

  return {
    id: item.id,
    title: item.snippet?.title || 'YouTube Channel',
    handle,
    avatarUrl:
      item.snippet?.thumbnails?.medium?.url ||
      item.snippet?.thumbnails?.default?.url ||
      null,
    subscriberCount: Number.isFinite(subs) ? subs : null,
  };
}

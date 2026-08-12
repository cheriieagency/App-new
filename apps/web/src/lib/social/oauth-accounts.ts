/**
 * Generic OAuth social account persistence (YouTube, LinkedIn, etc.).
 * Delegates to shared persist helpers matching the live Supabase schema.
 */

import type { ConnectedSocialAccount, SocialPlatform } from '@/lib/mock-content-planner';
import {
  deleteSocialAccountRow,
  listLiveSocialAccountsForUser,
  upsertSocialAccountRow,
} from '@/lib/social/persist';

export type OAuthSocialPlatform = 'youtube' | 'linkedin' | 'tiktok' | 'instagram' | 'facebook';

export type UpsertOAuthSocialAccountInput = {
  userId: string;
  platform: OAuthSocialPlatform;
  externalId: string;
  handle?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  followersCount?: number | null;
  subscriberCount?: number | null;
  accessToken: string;
  refreshToken?: string | null;
  expiresIn?: number | null;
  companyUrl?: string | null;
  workspaceId?: string | null;
};

/** Upsert one OAuth-connected social account for the user. */
export async function upsertOAuthSocialAccount(
  input: UpsertOAuthSocialAccountInput
): Promise<ConnectedSocialAccount> {
  const name =
    input.displayName ||
    input.handle ||
    `${input.platform} account`;

  return upsertSocialAccountRow({
    userId: input.userId,
    platform: input.platform,
    platformUserId: input.externalId,
    platformUserName: name,
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    expiresIn: input.expiresIn,
    avatarUrl: input.avatarUrl,
    handle: input.handle,
    workspaceId: input.workspaceId,
    followersCount: input.subscriberCount ?? input.followersCount ?? null,
    meta: {
      subscriber_count: input.subscriberCount ?? null,
      followers_count: input.followersCount ?? null,
      company_url: input.companyUrl ?? null,
      refresh_token: input.refreshToken ?? null,
    },
  });
}

/** List YouTube / LinkedIn / TikTok rows for the user. */
export async function listOAuthSocialAccountsForUser(
  userId: string,
  platforms: OAuthSocialPlatform[] = ['youtube', 'linkedin', 'tiktok']
): Promise<ConnectedSocialAccount[]> {
  const all = await listLiveSocialAccountsForUser({ userId });
  return all.filter(
    (a) => a.connected && platforms.includes(a.platform as OAuthSocialPlatform)
  );
}

export async function deleteOAuthSocialAccount(input: {
  userId: string;
  platform: OAuthSocialPlatform;
  platformUserId: string;
}): Promise<{ deleted: boolean }> {
  return deleteSocialAccountRow({
    userId: input.userId,
    platform: input.platform,
    platformUserId: input.platformUserId,
  });
}

export async function deleteOAuthSocialPlatform(input: {
  userId: string;
  platform: OAuthSocialPlatform;
}): Promise<{ deleted: number }> {
  const result = await deleteSocialAccountRow({
    userId: input.userId,
    platform: input.platform,
  });
  return { deleted: result.deleted ? 1 : 0 };
}

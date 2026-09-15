/**
 * Refresh Pinterest display name / handle / avatar from the live user_account API.
 * Heals rows that were saved with opaque platform ids instead of @username.
 */

import sql from '@/app/api/utils/sql';
import {
  fetchPinterestUserAccount,
  resolvePinterestAccountIdentity,
} from '@/lib/pinterest/oauth';
import { getPinterestAccessTokenForWorkspace } from '@/lib/pinterest/tokens';
import type { ConnectedSocialAccount } from '@/lib/mock-content-planner';

/** True when a label looks like an opaque id rather than a Pinterest username. */
export function looksLikeOpaquePinterestId(value: string | null | undefined): boolean {
  if (!value) return true;
  const cleaned = value.replace(/^@/, '').trim();
  if (!cleaned) return true;
  if (cleaned === 'Pinterest account') return true;
  if (/^Pinterest\s+\w{4,}$/i.test(cleaned)) return true;
  // nanoid-ish / opaque tokens e.g. 06w46iaf23z1o7m4u0ya1f4jvsv10w
  if (/^[a-z0-9]{16,}$/i.test(cleaned) && !/[_\-.]/.test(cleaned)) return true;
  return false;
}

function needsPinterestIdentityHeal(account: ConnectedSocialAccount): boolean {
  if (account.platform !== 'pinterest' || !account.connected) return false;
  const name = account.display_name?.trim() || '';
  const handle = account.handle?.replace(/^@/, '').trim() || '';
  const external = (account.platform_user_id || account.external_id || '').trim();
  if (!handle || looksLikeOpaquePinterestId(handle)) return true;
  if (!name || looksLikeOpaquePinterestId(name)) return true;
  if (external && (name === external || handle === external)) return true;
  return false;
}

/** If the Pinterest chip shows an opaque id, refresh username from the API and persist. */
export async function healPinterestAccountIdentity(input: {
  userId: string;
  workspaceId: string;
  account: ConnectedSocialAccount;
}): Promise<ConnectedSocialAccount> {
  const { account } = input;
  if (!needsPinterestIdentityHeal(account)) return account;
  if (!process.env.DATABASE_URL?.trim()) return account;

  try {
    const accessToken = await getPinterestAccessTokenForWorkspace({
      userId: input.userId,
      workspaceId: input.workspaceId,
    });
    if (!accessToken) return account;

    const profile = await fetchPinterestUserAccount(accessToken);
    const identity = resolvePinterestAccountIdentity(profile);

    // Require a real username (or business name) before overwriting stored labels.
    if (!identity.username && !profile.business_name?.trim()) {
      console.warn(
        '[pinterest/heal-identity] user_account returned no username/business_name',
        { keys: Object.keys(profile || {}) }
      );
      return account;
    }

    await sql`
      UPDATE public.social_accounts
      SET
        platform_user_id = COALESCE(${identity.externalId || null}, platform_user_id),
        platform_user_name = ${identity.displayName},
        display_name = ${identity.displayName},
        handle = ${identity.handle},
        avatar_url = COALESCE(${identity.avatarUrl}, avatar_url),
        followers_count = COALESCE(${profile.follower_count ?? null}, followers_count),
        updated_at = now()
      WHERE user_id = ${input.userId}
        AND platform = 'pinterest'
        AND (
          workspace_id = ${input.workspaceId}
          OR workspace_id IS NULL
        )
    `;

    return {
      ...account,
      display_name: identity.displayName,
      handle: identity.handle,
      avatar_url: identity.avatarUrl || account.avatar_url,
      platform_user_id: identity.externalId || account.platform_user_id,
      external_id: identity.externalId || account.external_id,
      follower_count: profile.follower_count ?? account.follower_count,
    };
  } catch (error) {
    console.warn('[pinterest/heal-identity]', error);
    return account;
  }
}

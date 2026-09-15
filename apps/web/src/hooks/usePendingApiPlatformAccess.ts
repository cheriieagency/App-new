'use client';

/**
 * Client helper for platforms awaiting public API approval.
 * See `@/lib/config/pending-api-platforms` to unlock for everyone.
 */

import { useMemo } from 'react';
import { authClient } from '@/lib/auth-client';
import {
  canAccessPendingApiIntegrations,
  canAccessPendingApiPlatform,
  filterPendingApiPlatforms,
  type PendingApiPlatform,
} from '@/lib/config/pending-api-platforms';

export function usePendingApiPlatformAccess() {
  const { data: session } = authClient.useSession();
  const email = session?.user?.email ?? null;

  return useMemo(() => {
    const canAccessIntegrations = canAccessPendingApiIntegrations(email);
    return {
      email,
      /** True when YouTube / Pinterest / Google UI may be shown. */
      canAccessIntegrations,
      canAccessPlatform: (platform: string | null | undefined) =>
        canAccessPendingApiPlatform(email, platform),
      filterPlatforms: <T extends string>(platforms: readonly T[]) =>
        filterPendingApiPlatforms(email, platforms),
      showYouTube: canAccessPendingApiPlatform(email, 'youtube'),
      showPinterest: canAccessPendingApiPlatform(email, 'pinterest'),
      showGoogle: canAccessPendingApiPlatform(email, 'google'),
    };
  }, [email]);
}

export type { PendingApiPlatform };

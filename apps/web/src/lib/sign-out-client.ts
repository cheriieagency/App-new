'use client';

import { authClient } from '@/lib/auth-client';
import { clearPlatformRole } from '@/lib/use-platform-role';

/**
 * Clear platform role + Better Auth session, then hard-navigate so client
 * caches (React Query, useSession) cannot keep the user "logged in".
 */
export async function signOutAndRedirect(callbackUrl = '/'): Promise<void> {
  await clearPlatformRole();
  try {
    await authClient.signOut();
  } catch {
    // Still leave the app — cookies may already be cleared by a partial response.
  }
  if (typeof window !== 'undefined') {
    window.location.href = callbackUrl;
  }
}

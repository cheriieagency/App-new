/**
 * Shared helpers to resolve an active workspace the session user owns.
 * Never returns another user's workspace id.
 */

import {
  resolveWorkspaceForOAuthUser,
  userOwnsWorkspace,
  type WorkspaceAccessResult,
} from '@/lib/social/workspace-access';

/**
 * For API reads / OAuth binds: preferred cookie/state id if owned (or claimable),
 * otherwise the user's primary workspace / auto-created default.
 */
export async function resolveStrictUserWorkspace(input: {
  userId: string;
  preferredWorkspaceId?: string | null;
  email?: string | null;
}): Promise<WorkspaceAccessResult> {
  const userId = input.userId?.trim();
  if (!userId) {
    return { ok: false, status: 403, error: 'Unauthorized' };
  }

  const preferred =
    typeof input.preferredWorkspaceId === 'string'
      ? input.preferredWorkspaceId.trim()
      : '';

  if (preferred && (await userOwnsWorkspace(userId, preferred))) {
    return { ok: true, workspaceId: preferred };
  }

  return resolveWorkspaceForOAuthUser({
    userId,
    preferredWorkspaceId: preferred || null,
    email: input.email,
  });
}

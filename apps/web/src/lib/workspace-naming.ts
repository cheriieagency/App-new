/**
 * Resolve the display name for a newly created workspace / organization.
 * Prefer an explicit signup value; otherwise "[First Name]'s Workspace".
 */

export const PENDING_WORKSPACE_NAME_KEY = 'clikd_pending_workspace_name';

export function firstNameFromDisplayName(fullName?: string | null): string {
  const first = (fullName || '').trim().split(/\s+/)[0];
  return first || '';
}

export function resolveInitialWorkspaceName(input: {
  workspaceName?: string | null;
  userName?: string | null;
  email?: string | null;
}): string {
  const explicit = (input.workspaceName || '').trim();
  if (explicit) return explicit.slice(0, 80);

  const first = firstNameFromDisplayName(input.userName);
  if (first) return `${first}'s Workspace`;

  const handle = (input.email || '')
    .split('@')[0]
    ?.replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 24);
  if (handle) return `${handle}'s Workspace`;

  return 'My Workspace';
}

/** Stash signup workspace name for client-side seeding before session hydrates. */
export function stashPendingWorkspaceName(name: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = name.trim().slice(0, 80);
  if (!trimmed) return;
  try {
    sessionStorage.setItem(PENDING_WORKSPACE_NAME_KEY, trimmed);
    localStorage.setItem(PENDING_WORKSPACE_NAME_KEY, trimmed);
  } catch {
    /* ignore */
  }
}

export function peekPendingWorkspaceName(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return (
      sessionStorage.getItem(PENDING_WORKSPACE_NAME_KEY) ||
      localStorage.getItem(PENDING_WORKSPACE_NAME_KEY) ||
      null
    );
  } catch {
    return null;
  }
}

export function clearPendingWorkspaceName(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(PENDING_WORKSPACE_NAME_KEY);
    localStorage.removeItem(PENDING_WORKSPACE_NAME_KEY);
  } catch {
    /* ignore */
  }
}

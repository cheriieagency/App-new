/**
 * Platform access role — separates community members from creator/admin studio.
 * Persisted in the `clikd_platform_role` cookie after login (login portal tab).
 */

export type PlatformRole = 'member' | 'creator' | 'admin';

export const PLATFORM_ROLE_COOKIE = 'clikd_platform_role';

export function isCreatorRole(role: string | null | undefined): boolean {
  return role === 'creator' || role === 'admin';
}

export function normalizePlatformRole(value: unknown): PlatformRole {
  if (value === 'creator' || value === 'admin' || value === 'member') return value;
  return 'member';
}

/** Home route for a given platform role. */
export function homeForRole(role: PlatformRole): string {
  return isCreatorRole(role) ? '/admin' : '/dashboard';
}

/** Member-only app prefixes (creators are redirected away). */
export const MEMBER_ROUTE_PREFIXES = [
  '/dashboard',
  '/communities',
  '/events',
  '/classroom',
  '/live',
] as const;

/** Creator/admin-only studio prefixes (members are redirected away). */
export const CREATOR_ROUTE_PREFIXES = ['/admin', '/planner'] as const;

export function pathMatchesPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

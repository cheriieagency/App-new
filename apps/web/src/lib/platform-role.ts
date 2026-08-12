/**
 * Platform access role — separates community members from creator/admin studio.
 * Persisted in the `clikd_platform_role` cookie after login (login portal tab).
 *
 * Dual-access accounts may use both member and creator routes with the same
 * credentials. Dual flag is encoded in the role cookie as `member+dual` /
 * `creator+dual` so middleware never depends on a second cookie.
 */

export type PlatformRole = 'member' | 'creator' | 'admin';

export const PLATFORM_ROLE_COOKIE = 'clikd_platform_role';

/** Legacy dual flag cookie name (cleared on write; dual lives in the role cookie). */
export const LEGACY_DUAL_COOKIE = 'clikd_dual_access';

export { isDualAccessEmail, DUAL_ACCESS_EMAILS } from '@/lib/test-accounts';

export function isCreatorRole(role: string | null | undefined): boolean {
  return role === 'creator' || role === 'admin';
}

export function normalizePlatformRole(value: unknown): PlatformRole {
  if (value === 'creator' || value === 'admin' || value === 'member') return value;
  return 'member';
}

export type ParsedPlatformRoleCookie = {
  role: PlatformRole;
  dual: boolean;
};

/**
 * Parse role cookie. Supports:
 * - `member` / `creator` / `admin`
 * - `member+dual` / `creator+dual` (preferred dual encoding)
 * - legacy `clikd_dual_access=1` is handled by callers
 */
export function parsePlatformRoleCookie(
  value: string | null | undefined
): ParsedPlatformRoleCookie {
  if (!value) return { role: 'member', dual: false };
  const raw = value.trim().toLowerCase();
  const dual = raw.endsWith('+dual') || raw === 'admin';
  const base = raw.replace(/\+dual$/, '');
  if (base === 'admin') return { role: 'admin', dual: true };
  if (base === 'creator') return { role: 'creator', dual };
  if (base === 'member') return { role: 'member', dual };
  return { role: 'member', dual: false };
}

/** Serialize preferred home role + dual-access into one cookie value. */
export function serializePlatformRoleCookie(
  role: PlatformRole,
  dual: boolean
): string {
  const base = role === 'admin' ? 'creator' : role;
  if (dual) return `${base}+dual`;
  return base;
}

/** Home route for a given platform role. */
export function homeForRole(role: PlatformRole): string {
  return isCreatorRole(role) ? '/admin' : '/dashboard';
}

/** Member-only app prefixes (creators are redirected away — unless dual access). */
export const MEMBER_ROUTE_PREFIXES = [
  '/dashboard',
  '/communities',
  '/events',
  '/classroom',
  '/live',
] as const;

/** Creator/admin-only studio prefixes (members are redirected away — unless dual access). */
export const CREATOR_ROUTE_PREFIXES = ['/admin', '/planner'] as const;

export function pathMatchesPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

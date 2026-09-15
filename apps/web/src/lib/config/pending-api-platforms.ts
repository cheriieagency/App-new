/**
 * Platforms still awaiting public API approval (YouTube, Pinterest, Google).
 *
 * Until approvals land, these stay visible only for allowlisted staff accounts
 * (hello@clikd.app). Flip the unlock below — or set the env var — to show them
 * for every creator again.
 *
 * Unlock (pick ONE):
 *   1. Set PENDING_API_PLATFORMS_PUBLIC = true in this file, OR
 *   2. Set CLIKD_PENDING_API_PLATFORMS_PUBLIC=true in .env.local / production
 */

import { CLIKD_QA_ACCOUNT } from '@/lib/test-accounts';

/** Flip to `true` when YouTube / Pinterest / Google APIs are approved for all users. */
export const PENDING_API_PLATFORMS_PUBLIC = false;

/** Platforms gated behind the allowlist while approvals are pending. */
export const PENDING_API_PLATFORMS = [
  'youtube',
  'pinterest',
  'google',
] as const;

export type PendingApiPlatform = (typeof PENDING_API_PLATFORMS)[number];

/** Staff accounts that can still connect / see gated platforms. */
export const PENDING_API_ALLOWLIST_EMAILS = [
  CLIKD_QA_ACCOUNT.email, // hello@clikd.app
] as const;

function normalizeEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase();
}

function envUnlocksPendingApis(): boolean {
  const raw = process.env.CLIKD_PENDING_API_PLATFORMS_PUBLIC?.trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

/** True when gated platforms are available to every creator. */
export function arePendingApiPlatformsPublic(): boolean {
  return PENDING_API_PLATFORMS_PUBLIC || envUnlocksPendingApis();
}

export function isPendingApiPlatform(
  platform: string | null | undefined
): platform is PendingApiPlatform {
  if (!platform) return false;
  return (PENDING_API_PLATFORMS as readonly string[]).includes(platform);
}

/** Can this user see / connect a platform that is still pending API approval? */
export function canAccessPendingApiPlatform(
  email: string | null | undefined,
  platform: string | null | undefined
): boolean {
  if (!isPendingApiPlatform(platform)) return true;
  if (arePendingApiPlatformsPublic()) return true;
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return (PENDING_API_ALLOWLIST_EMAILS as readonly string[]).includes(normalized);
}

/** Drop pending platforms from a list unless the user is allowlisted / unlocked. */
export function filterPendingApiPlatforms<T extends string>(
  email: string | null | undefined,
  platforms: readonly T[]
): T[] {
  if (arePendingApiPlatformsPublic()) return [...platforms];
  return platforms.filter((platform) => canAccessPendingApiPlatform(email, platform));
}

/** Convenience: does this user get any of the gated integrations? */
export function canAccessPendingApiIntegrations(
  email: string | null | undefined
): boolean {
  if (arePendingApiPlatformsPublic()) return true;
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return (PENDING_API_ALLOWLIST_EMAILS as readonly string[]).includes(normalized);
}

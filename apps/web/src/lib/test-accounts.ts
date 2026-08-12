/**
 * Built-in test / VIP accounts for local + staging QA.
 * Dual-access = member dashboard + creator admin with one login.
 * Pro unlock = always Pro entitlements (no payment wall).
 */

export const CLIKD_QA_ACCOUNT = {
  email: 'hello@clikd.app',
  password: 'Test1234!',
  name: 'Clikd QA',
} as const;

/** Same credentials work for Community (member) and Creator/Admin studio. */
export const DUAL_ACCESS_EMAILS = [
  'ebbabrobeck@test.se',
  CLIKD_QA_ACCOUNT.email,
] as const;

/** Always treated as Pro — FeatureGate / plan-guard never block upgrades. */
export const PRO_UNLOCK_EMAILS = [CLIKD_QA_ACCOUNT.email] as const;

function normalizeEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase();
}

export function isDualAccessEmail(email: string | null | undefined): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return (DUAL_ACCESS_EMAILS as readonly string[]).includes(normalized);
}

export function isProUnlockedEmail(email: string | null | undefined): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return (PRO_UNLOCK_EMAILS as readonly string[]).includes(normalized);
}

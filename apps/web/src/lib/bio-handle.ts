/**
 * Shared link-in-bio handle normalization + client/server validation.
 */

export const BIO_HANDLE_MIN = 3;
export const BIO_HANDLE_MAX = 30;

/** Platform / routing reserved handles — never claimable on /bio/{handle}. */
export const BIO_RESERVED_HANDLES = new Set([
  'admin',
  'api',
  'app',
  'bio',
  'clikd',
  'community',
  'communities',
  'dashboard',
  'help',
  'home',
  'login',
  'logout',
  'null',
  'onboarding',
  'pricing',
  'r',
  'settings',
  'signup',
  'support',
  'undefined',
  'waitlist',
  'www',
]);

export type BioHandleReason =
  | 'empty'
  | 'too_short'
  | 'too_long'
  | 'invalid'
  | 'reserved'
  | 'available'
  | 'taken'
  | 'own';

/** Strip @, lowercase, keep a-z 0-9 . _ - */
export function normalizeBioHandle(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '');
}

/** Local format check before hitting the availability API. */
export function validateBioHandleFormat(raw: string): {
  handle: string;
  ok: boolean;
  reason: BioHandleReason;
} {
  const handle = normalizeBioHandle(raw);
  if (!handle) return { handle, ok: false, reason: 'empty' };
  if (handle.length < BIO_HANDLE_MIN) {
    return { handle, ok: false, reason: 'too_short' };
  }
  if (handle.length > BIO_HANDLE_MAX) {
    return { handle, ok: false, reason: 'too_long' };
  }
  if (!/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$|^[a-z0-9]$/.test(handle)) {
    return { handle, ok: false, reason: 'invalid' };
  }
  if (BIO_RESERVED_HANDLES.has(handle)) {
    return { handle, ok: false, reason: 'reserved' };
  }
  return { handle, ok: true, reason: 'available' };
}

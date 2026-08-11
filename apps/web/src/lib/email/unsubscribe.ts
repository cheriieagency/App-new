/**
 * Unsubscribe token helpers for GDPR List-Unsubscribe links.
 * Token format: base64url(email).base64url(hmac)
 */

import { createHmac, timingSafeEqual } from 'crypto';

function secret(): string {
  return (
    process.env.RESEND_API_KEY?.trim() ||
    process.env.BETTER_AUTH_SECRET?.trim() ||
    'clikd-dev-unsubscribe-secret'
  );
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromB64url(input: string): string {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(normalized, 'base64').toString('utf8');
}

function fromB64urlBuf(input: string): Buffer {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(normalized, 'base64');
}

function sign(email: string): Buffer {
  return createHmac('sha256', secret()).update(email.toLowerCase().trim()).digest();
}

/** Build a signed unsubscribe token for an email address. */
export function createUnsubscribeToken(email: string): string {
  const normalized = email.toLowerCase().trim();
  return `${b64url(normalized)}.${b64url(sign(normalized))}`;
}

/** Validate token and return the email, or null if invalid. */
export function verifyUnsubscribeToken(token: string): string | null {
  const [emailPart, sigPart] = token.split('.');
  if (!emailPart || !sigPart) return null;
  try {
    const email = fromB64url(emailPart).toLowerCase().trim();
    const expected = sign(email);
    const actual = fromB64urlBuf(sigPart);
    if (expected.length !== actual.length) return null;
    if (!timingSafeEqual(expected, actual)) return null;
    return email;
  } catch {
    return null;
  }
}

/** Absolute unsubscribe URL for List-Unsubscribe + footer links. */
export function buildUnsubscribeUrl(email: string, origin = 'https://clikd.app'): string {
  const token = createUnsubscribeToken(email);
  const base = origin.replace(/\/$/, '');
  return `${base}/unsubscribe?token=${encodeURIComponent(token)}`;
}

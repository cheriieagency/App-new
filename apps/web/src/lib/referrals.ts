/**
 * Member Ref & Earn — cookie capture + server-side attribution.
 * Invite links: https://clikd.app/?ref=CODE
 */

import { cookies } from 'next/headers';
import sql from '@/app/api/utils/sql';
import { absoluteUrl } from '@/lib/site';

export const REFERRAL_COOKIE = 'clikd_ref';
/** Keep attribution across signup → first join (30 days). */
export const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

const CODE_RE = /^[a-z0-9][a-z0-9_-]{1,31}$/i;

export function sanitizeReferralCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const code = raw.trim();
  if (!CODE_RE.test(code)) return null;
  return code.toLowerCase();
}

/** Public invite URL for a member's code. */
export function referralInviteUrl(code: string, origin?: string): string {
  const clean = sanitizeReferralCode(code) || code.trim();
  if (origin) {
    const base = origin.replace(/\/$/, '');
    return `${base}/?ref=${encodeURIComponent(clean)}`;
  }
  return absoluteUrl(`/?ref=${encodeURIComponent(clean)}`);
}

/** Build Set-Cookie header value for middleware / route handlers. */
export function referralCookieHeader(code: string): string {
  const safe = sanitizeReferralCode(code) || code.trim().toLowerCase();
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${REFERRAL_COOKIE}=${encodeURIComponent(safe)}; Path=/; Max-Age=${REFERRAL_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

export function clearReferralCookieHeader(): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${REFERRAL_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

/** Read pending referral code from the request cookie jar (App Router). */
export async function readReferralCookie(): Promise<string | null> {
  try {
    const jar = await cookies();
    return sanitizeReferralCode(jar.get(REFERRAL_COOKIE)?.value);
  } catch {
    return null;
  }
}

let schemaReady = false;

/** Additive healer — durable schema still lives in the checked-in migration. */
export async function ensureReferralsSchema(): Promise<void> {
  if (schemaReady || !process.env.DATABASE_URL?.trim()) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS referrals (
        id                    serial PRIMARY KEY,
        user_id               text NOT NULL UNIQUE,
        referral_code         text NOT NULL UNIQUE,
        total_invites         integer NOT NULL DEFAULT 0,
        earned_commission_sek numeric(12, 2) NOT NULL DEFAULT 0,
        bonus_xp              integer NOT NULL DEFAULT 0,
        created_at            timestamptz NOT NULL DEFAULT now(),
        updated_at            timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS referral_uses (
        id                serial PRIMARY KEY,
        referral_code     text NOT NULL,
        used_by_email     text NOT NULL,
        product_name      text,
        purchase_amount   numeric(12, 2) NOT NULL DEFAULT 0,
        commission_earned numeric(12, 2) NOT NULL DEFAULT 0,
        created_at        timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS referral_uses_code_email_uidx
      ON referral_uses (referral_code, used_by_email)
    `;
    schemaReady = true;
  } catch (err) {
    console.warn('[referrals] ensureReferralsSchema failed', err);
  }
}

export type AttributeReferralInput = {
  referralCode?: string | null;
  usedByEmail: string;
  /** Skip if the referred user is the code owner. */
  usedByUserId?: string | null;
  productName?: string | null;
  purchaseAmount?: number | null;
};

export type AttributeReferralResult =
  | { ok: true; attributed: true; commission: number; referral_code: string }
  | { ok: true; attributed: false; reason: string }
  | { ok: false; error: string };

/**
 * Record a referral use once per (code, email).
 * Free joins use purchaseAmount 0 (invite counted, commission 0).
 * Paid joins/purchases pass the SEK amount (15% commission).
 */
export async function attributeReferralUse(
  input: AttributeReferralInput
): Promise<AttributeReferralResult> {
  if (!process.env.DATABASE_URL?.trim()) {
    return { ok: true, attributed: false, reason: 'no_database' };
  }

  const email = String(input.usedByEmail || '')
    .trim()
    .toLowerCase();
  if (!email || !email.includes('@')) {
    return { ok: true, attributed: false, reason: 'missing_email' };
  }

  const code =
    sanitizeReferralCode(input.referralCode) || (await readReferralCookie());
  if (!code) {
    return { ok: true, attributed: false, reason: 'no_code' };
  }

  await ensureReferralsSchema();

  try {
    const refs = await sql`
      SELECT user_id, referral_code FROM referrals WHERE lower(referral_code) = ${code}
      LIMIT 1
    `;
    const owner = refs?.[0] as { user_id?: string; referral_code?: string } | undefined;
    if (!owner?.referral_code) {
      return { ok: true, attributed: false, reason: 'invalid_code' };
    }

    // Block self-referral.
    if (input.usedByUserId && owner.user_id === input.usedByUserId) {
      return { ok: true, attributed: false, reason: 'self_referral' };
    }

    const amount = Math.max(0, Number(input.purchaseAmount) || 0);
    const commission = Math.round(amount * 0.15 * 100) / 100;
    const xpBonus = 50;
    const productName = input.productName?.trim() || null;
    const canonical = String(owner.referral_code);

    const inserted = await sql`
      INSERT INTO referral_uses (
        referral_code, used_by_email, product_name, purchase_amount, commission_earned
      )
      VALUES (
        ${canonical},
        ${email},
        ${productName},
        ${amount},
        ${commission}
      )
      ON CONFLICT (referral_code, used_by_email) DO NOTHING
      RETURNING id
    `;

    if (!Array.isArray(inserted) || inserted.length === 0) {
      return { ok: true, attributed: false, reason: 'already_attributed' };
    }

    await sql`
      UPDATE referrals
      SET
        total_invites = total_invites + 1,
        earned_commission_sek = earned_commission_sek + ${commission},
        bonus_xp = bonus_xp + ${xpBonus},
        updated_at = now()
      WHERE referral_code = ${canonical}
    `;

    return {
      ok: true,
      attributed: true,
      commission,
      referral_code: canonical,
    };
  } catch (err) {
    console.error('[referrals] attributeReferralUse failed', err);
    return { ok: false, error: 'attribution_failed' };
  }
}

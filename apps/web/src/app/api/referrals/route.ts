import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers, cookies } from 'next/headers';
import {
  REFERRAL_COOKIE,
  attributeReferralUse,
  ensureReferralsSchema,
  sanitizeReferralCode,
} from '@/lib/referrals';

/** URL-safe referral code from display name + random suffix. */
function generateCode(name: string): string {
  const base = name
    .toLowerCase()
    .split(' ')[0]
    ?.replace(/[^a-z0-9]/g, '') || 'member';
  const suffix = Math.floor(Math.random() * 900 + 100);
  return `${base}${suffix}`;
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json({ error: 'Database required' }, { status: 503 });
  }

  try {
    await ensureReferralsSchema();

    const existing = await sql`
      SELECT * FROM referrals WHERE user_id = ${session.user.id}
    `;
    if (existing.length > 0) {
      return Response.json(existing[0]);
    }

    let code = generateCode(session.user.name ?? 'member');
    const collision = await sql`
      SELECT id FROM referrals WHERE lower(referral_code) = ${code.toLowerCase()}
    `;
    if (collision.length > 0) {
      code = `${code}${Math.floor(Math.random() * 90 + 10)}`;
    }

    const result = await sql`
      INSERT INTO referrals (user_id, referral_code, total_invites, earned_commission_sek, bonus_xp)
      VALUES (${session.user.id}, ${code}, 0, 0, 0)
      RETURNING *
    `;
    return Response.json(result[0]);
  } catch (error) {
    console.error('[GET /api/referrals]', error);
    return Response.json({ error: 'Failed to get referral info' }, { status: 500 });
  }
}

/**
 * Record an attributed referral use.
 * Prefer calling attributeReferralUse from join/purchase routes (cookie-aware).
 * This endpoint remains for explicit client/server attribution.
 */
export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL?.trim()) {
      return Response.json({ error: 'Database required' }, { status: 503 });
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const fromBody = sanitizeReferralCode(body.referral_code);
    const jar = await cookies();
    const fromCookie = sanitizeReferralCode(jar.get(REFERRAL_COOKIE)?.value);
    const referral_code = fromBody || fromCookie;

    const used_by_email = String(body.used_by_email ?? '').trim().toLowerCase();
    const product_name =
      typeof body.product_name === 'string' ? body.product_name : null;
    const purchase_amount = Number(body.purchase_amount ?? 0);

    if (!referral_code || !used_by_email) {
      return Response.json({ error: 'Missing fields' }, { status: 400 });
    }

    const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);

    const result = await attributeReferralUse({
      referralCode: referral_code,
      usedByEmail: used_by_email,
      usedByUserId: session?.user?.id ?? null,
      productName: product_name,
      purchaseAmount: Number.isFinite(purchase_amount) ? purchase_amount : 0,
    });

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 500 });
    }

    // Clear cookie after a successful first attribution so we don't double-count later.
    if (result.attributed) {
      jar.set(REFERRAL_COOKIE, '', { path: '/', maxAge: 0 });
    }

    return Response.json(result);
  } catch (error) {
    console.error('[POST /api/referrals]', error);
    return Response.json({ error: 'Failed to record referral' }, { status: 500 });
  }
}

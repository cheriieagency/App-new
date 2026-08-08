import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// Generate a URL-safe referral code from a name
function generateCode(name: string): string {
  const base = name
    .toLowerCase()
    .split(' ')[0]
    .replace(/[^a-z0-9]/g, '');
  const suffix = Math.floor(Math.random() * 900 + 100); // 3-digit random
  return base || `creator${suffix}`;
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const existing = await sql`
      SELECT * FROM referrals WHERE user_id = ${session.user.id}
    `;

    if (existing.length > 0) {
      return Response.json(existing[0]);
    }

    // Create a new referral record
    let code = generateCode(session.user.name ?? 'creator');

    // Ensure uniqueness
    const collision = await sql`SELECT id FROM referrals WHERE referral_code = ${code}`;
    if (collision.length > 0) {
      code = code + Math.floor(Math.random() * 90 + 10);
    }

    const result = await sql`
      INSERT INTO referrals (user_id, referral_code, total_invites, earned_commission_sek, bonus_xp)
      VALUES (${session.user.id}, ${code}, 0, 0, 0)
      RETURNING *
    `;
    return Response.json(result[0]);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to get referral info' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { referral_code, used_by_email, product_name, purchase_amount } = await request.json();
    if (!referral_code || !used_by_email) {
      return Response.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Find referral record
    const ref = await sql`SELECT * FROM referrals WHERE referral_code = ${referral_code}`;
    if (ref.length === 0) {
      return Response.json({ error: 'Invalid referral code' }, { status: 404 });
    }

    const commission = Number(purchase_amount) * 0.15;
    const xpBonus = 50;

    // Record the use
    await sql`
      INSERT INTO referral_uses (referral_code, used_by_email, product_name, purchase_amount, commission_earned)
      VALUES (${referral_code}, ${used_by_email}, ${product_name ?? null}, ${Number(purchase_amount)}, ${commission})
    `;

    // Update the referrer's stats
    await sql`
      UPDATE referrals
      SET
        total_invites = total_invites + 1,
        earned_commission_sek = earned_commission_sek + ${commission},
        bonus_xp = bonus_xp + ${xpBonus}
      WHERE referral_code = ${referral_code}
    `;

    return Response.json({ success: true, commission });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to record referral' }, { status: 500 });
  }
}

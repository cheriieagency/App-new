import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';
import { shouldUseDemoAuth } from '@/lib/auth-env';
import { EMMA_MOULINE_ACCOUNT } from '@/lib/test-accounts';

/**
 * GET /api/seed-emma
 * Creates emma@moulinestudios.com — dual admin+community + Pro (no payment).
 */
export async function GET() {
  const { email, password, name } = EMMA_MOULINE_ACCOUNT;

  try {
    let userId: string | null = null;

    if (!shouldUseDemoAuth() && process.env.DATABASE_URL?.trim()) {
      try {
        const existing = await sql`
          SELECT id FROM "user" WHERE lower(email) = ${email.toLowerCase()} LIMIT 1
        `;
        if (Array.isArray(existing) && existing[0]?.id) {
          userId = String(existing[0].id);
        }
      } catch (error) {
        console.warn('[seed-emma] lookup skipped', error);
      }
    }

    if (!userId) {
      try {
        const result = await auth.api.signUpEmail({
          body: { email, password, name },
        });
        userId = result?.user?.id ? String(result.user.id) : null;
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'signUpEmail failed';
        if (!/already|exists|unique/i.test(message)) {
          throw error;
        }
        // Fall through — resolve id from DB below.
      }
    }

    if (!shouldUseDemoAuth() && process.env.DATABASE_URL?.trim()) {
      const rows = await sql`
        SELECT id FROM "user" WHERE lower(email) = ${email.toLowerCase()} LIMIT 1
      `;
      if (Array.isArray(rows) && rows[0]?.id) {
        userId = String(rows[0].id);
      }

      if (userId) {
        // Creator/admin role + Pro plan on profiles (no Stripe / payment).
        await sql`
          INSERT INTO profiles (
            id, email, display_name, role,
            subscription_status, subscription_plan,
            onboarding_completed, is_onboarded, updated_at
          )
          VALUES (
            ${userId},
            ${email},
            ${name},
            'admin',
            'active',
            'pro',
            true,
            true,
            now()
          )
          ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
            role = 'admin',
            subscription_status = 'active',
            subscription_plan = 'pro',
            onboarding_completed = true,
            is_onboarded = true,
            updated_at = now()
        `;
      }
    }

    return Response.json({
      success: true,
      userId,
      dual_access: true,
      plan: 'pro',
      role: 'admin',
      login: { email, password },
      message:
        'Emma account ready. Sign in as Member (community) or Creator/Admin — Pro unlocked, no payment.',
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to seed Emma account';
    return Response.json({ success: false, message }, { status: 500 });
  }
}

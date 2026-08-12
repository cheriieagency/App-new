import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';
import { shouldUseDemoAuth } from '@/lib/auth-env';
import { CLIKD_QA_ACCOUNT } from '@/lib/test-accounts';

/**
 * GET /api/seed-clikd-qa
 * Creates (or resets) hello@clikd.app — dual member+creator access + Pro unlock.
 */
export async function GET() {
  const { email, password, name } = CLIKD_QA_ACCOUNT;

  try {
    if (!shouldUseDemoAuth() && process.env.DATABASE_URL?.trim()) {
      // Wipe existing account so password stays in sync with the QA credentials.
      try {
        await sql`DELETE FROM "user" WHERE email = ${email}`;
      } catch (error) {
        console.warn('[seed-clikd-qa] delete existing user skipped', error);
      }
    }

    const result = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
    });

    return Response.json({
      success: true,
      user: result?.user ?? null,
      dual_access: true,
      plan: 'pro',
      login: { email, password },
      message:
        'QA account ready. Sign in as Member or Creator — Pro is unlocked with no payment wall.',
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to seed QA account';
    // Already exists — treat as success for idempotent seeding.
    if (/already|exists|unique/i.test(message)) {
      return Response.json({
        success: true,
        existed: true,
        dual_access: true,
        plan: 'pro',
        login: { email, password },
        message: 'QA account already exists. Use the credentials below.',
      });
    }
    return Response.json({ success: false, message }, { status: 500 });
  }
}

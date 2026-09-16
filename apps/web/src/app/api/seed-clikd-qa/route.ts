import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';
import { shouldUseDemoAuth } from '@/lib/auth-env';
import { CLIKD_QA_ACCOUNT } from '@/lib/test-accounts';
import {
  ensureClikdInsidersCommunity,
  enrollUserInClikdInsiders,
} from '@/lib/communities/insiders';

/**
 * GET /api/seed-clikd-qa
 * Creates (or resets) hello@clikd.app — dual member+creator access + Pro unlock.
 * Also ensures Clikd Insiders exists with hello@ as owner/admin.
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

    const userId = result?.user?.id ? String(result.user.id) : null;
    if (userId && process.env.DATABASE_URL?.trim()) {
      await ensureClikdInsidersCommunity();
      await enrollUserInClikdInsiders({
        userId,
        email,
        name,
      });
    }

    return Response.json({
      success: true,
      user: result?.user ?? null,
      dual_access: true,
      plan: 'pro',
      login: { email, password },
      clikd_insiders_admin: true,
      message:
        'QA account ready. Sign in as Member or Creator — Pro is unlocked with no payment wall. hello@clikd.app owns Clikd Insiders.',
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to seed QA account';
    // Already exists — treat as success for idempotent seeding.
    if (/already|exists|unique/i.test(message)) {
      if (process.env.DATABASE_URL?.trim()) {
        try {
          const rows = await sql`
            SELECT id, name FROM "user"
            WHERE lower(trim(email)) = ${email.toLowerCase()}
            LIMIT 1
          `;
          const existingId = rows?.[0]?.id ? String(rows[0].id) : null;
          if (existingId) {
            await ensureClikdInsidersCommunity();
            await enrollUserInClikdInsiders({
              userId: existingId,
              email,
              name: rows?.[0]?.name ? String(rows[0].name) : name,
            });
          }
        } catch (insidersError) {
          console.warn('[seed-clikd-qa] insiders bootstrap skipped', insidersError);
        }
      }
      return Response.json({
        success: true,
        existed: true,
        dual_access: true,
        plan: 'pro',
        login: { email, password },
        clikd_insiders_admin: true,
        message:
          'QA account already exists. Use the credentials below. hello@clikd.app owns Clikd Insiders.',
      });
    }
    return Response.json({ success: false, message }, { status: 500 });
  }
}

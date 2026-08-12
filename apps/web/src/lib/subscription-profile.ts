/**
 * Persist workspace subscription entitlements on public.profiles
 * so Vercel serverless instances don't reset to in-memory 'starter'.
 */

import sql from '@/app/api/utils/sql';
import type { WorkspacePlan } from '@/lib/config/plans';
import { normalizeWorkspacePlan } from '@/lib/config/plans';
import { isProUnlockedEmail } from '@/lib/test-accounts';

export type ProfileSubscription = {
  plan: WorkspacePlan;
  subscription_status: string;
  subscription_plan: string;
  onboarding_completed: boolean;
  email: string | null;
  pro_unlocked: boolean;
};

const ACTIVE_STATUSES = new Set(['active', 'trialing']);

let schemaReady: Promise<void> | null = null;

export async function ensureSubscriptionSchema(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    await sql`
      ALTER TABLE public.profiles
        ADD COLUMN IF NOT EXISTS subscription_status text,
        ADD COLUMN IF NOT EXISTS subscription_plan text,
        ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS email text,
        ADD COLUMN IF NOT EXISTS full_name text
    `;
  })().catch((error) => {
    schemaReady = null;
    console.warn('[subscription-profile] schema ensure skipped', error);
  });
  return schemaReady;
}

function planFromRow(raw: Record<string, unknown> | null | undefined): WorkspacePlan {
  if (!raw) return 'starter';
  const fromPlan = normalizeWorkspacePlan(
    String(raw.subscription_plan || raw.plan || 'starter')
  );
  return fromPlan;
}

/** Read subscription for a user id (Better Auth user.id = profiles.id). */
export async function getProfileSubscription(input: {
  userId: string;
  email?: string | null;
}): Promise<ProfileSubscription> {
  const email = (input.email ?? '').trim().toLowerCase() || null;
  const proByEmail = isProUnlockedEmail(email);

  if (!process.env.DATABASE_URL?.trim()) {
    return {
      plan: proByEmail ? 'pro' : 'starter',
      subscription_status: proByEmail ? 'active' : 'inactive',
      subscription_plan: proByEmail ? 'pro' : 'starter',
      onboarding_completed: proByEmail,
      email,
      pro_unlocked: proByEmail,
    };
  }

  await ensureSubscriptionSchema();

  try {
    // Keep profiles.email in sync with the auth user for SQL unlocks / admin tooling.
    if (email) {
      await sql`
        INSERT INTO profiles (id, email, display_name, subscription_status, subscription_plan, onboarding_completed)
        VALUES (
          ${input.userId},
          ${email},
          ${email.split('@')[0]},
          ${proByEmail ? 'active' : null},
          ${proByEmail ? 'pro' : null},
          ${proByEmail}
        )
        ON CONFLICT (id) DO UPDATE SET
          email = COALESCE(EXCLUDED.email, profiles.email),
          updated_at = now()
      `;
    }

    const rows = await sql`
      SELECT email, subscription_status, subscription_plan, onboarding_completed
      FROM profiles
      WHERE id = ${input.userId}
      LIMIT 1
    `;
    const row = Array.isArray(rows)
      ? (rows[0] as Record<string, unknown> | undefined)
      : undefined;

    const status = String(row?.subscription_status || '').toLowerCase();
    const dbPlan = planFromRow(row);
    const active =
      ACTIVE_STATUSES.has(status) ||
      dbPlan === 'pro' ||
      dbPlan === 'creator' ||
      proByEmail;

    const plan: WorkspacePlan = proByEmail
      ? 'pro'
      : ACTIVE_STATUSES.has(status) || dbPlan !== 'starter'
        ? dbPlan
        : 'starter';

    return {
      plan,
      subscription_status: proByEmail
        ? 'active'
        : status || (active ? 'active' : 'inactive'),
      subscription_plan: plan,
      onboarding_completed: Boolean(row?.onboarding_completed) || proByEmail,
      email: (row?.email as string) || email,
      pro_unlocked: proByEmail || plan === 'pro',
    };
  } catch (error) {
    console.warn('[subscription-profile] read failed', error);
    return {
      plan: proByEmail ? 'pro' : 'starter',
      subscription_status: proByEmail ? 'active' : 'inactive',
      subscription_plan: proByEmail ? 'pro' : 'starter',
      onboarding_completed: proByEmail,
      email,
      pro_unlocked: proByEmail,
    };
  }
}

/** Persist plan + status for the authenticated user. */
export async function setProfileSubscription(input: {
  userId: string;
  email?: string | null;
  plan: WorkspacePlan;
  status?: string;
  onboardingCompleted?: boolean;
}): Promise<ProfileSubscription> {
  await ensureSubscriptionSchema();
  const status = input.status ?? 'active';
  const email = (input.email ?? '').trim().toLowerCase() || null;

  if (!process.env.DATABASE_URL?.trim()) {
    return {
      plan: input.plan,
      subscription_status: status,
      subscription_plan: input.plan,
      onboarding_completed: Boolean(input.onboardingCompleted),
      email,
      pro_unlocked: input.plan === 'pro' || isProUnlockedEmail(email),
    };
  }

  await sql`
    INSERT INTO profiles (
      id,
      email,
      display_name,
      subscription_status,
      subscription_plan,
      onboarding_completed
    )
    VALUES (
      ${input.userId},
      ${email},
      ${email ? email.split('@')[0] : 'Creator'},
      ${status},
      ${input.plan},
      ${input.onboardingCompleted ?? true}
    )
    ON CONFLICT (id) DO UPDATE SET
      email = COALESCE(EXCLUDED.email, profiles.email),
      subscription_status = EXCLUDED.subscription_status,
      subscription_plan = EXCLUDED.subscription_plan,
      onboarding_completed = EXCLUDED.onboarding_completed,
      updated_at = now()
  `;

  return getProfileSubscription({ userId: input.userId, email });
}

export function isSubscriptionEntitled(status: string | null | undefined): boolean {
  return ACTIVE_STATUSES.has(String(status || '').toLowerCase());
}

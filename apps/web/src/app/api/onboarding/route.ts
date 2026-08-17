import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';
import {
  getDemoOnboarding,
  saveDemoOnboarding,
  type OnboardingPayload,
} from '@/lib/mock-onboarding';
import { createDefaultWorkspaceForUser } from '@/lib/social/workspace-access';
import { resolveInitialWorkspaceName } from '@/lib/workspace-naming';

const ROLE_CATEGORIES = [
  'creator',
  'educator',
  'coach',
  'agency',
  'brand',
  'other',
] as const;

const USE_CASES = [
  'bio_storefront',
  'community',
  'courses',
  'social_planner',
  'email_crm',
  'events_live',
  'digital_products',
] as const;

function parsePayload(body: unknown): OnboardingPayload | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'Invalid JSON body' };
  const b = body as Record<string, unknown>;

  const full_name = String(b.full_name ?? '').trim();
  const role_category = String(b.role_category ?? '').trim();
  const referral_source = String(b.referral_source ?? '').trim();
  const brand_name = String(b.brand_name ?? '').trim();
  const workspace_name = String(b.workspace_name ?? b.workspaceName ?? '').trim();
  const brand_website = String(b.brand_website ?? '').trim();
  const team_size = String(b.team_size ?? '').trim();

  const primary_use_cases = Array.isArray(b.primary_use_cases)
    ? b.primary_use_cases.map((x) => String(x).trim()).filter(Boolean)
    : [];

  if (!full_name || full_name.length < 2) {
    return { error: 'full_name is required' };
  }
  if (!role_category) {
    return { error: 'role_category is required' };
  }
  if (primary_use_cases.length === 0) {
    return { error: 'Select at least one use case' };
  }
  if (!referral_source) {
    return { error: 'referral_source is required' };
  }

  return {
    full_name,
    role_category,
    primary_use_cases,
    referral_source,
    brand_name: brand_name || workspace_name,
    workspace_name: workspace_name || brand_name,
    brand_website,
    team_size: team_size || 'solo',
  };
}

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  return session;
}

/** GET — current onboarding status for the signed-in user. */
export async function GET() {
  const session = await requireSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  if (!process.env.DATABASE_URL?.trim()) {
    const demo = getDemoOnboarding(userId);
    return Response.json({
      completed: Boolean(demo?.onboarding_completed),
      profile: demo,
      demo: true,
    });
  }

  try {
    const rows = await sql`
      SELECT
        id,
        full_name,
        display_name,
        role_category,
        primary_use_cases,
        referral_source,
        brand_name,
        brand_website,
        team_size,
        COALESCE(onboarding_completed, is_onboarded, false) AS onboarding_completed
      FROM profiles
      WHERE id = ${userId}
      LIMIT 1
    `;
    const profile = Array.isArray(rows) && rows[0] ? rows[0] : null;
    return Response.json({
      completed: Boolean(profile && (profile as { onboarding_completed?: boolean }).onboarding_completed),
      profile,
      demo: false,
    });
  } catch (error) {
    console.error('[onboarding GET]', error);
    const demo = getDemoOnboarding(userId);
    return Response.json({
      completed: Boolean(demo?.onboarding_completed),
      profile: demo,
      demo: true,
      fallback: true,
    });
  }
}

/**
 * POST /api/onboarding
 * Authenticates via better-auth session (Postgres / Supabase-compatible DATABASE_URL).
 * Updates profiles + inserts user_onboarding_responses.
 */
export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = parsePayload(body);
  if ('error' in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const userId = session.user.id;
  const payload = parsed;
  const userMeta = session.user as {
    workspaceName?: string | null;
    name?: string | null;
    email?: string | null;
  };
  const workspaceDisplayName = resolveInitialWorkspaceName({
    workspaceName:
      payload.workspace_name ||
      payload.brand_name ||
      userMeta.workspaceName,
    userName: payload.full_name || userMeta.name,
    email: userMeta.email || session.user.email,
  });

  // Demo / local — no Postgres
  if (!process.env.DATABASE_URL?.trim()) {
    const saved = saveDemoOnboarding(userId, {
      ...payload,
      brand_name: workspaceDisplayName,
    });
    return Response.json({
      ok: true,
      demo: true,
      profile: saved.profile,
      response: saved.response,
      workspace_name: workspaceDisplayName,
      redirect: '/admin',
    });
  }

  try {
    // Ensure profile row exists (better-auth trigger may already create it).
    await sql`
      INSERT INTO profiles (id, display_name, full_name, role)
      VALUES (${userId}, ${payload.full_name}, ${payload.full_name}, 'creator')
      ON CONFLICT (id) DO NOTHING
    `;

    const updated = await sql`
      UPDATE profiles SET
        full_name = ${payload.full_name},
        display_name = COALESCE(NULLIF(display_name, ''), ${payload.full_name}),
        role_category = ${payload.role_category},
        primary_use_cases = ${payload.primary_use_cases},
        referral_source = ${payload.referral_source},
        brand_name = ${workspaceDisplayName || null},
        brand_website = ${payload.brand_website || null},
        team_size = ${payload.team_size},
        onboarding_completed = true,
        is_onboarded = true,
        role = CASE
          WHEN role = 'member' THEN 'creator'
          ELSE role
        END,
        updated_at = now()
      WHERE id = ${userId}
      RETURNING
        id,
        full_name,
        display_name,
        role_category,
        primary_use_cases,
        referral_source,
        brand_name,
        brand_website,
        team_size,
        onboarding_completed
    `;

    const history = await sql`
      INSERT INTO user_onboarding_responses (
        user_id,
        full_name,
        role_category,
        primary_use_cases,
        referral_source,
        brand_name,
        brand_website,
        team_size
      )
      VALUES (
        ${userId},
        ${payload.full_name},
        ${payload.role_category},
        ${payload.primary_use_cases},
        ${payload.referral_source},
        ${workspaceDisplayName || null},
        ${payload.brand_website || null},
        ${payload.team_size}
      )
      RETURNING *
    `;

    // Seed / rename the first org workspace from signup metadata.
    const workspaceId = await createDefaultWorkspaceForUser({
      userId,
      email: session.user.email,
      userName: payload.full_name || session.user.name,
      workspaceName: workspaceDisplayName,
    });
    if (workspaceId) {
      try {
        await sql`
          UPDATE public.workspaces
          SET name = ${workspaceDisplayName}
          WHERE id = ${workspaceId} AND user_id = ${userId}
        `;
      } catch {
        /* ignore rename failures on lean schemas */
      }
    }

    return Response.json({
      ok: true,
      demo: false,
      profile: Array.isArray(updated) ? updated[0] : null,
      response: Array.isArray(history) ? history[0] : null,
      workspace_id: workspaceId,
      workspace_name: workspaceDisplayName,
      redirect: '/admin',
      meta: {
        role_categories: ROLE_CATEGORIES,
        use_cases: USE_CASES,
      },
    });
  } catch (error) {
    console.error('[onboarding POST]', error);
    // Schema may not have new columns yet — fall back to demo persistence.
    const saved = saveDemoOnboarding(userId, {
      ...payload,
      brand_name: workspaceDisplayName,
    });
    return Response.json({
      ok: true,
      demo: true,
      fallback: true,
      profile: saved.profile,
      response: saved.response,
      workspace_name: workspaceDisplayName,
      redirect: '/admin',
      warning: 'Database write failed; saved in demo store. Apply onboarding schema migration.',
    });
  }
}

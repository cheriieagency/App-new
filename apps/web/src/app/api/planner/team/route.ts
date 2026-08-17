/**
 * GET/POST /api/planner/team — roster + plan helpers.
 * Team members persist to Postgres when DATABASE_URL is set.
 */

import { requireApiSession } from '@/lib/auth/require-api-session';
import {
  addTeamMember,
  getWorkspacePlan,
  listTeamMembers,
  removeTeamMember,
  setWorkspacePlan,
  updateTeamMember,
  type TeamRole,
  type WorkspacePlan,
} from '@/lib/mock-content-planner';
import { getPlanLimits } from '@/lib/config/plans';
import {
  addDurableTeamMember,
  ensureOwnerTeamSeat,
  listDurableTeamMembers,
  removeDurableTeamMember,
  syncTeamPlannerAccess,
  updateDurableTeamMember,
} from '@/lib/planner/team';

function useDb() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export async function GET(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  const { searchParams } = new URL(request.url);
  const project = searchParams.get('project') || undefined;
  const { resolveSubscription } = await import('@/lib/plan-guard');
  const sub = await resolveSubscription(request.headers);
  const plan = sub.plan;

  if (!useDb()) {
    return Response.json({
      members: listTeamMembers(project),
      all_members: listTeamMembers(),
      plan,
      limits: getPlanLimits(plan),
      demo: true,
      pro_unlocked: sub.pro_unlocked || plan === 'pro',
      subscription_status: sub.subscription_status,
      subscription_plan: sub.subscription_plan,
      onboarding_completed: sub.onboarding_completed,
    });
  }

  try {
    await ensureOwnerTeamSeat({
      ownerUserId: session.user.id,
      name: session.user.name || 'Owner',
      email: session.user.email || `owner-${session.user.id}@clikd.local`,
      project,
    });
    await syncTeamPlannerAccess({
      ownerUserId: session.user.id,
      plan,
    });
    const all = await listDurableTeamMembers({ ownerUserId: session.user.id });
    const members = project
      ? all.filter((m) => m.project === project)
      : all;

    return Response.json({
      members,
      all_members: all,
      plan,
      limits: getPlanLimits(plan),
      demo: false,
      pro_unlocked: sub.pro_unlocked || plan === 'pro',
      subscription_status: sub.subscription_status,
      subscription_plan: sub.subscription_plan,
      onboarding_completed: sub.onboarding_completed,
    });
  } catch (error) {
    console.error('[GET /api/planner/team]', error);
    return Response.json(
      { error: 'list_failed', members: [], all_members: [], demo: false },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  const durable = useDb();
  const userId = session.user.id;

  try {
    const body = await request.json();
    const action = String(body.action ?? 'add');

    if (action === 'set_plan') {
      const { isProUnlockedEmail } = await import('@/lib/test-accounts');
      const { setProfileSubscription } = await import(
        '@/lib/subscription-profile'
      );
      // VIP / QA accounts stay on Pro — ignore downgrade attempts.
      if (isProUnlockedEmail(session.user.email)) {
        await setProfileSubscription({
          userId,
          email: session.user.email,
          plan: 'pro',
          status: 'active',
          onboardingCompleted: true,
        });
        if (durable) {
          await syncTeamPlannerAccess({ ownerUserId: userId, plan: 'pro' });
          const members = await listDurableTeamMembers({ ownerUserId: userId });
          return Response.json({
            plan: 'pro' as WorkspacePlan,
            members,
            pro_unlocked: true,
            subscription_status: 'active',
            subscription_plan: 'pro',
            demo: false,
          });
        }
        return Response.json({
          plan: 'pro' as WorkspacePlan,
          members: listTeamMembers(),
          pro_unlocked: true,
          subscription_status: 'active',
          subscription_plan: 'pro',
          demo: true,
        });
      }
      const plan = body.plan as WorkspacePlan;
      if (!['starter', 'creator', 'pro'].includes(plan)) {
        return Response.json({ error: 'Invalid plan' }, { status: 400 });
      }
      await setProfileSubscription({
        userId,
        email: session.user.email,
        plan,
        status: plan === 'starter' ? 'inactive' : 'active',
        onboardingCompleted: true,
      });
      if (durable) {
        await syncTeamPlannerAccess({ ownerUserId: userId, plan });
        const members = await listDurableTeamMembers({ ownerUserId: userId });
        return Response.json({
          plan,
          members,
          subscription_status: plan === 'starter' ? 'inactive' : 'active',
          subscription_plan: plan,
          pro_unlocked: plan === 'pro',
          demo: false,
        });
      }
      return Response.json({
        plan: setWorkspacePlan(plan),
        members: listTeamMembers(),
        subscription_status: plan === 'starter' ? 'inactive' : 'active',
        subscription_plan: plan,
        pro_unlocked: plan === 'pro',
        demo: true,
      });
    }

    const { resolveSubscription } = await import('@/lib/plan-guard');
    const sub = await resolveSubscription(request.headers);
    const plan = sub.plan;

    if (action === 'remove') {
      if (durable) {
        const ok = await removeDurableTeamMember({
          ownerUserId: userId,
          id: String(body.id ?? ''),
        });
        if (!ok) {
          return Response.json(
            { error: 'Cannot remove owner or missing member' },
            { status: 400 }
          );
        }
        return Response.json({
          ok: true,
          members: await listDurableTeamMembers({ ownerUserId: userId }),
          plan,
          demo: false,
        });
      }
      const ok = removeTeamMember(String(body.id ?? ''));
      if (!ok) {
        return Response.json(
          { error: 'Cannot remove owner or missing member' },
          { status: 400 }
        );
      }
      return Response.json({
        ok: true,
        members: listTeamMembers(),
        plan: getWorkspacePlan(),
        demo: true,
      });
    }

    if (action === 'update') {
      if (durable) {
        const member = await updateDurableTeamMember({
          ownerUserId: userId,
          id: String(body.id ?? ''),
          plan,
          patch: {
            name: typeof body.name === 'string' ? body.name : undefined,
            email: typeof body.email === 'string' ? body.email : undefined,
            role: body.role as TeamRole | undefined,
            project: typeof body.project === 'string' ? body.project : undefined,
            status: body.status,
          },
        });
        if (!member) return Response.json({ error: 'Not found' }, { status: 404 });
        return Response.json({
          member,
          members: await listDurableTeamMembers({ ownerUserId: userId }),
          plan,
          demo: false,
        });
      }
      const member = updateTeamMember(String(body.id ?? ''), {
        name: typeof body.name === 'string' ? body.name : undefined,
        email: typeof body.email === 'string' ? body.email : undefined,
        role: body.role as TeamRole | undefined,
        project: typeof body.project === 'string' ? body.project : undefined,
        status: body.status,
      });
      if (!member) return Response.json({ error: 'Not found' }, { status: 404 });
      return Response.json({
        member,
        members: listTeamMembers(),
        plan: getWorkspacePlan(),
        demo: true,
      });
    }

    // add / invite
    const email = String(body.email ?? '').trim();
    const name = String(body.name ?? '').trim();
    if (!email || !email.includes('@')) {
      return Response.json({ error: 'Valid email required' }, { status: 400 });
    }

    if (durable) {
      await ensureOwnerTeamSeat({
        ownerUserId: userId,
        name: session.user.name || 'Owner',
        email: session.user.email || `owner-${userId}@clikd.local`,
        project: String(body.project ?? ''),
      });
      const result = await addDurableTeamMember({
        ownerUserId: userId,
        name,
        email,
        role: (body.role as TeamRole) || 'editor',
        project: String(body.project ?? ''),
        plan,
      });
      if (result.error === 'SEAT_LIMIT') {
        return Response.json(
          {
            error: 'UPGRADE_REQUIRED',
            minPlan: plan === 'starter' ? 'creator' : 'pro',
            limitKey: 'maxTeammateSeats',
            message: `Seat limit reached (${result.seat_limit}). Upgrade for more teammate seats.`,
          },
          { status: 403 }
        );
      }
      return Response.json({
        ...result,
        members: await listDurableTeamMembers({ ownerUserId: userId }),
        demo: false,
      });
    }

    const result = addTeamMember({
      name,
      email,
      role: (body.role as TeamRole) || 'editor',
      project: String(body.project ?? ''),
    });
    if (result.error === 'SEAT_LIMIT') {
      return Response.json(
        {
          error: 'UPGRADE_REQUIRED',
          minPlan: getWorkspacePlan() === 'starter' ? 'creator' : 'pro',
          limitKey: 'maxTeammateSeats',
          message: `Seat limit reached (${result.seat_limit}). Upgrade for more teammate seats.`,
        },
        { status: 403 }
      );
    }
    return Response.json({
      ...result,
      members: listTeamMembers(),
      demo: true,
    });
  } catch (error) {
    console.error('[POST /api/planner/team]', error);
    return Response.json(
      {
        error: 'Failed',
        message: error instanceof Error ? error.message : 'Failed',
      },
      { status: 500 }
    );
  }
}

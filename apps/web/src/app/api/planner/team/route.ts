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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const project = searchParams.get('project') || undefined;
  const { resolveSubscription } = await import('@/lib/plan-guard');
  const sub = await resolveSubscription(request.headers);
  const plan = sub.plan;
  return Response.json({
    members: listTeamMembers(project),
    all_members: listTeamMembers(),
    plan,
    limits: getPlanLimits(plan),
    demo: false,
    pro_unlocked: sub.pro_unlocked || plan === 'pro',
    subscription_status: sub.subscription_status,
    subscription_plan: sub.subscription_plan,
    onboarding_completed: sub.onboarding_completed,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = String(body.action ?? 'add');

    if (action === 'set_plan') {
      const { isProUnlockedEmail } = await import('@/lib/test-accounts');
      const { auth } = await import('@/lib/auth');
      const { setProfileSubscription } = await import(
        '@/lib/subscription-profile'
      );
      const session = await auth.api.getSession({ headers: request.headers });
      // VIP / QA accounts stay on Pro — ignore downgrade attempts.
      if (isProUnlockedEmail(session?.user?.email)) {
        if (session?.user) {
          await setProfileSubscription({
            userId: session.user.id,
            email: session.user.email,
            plan: 'pro',
            status: 'active',
            onboardingCompleted: true,
          });
        }
        return Response.json({
          plan: 'pro' as WorkspacePlan,
          members: listTeamMembers(),
          pro_unlocked: true,
          subscription_status: 'active',
          subscription_plan: 'pro',
        });
      }
      const plan = body.plan as WorkspacePlan;
      if (!['starter', 'creator', 'pro'].includes(plan)) {
        return Response.json({ error: 'Invalid plan' }, { status: 400 });
      }
      if (session?.user) {
        await setProfileSubscription({
          userId: session.user.id,
          email: session.user.email,
          plan,
          status: plan === 'starter' ? 'inactive' : 'active',
          onboardingCompleted: true,
        });
      }
      return Response.json({
        plan: setWorkspacePlan(plan),
        members: listTeamMembers(),
        subscription_status: plan === 'starter' ? 'inactive' : 'active',
        subscription_plan: plan,
        pro_unlocked: plan === 'pro',
      });
    }

    if (action === 'remove') {
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
      });
    }

    if (action === 'update') {
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
      });
    }

    // add / invite
    const email = String(body.email ?? '').trim();
    const name = String(body.name ?? '').trim();
    if (!email || !email.includes('@')) {
      return Response.json({ error: 'Valid email required' }, { status: 400 });
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
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}

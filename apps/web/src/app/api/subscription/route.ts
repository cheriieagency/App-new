/**
 * GET  /api/subscription — hydrate plan + status for admin pages
 * POST /api/subscription — activate test Pro mode / set plan
 */

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { setWorkspacePlan, type WorkspacePlan } from '@/lib/mock-content-planner';
import { resolveSubscription } from '@/lib/plan-guard';
import { setProfileSubscription } from '@/lib/subscription-profile';
import { isProUnlockedEmail } from '@/lib/test-accounts';

export async function GET() {
  const sub = await resolveSubscription(await headers());
  return Response.json({
    plan: sub.plan,
    subscription_status: sub.subscription_status,
    subscription_plan: sub.subscription_plan,
    onboarding_completed: sub.onboarding_completed,
    pro_unlocked: sub.pro_unlocked,
    email: sub.email,
  });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { action?: string; plan?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const action = String(body.action || 'activate_test');

  if (action === 'activate_test' || action === 'unlock_pro') {
    const sub = await setProfileSubscription({
      userId: session.user.id,
      email: session.user.email,
      plan: 'pro',
      status: 'active',
      onboardingCompleted: true,
    });
    setWorkspacePlan('pro');
    return Response.json({
      ok: true,
      plan: sub.plan,
      subscription_status: sub.subscription_status,
      subscription_plan: sub.subscription_plan,
      onboarding_completed: sub.onboarding_completed,
      pro_unlocked: true,
    });
  }

  if (action === 'set_plan') {
    if (isProUnlockedEmail(session.user.email)) {
      return Response.json({
        ok: true,
        plan: 'pro' as WorkspacePlan,
        subscription_status: 'active',
        subscription_plan: 'pro',
        pro_unlocked: true,
      });
    }
    const plan = String(body.plan || '') as WorkspacePlan;
    if (!['starter', 'creator', 'pro'].includes(plan)) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }
    const sub = await setProfileSubscription({
      userId: session.user.id,
      email: session.user.email,
      plan,
      status: plan === 'starter' ? 'inactive' : 'active',
      onboardingCompleted: true,
    });
    setWorkspacePlan(plan);
    return Response.json({
      ok: true,
      plan: sub.plan,
      subscription_status: sub.subscription_status,
      subscription_plan: sub.subscription_plan,
      pro_unlocked: sub.pro_unlocked,
    });
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
}

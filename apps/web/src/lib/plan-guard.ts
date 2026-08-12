/**
 * Server-side plan entitlement helpers for API routes.
 */

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getWorkspacePlan } from '@/lib/mock-content-planner';
import { isProUnlockedEmail } from '@/lib/test-accounts';
import {
  checkLimit,
  hasFeature,
  isPlanAtLeast,
  minPlanForFeature,
  type PlanFeatureKey,
  type PlanLimitKey,
  type WorkspacePlan,
} from '@/lib/config/plans';

export type UpgradeRequiredBody = {
  error: 'UPGRADE_REQUIRED';
  minPlan: WorkspacePlan;
  feature?: PlanFeatureKey;
  limitKey?: PlanLimitKey;
  message?: string;
};

/** Resolve plan for the current request session (Pro-unlock emails always get pro). */
export async function resolveWorkspacePlan(
  requestHeaders?: Headers
): Promise<WorkspacePlan> {
  try {
    const h = requestHeaders ?? (await headers());
    const session = await auth.api.getSession({ headers: h });
    if (isProUnlockedEmail(session?.user?.email)) return 'pro';
  } catch {
    /* fall through */
  }
  return getWorkspacePlan();
}

/** @deprecated Prefer resolveWorkspacePlan — sync path cannot see Pro-unlock emails. */
export function currentWorkspacePlan(): WorkspacePlan {
  return getWorkspacePlan();
}

export function upgradeRequiredResponse(
  minPlan: WorkspacePlan,
  extras?: Omit<UpgradeRequiredBody, 'error' | 'minPlan'>
): Response {
  const body: UpgradeRequiredBody = {
    error: 'UPGRADE_REQUIRED',
    minPlan,
    ...extras,
  };
  return Response.json(body, { status: 403 });
}

/** Returns a 403 Response when the active plan lacks the feature; otherwise null. */
export async function requireFeature(
  feature: PlanFeatureKey,
  requestHeaders?: Headers
): Promise<Response | null> {
  const plan = await resolveWorkspacePlan(requestHeaders);
  if (hasFeature(plan, feature)) return null;
  return upgradeRequiredResponse(minPlanForFeature(feature), { feature });
}

/** Returns a 403 Response when usage is at/over the limit; otherwise null. */
export async function requireLimit(
  limitKey: PlanLimitKey,
  currentUsage: number,
  requestHeaders?: Headers
): Promise<Response | null> {
  const plan = await resolveWorkspacePlan(requestHeaders);
  const result = checkLimit(plan, limitKey, currentUsage);
  if (result.allowed) return null;
  const minPlan: WorkspacePlan =
    plan === 'starter' ? 'creator' : plan === 'creator' ? 'pro' : 'pro';
  return upgradeRequiredResponse(minPlan, {
    limitKey,
    message: `Limit reached for ${limitKey} (${currentUsage}/${result.limit})`,
  });
}

export async function requirePlanAtLeast(
  minPlan: WorkspacePlan,
  requestHeaders?: Headers
): Promise<Response | null> {
  const plan = await resolveWorkspacePlan(requestHeaders);
  if (isPlanAtLeast(plan, minPlan)) return null;
  return upgradeRequiredResponse(minPlan);
}

export { hasFeature, checkLimit, isPlanAtLeast, minPlanForFeature };

/**
 * Server-side plan entitlement helpers for API routes.
 */

import { getWorkspacePlan } from '@/lib/mock-content-planner';
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
export function requireFeature(feature: PlanFeatureKey): Response | null {
  const plan = currentWorkspacePlan();
  if (hasFeature(plan, feature)) return null;
  return upgradeRequiredResponse(minPlanForFeature(feature), { feature });
}

/** Returns a 403 Response when usage is at/over the limit; otherwise null. */
export function requireLimit(
  limitKey: PlanLimitKey,
  currentUsage: number
): Response | null {
  const plan = currentWorkspacePlan();
  const result = checkLimit(plan, limitKey, currentUsage);
  if (result.allowed) return null;
  const minPlan: WorkspacePlan =
    plan === 'starter' ? 'creator' : plan === 'creator' ? 'pro' : 'pro';
  return upgradeRequiredResponse(minPlan, {
    limitKey,
    message: `Limit reached for ${limitKey} (${currentUsage}/${result.limit})`,
  });
}

export function requirePlanAtLeast(minPlan: WorkspacePlan): Response | null {
  const plan = currentWorkspacePlan();
  if (isPlanAtLeast(plan, minPlan)) return null;
  return upgradeRequiredResponse(minPlan);
}

export { hasFeature, checkLimit, isPlanAtLeast, minPlanForFeature };

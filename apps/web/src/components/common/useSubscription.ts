'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAdminPlan } from '@/components/admin/AdminPlanModal';
import {
  checkLimit,
  getPlanLimits,
  hasFeature,
  isPlanAtLeast,
  minPlanForFeature,
  normalizeWorkspacePlan,
  type PlanFeatureKey,
  type PlanLimitKey,
  type PlanLimits,
  type WorkspacePlan,
} from '@/lib/config/plans';

export type UseSubscriptionResult = {
  plan: WorkspacePlan;
  limits: PlanLimits;
  loading: boolean;
  hasFeature: (feature: PlanFeatureKey) => boolean;
  checkLimit: (limitKey: PlanLimitKey, currentUsage: number) => ReturnType<typeof checkLimit>;
  isPlanAtLeast: (minPlan: WorkspacePlan) => boolean;
  minPlanForFeature: (feature: PlanFeatureKey) => WorkspacePlan;
  /** Opens the shared upgrade modal (controlled via UpgradeModalProvider or local). */
  requestUpgrade: (minPlan?: WorkspacePlan) => void;
  upgradeOpen: boolean;
  setUpgradeOpen: (open: boolean) => void;
  upgradeTarget: WorkspacePlan;
};

/**
 * Reads the active workspace subscription plan and exposes typed entitlement helpers.
 */
export function useSubscription(): UseSubscriptionResult {
  const { data, isLoading } = useAdminPlan();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState<WorkspacePlan>('creator');

  const plan = normalizeWorkspacePlan(data?.plan);
  const proUnlocked = Boolean(data?.pro_unlocked) || plan === 'pro';
  const limits = useMemo(() => getPlanLimits(plan), [plan]);

  const hasFeatureFn = useCallback(
    (feature: PlanFeatureKey) => hasFeature(plan, feature),
    [plan]
  );

  const checkLimitFn = useCallback(
    (limitKey: PlanLimitKey, currentUsage: number) =>
      checkLimit(plan, limitKey, currentUsage),
    [plan]
  );

  const isPlanAtLeastFn = useCallback(
    (minPlan: WorkspacePlan) => isPlanAtLeast(plan, minPlan),
    [plan]
  );

  const requestUpgrade = useCallback(
    (minPlan: WorkspacePlan = 'creator') => {
      // VIP / already-Pro accounts never see a payment wall.
      if (proUnlocked || isPlanAtLeast(plan, minPlan)) return;
      setUpgradeTarget(minPlan);
      setUpgradeOpen(true);
    },
    [plan, proUnlocked]
  );

  return {
    plan,
    limits,
    loading: isLoading,
    hasFeature: hasFeatureFn,
    checkLimit: checkLimitFn,
    isPlanAtLeast: isPlanAtLeastFn,
    minPlanForFeature,
    requestUpgrade,
    upgradeOpen,
    setUpgradeOpen,
    upgradeTarget,
  };
}

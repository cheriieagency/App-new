'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAdminPlan } from '@/components/admin/AdminPlanModal';
import { useSession } from '@/lib/auth-client';
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
  subscriptionStatus: string;
  proUnlocked: boolean;
  hasFeature: (feature: PlanFeatureKey) => boolean;
  checkLimit: (limitKey: PlanLimitKey, currentUsage: number) => ReturnType<typeof checkLimit>;
  isPlanAtLeast: (minPlan: WorkspacePlan) => boolean;
  minPlanForFeature: (feature: PlanFeatureKey) => WorkspacePlan;
  /** Opens the shared upgrade modal (controlled via UpgradeModalProvider or local). */
  requestUpgrade: (minPlan?: WorkspacePlan) => void;
  upgradeOpen: boolean;
  setUpgradeOpen: (open: boolean) => void;
  upgradeTarget: WorkspacePlan;
  /** Force refetch plan from /api/planner/team + /api/subscription */
  refreshSubscription: () => Promise<void>;
  activateTestMode: () => Promise<boolean>;
};

/**
 * Reads the active workspace subscription plan and exposes typed entitlement helpers.
 * Revalidates on /admin route changes and Better Auth session updates.
 */
export function useSubscription(): UseSubscriptionResult {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const { data, isLoading, refetch } = useAdminPlan();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState<WorkspacePlan>('creator');

  const plan = normalizeWorkspacePlan(data?.plan);
  const subscriptionStatus = String(
    data?.subscription_status ||
      (plan === 'starter' ? 'inactive' : 'active')
  );
  // VIP unlock emails / explicit Pro only — do NOT treat every "active" status as Pro.
  const proUnlocked = Boolean(data?.pro_unlocked) || plan === 'pro';
  const limits = useMemo(() => getPlanLimits(plan), [plan]);

  const refreshSubscription = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-workspace-plan'] }),
      queryClient.invalidateQueries({ queryKey: ['subscription'] }),
      refetch(),
    ]);
  }, [queryClient, refetch]);

  // Revalidate when navigating across admin surfaces or auth session changes.
  useEffect(() => {
    if (!pathname?.startsWith('/admin')) return;
    void queryClient.invalidateQueries({ queryKey: ['admin-workspace-plan'] });
    void queryClient.invalidateQueries({ queryKey: ['subscription'] });
  }, [pathname, session?.user?.id, queryClient]);

  const activateTestMode = useCallback(async () => {
    try {
      const r = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate_test' }),
        credentials: 'include',
      });
      if (!r.ok) return false;
      await refreshSubscription();
      return true;
    } catch {
      return false;
    }
  }, [refreshSubscription]);

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
    subscriptionStatus,
    proUnlocked,
    hasFeature: hasFeatureFn,
    checkLimit: checkLimitFn,
    isPlanAtLeast: isPlanAtLeastFn,
    minPlanForFeature,
    requestUpgrade,
    upgradeOpen,
    setUpgradeOpen,
    upgradeTarget,
    refreshSubscription,
    activateTestMode,
  };
}

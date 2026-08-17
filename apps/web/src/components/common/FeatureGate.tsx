'use client';

import type { ReactNode } from 'react';
import { Lock, Sparkles, Zap } from 'lucide-react';
import {
  minPlanForFeature,
  PLAN_DISPLAY_NAME,
  upgradeBadgeLabel,
  type PlanFeatureKey,
  type WorkspacePlan,
} from '@/lib/config/plans';
import { useSubscription } from '@/components/common/useSubscription';
import UpgradeModal from '@/components/common/UpgradeModal';

type FeatureGateProps = {
  /** Feature flag to require (maps to PLAN_LIMITS.features). */
  feature?: PlanFeatureKey;
  /** Explicit minimum plan (overrides feature lookup when set alone). */
  minPlan?: WorkspacePlan;
  children?: ReactNode;
  /** Custom locked UI; defaults to locked card + upgrade CTA. */
  fallback?: ReactNode;
  /** Compact inline badge instead of full lock card. */
  mode?: 'card' | 'inline' | 'overlay';
  className?: string;
  title?: string;
  description?: string;
};

function resolveMinPlan(
  feature: PlanFeatureKey | undefined,
  minPlan: WorkspacePlan | undefined
): WorkspacePlan {
  if (minPlan) return minPlan;
  if (feature) return minPlanForFeature(feature);
  return 'creator';
}

/** Subtle lock / upgrade badge. */
export function PlanLockBadge({
  minPlan,
  className = '',
}: {
  minPlan: WorkspacePlan;
  className?: string;
}) {
  const isPro = minPlan === 'pro';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
        isPro
          ? 'bg-amber-50 text-amber-800 border border-amber-200'
          : 'bg-slate-100 text-slate-700 border border-slate-200'
      } ${className}`}
    >
      {isPro ? <Zap size={10} /> : <Lock size={10} />}
      {isPro ? `${PLAN_DISPLAY_NAME.pro} Feature` : upgradeBadgeLabel(minPlan)}
    </span>
  );
}

/**
 * Renders children when the active plan allows access; otherwise shows a locked state
 * and opens UpgradeModal on CTA.
 */
export function FeatureGate({
  feature,
  minPlan,
  children,
  fallback,
  mode = 'card',
  className = '',
  title,
  description,
}: FeatureGateProps) {
  const {
    hasFeature,
    isPlanAtLeast,
    requestUpgrade,
    upgradeOpen,
    setUpgradeOpen,
    upgradeTarget,
    loading,
  } = useSubscription();

  const required = resolveMinPlan(feature, minPlan);
  const allowed = feature
    ? hasFeature(feature)
    : isPlanAtLeast(required);

  if (loading) {
    return (
      <div className={`animate-pulse rounded-2xl bg-slate-100 h-32 ${className}`} />
    );
  }

  if (allowed) return <>{children}</>;

  if (fallback) {
    return (
      <>
        {fallback}
        <UpgradeModal
          open={upgradeOpen}
          onOpenChange={setUpgradeOpen}
          minPlan={upgradeTarget}
        />
      </>
    );
  }

  const headline =
    title ?? `Unlock with ${PLAN_DISPLAY_NAME[required]}`;
  const body =
    description ??
    (required === 'pro'
      ? `This capability is included on the ${PLAN_DISPLAY_NAME.pro} plan.`
      : `Upgrade to ${PLAN_DISPLAY_NAME.creator} to unlock this feature for your workspace.`);

  if (mode === 'inline') {
    return (
      <>
        <button
          type="button"
          onClick={() => requestUpgrade(required)}
          className={`inline-flex items-center gap-2 min-h-[44px] ${className}`}
        >
          <PlanLockBadge minPlan={required} />
        </button>
        <UpgradeModal
          open={upgradeOpen}
          onOpenChange={setUpgradeOpen}
          minPlan={upgradeTarget}
        />
      </>
    );
  }

  if (mode === 'overlay') {
    return (
      <>
        <div className={`relative ${className}`}>
          <div className="pointer-events-none select-none opacity-40 blur-[1px]">
            {children}
          </div>
          <div className="absolute inset-0 z-10 flex items-center justify-center p-4 bg-white/70 backdrop-blur-[2px] rounded-2xl">
            <LockedCard
              headline={headline}
              body={body}
              minPlan={required}
              onUpgrade={() => requestUpgrade(required)}
            />
          </div>
        </div>
        <UpgradeModal
          open={upgradeOpen}
          onOpenChange={setUpgradeOpen}
          minPlan={upgradeTarget}
        />
      </>
    );
  }

  return (
    <>
      <div className={className}>
        <LockedCard
          headline={headline}
          body={body}
          minPlan={required}
          onUpgrade={() => requestUpgrade(required)}
        />
      </div>
      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        minPlan={upgradeTarget}
      />
    </>
  );
}

function LockedCard({
  headline,
  body,
  minPlan,
  onUpgrade,
}: {
  headline: string;
  body: string;
  minPlan: WorkspacePlan;
  onUpgrade: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-8 text-center shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-500">
        {minPlan === 'pro' ? <Sparkles size={20} /> : <Lock size={20} />}
      </div>
      <PlanLockBadge minPlan={minPlan} className="mb-3" />
      <p className="text-sm font-extrabold text-slate-900">{headline}</p>
      <p className="mt-1 text-xs font-medium text-slate-500 max-w-sm mx-auto">{body}</p>
      <button
        type="button"
        onClick={onUpgrade}
        className="mt-4 inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl bg-[#F472B6] hover:bg-[#F472B6]/90 text-white text-sm font-bold shadow-md shadow-[#F472B6]/20 transition-colors"
      >
        Upgrade to {PLAN_DISPLAY_NAME[minPlan]}
      </button>
    </div>
  );
}

export default FeatureGate;

'use client';

import { FeatureGate, PlanLockBadge } from '@/components/common/FeatureGate';
import UpgradeModal from '@/components/common/UpgradeModal';
import { useSubscription } from '@/components/common/useSubscription';

export default function CustomDomainCard() {
  const {
    hasFeature,
    requestUpgrade,
    upgradeOpen,
    setUpgradeOpen,
    upgradeTarget,
  } = useSubscription();
  const canUse = hasFeature('customDomain');

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <PlanLockBadge minPlan="pro" />
          <span className="text-xs font-medium text-slate-500">
            Link yourname.se to your bio & community via Vercel DNS
          </span>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          Connect an apex domain (A → 76.76.21.21) or subdomain (CNAME →
          cname.vercel-dns.com). Pro/Agency plan required.
        </p>
        {canUse ? (
          <a
            href="/admin/settings/domain"
            className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl bg-[#0F172A] text-white text-sm font-bold"
          >
            Manage custom domain
          </a>
        ) : (
          <>
            <button
              type="button"
              onClick={() => requestUpgrade('pro')}
              className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl bg-[#0F172A] text-white text-sm font-bold"
            >
              Unlock on Pro
            </button>
            <FeatureGate
              feature="customDomain"
              title="Custom Domain Linking"
              description="Connect yourname.se on the Pro/Agency plan."
            />
          </>
        )}
      </div>
      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        minPlan={upgradeTarget}
      />
    </>
  );
}

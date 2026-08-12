'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { useSubscription } from '@/components/common/useSubscription';

/**
 * Shown on /admin/* when the workspace is not active/trialing.
 * Offers Upgrade modal + one-click Activate Test Mode for staging/QA.
 */
export default function SubscriptionGateBanner() {
  const {
    loading,
    subscriptionStatus,
    proUnlocked,
    plan,
    requestUpgrade,
    activateTestMode,
  } = useSubscription();
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (proUnlocked) return null;
  if (
    subscriptionStatus === 'active' ||
    subscriptionStatus === 'trialing' ||
    plan === 'pro' ||
    plan === 'creator'
  ) {
    return null;
  }

  return (
    <div className="sticky top-0 z-30 border-b border-amber-200/80 bg-amber-50/95 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div className="min-w-0 flex items-start gap-2.5">
          <span className="mt-0.5 w-8 h-8 rounded-xl bg-white border border-amber-200 flex items-center justify-center flex-shrink-0">
            <Sparkles size={14} className="text-amber-700" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-slate-900">
              Workspace locked · {plan} plan
            </p>
            <p className="text-xs text-slate-600 font-medium mt-0.5 leading-snug">
              Subscription status is “{subscriptionStatus || 'inactive'}”. Upgrade
              or activate test mode to unlock Analytics, Planner, and Pro features.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => requestUpgrade('pro')}
            className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl bg-[#2B2568] hover:bg-[#1a1848] text-white text-sm font-bold transition-colors"
          >
            Upgrade
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void activateTestMode().finally(() => setBusy(false));
            }}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-sm font-bold hover:bg-emerald-100 transition-colors disabled:opacity-60"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : null}
            Activate Test Mode
          </button>
        </div>
      </div>
    </div>
  );
}

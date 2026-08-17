'use client';

import { useMemo } from 'react';
import { Sparkles, Zap } from 'lucide-react';
import { FeatureGate } from '@/components/common/FeatureGate';
import UpgradeModal from '@/components/common/UpgradeModal';
import { useSubscription } from '@/components/common/useSubscription';
import { SectionBlock } from '@/components/admin/settings/SettingsUi';
import { authClient } from '@/lib/auth-client';
import { loadAiUsage } from '@/lib/settings-prefs';
import { t, type Locale } from '@/lib/i18n';

type AiUsageTabProps = {
  locale: Locale;
};

export default function AiUsageTab({ locale }: AiUsageTabProps) {
  const { data: session } = authClient.useSession();
  const {
    hasFeature,
    requestUpgrade,
    upgradeOpen,
    setUpgradeOpen,
    upgradeTarget,
  } = useSubscription();
  const canUse = hasFeature('aiCopilotSuite');

  const usage = useMemo(
    () => loadAiUsage(session?.user?.id),
    [session?.user?.id]
  );
  const pct = Math.min(
    100,
    Math.round((usage.used / Math.max(1, usage.limit)) * 1000) / 10
  );

  if (!canUse) {
    return (
      <>
        <FeatureGate
          feature="aiCopilotSuite"
          title={t('aiUsageGateTitle', locale)}
          description={t('aiUsageGateBody', locale)}
        />
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
      <SectionBlock
        title={t('settingsNavAi', locale)}
        subtitle={t('aiUsageGateBody', locale)}
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400">
                {t('aiUsageThisMonth', locale)}
              </p>
              <p className="mt-1 font-mono font-extrabold text-2xl text-slate-900 tabular-nums tracking-tight">
                {usage.used.toLocaleString()}
                <span className="text-base text-slate-400 font-bold">
                  {' '}
                  / {usage.limit.toLocaleString()}
                </span>
              </p>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                {t('aiUsageWordsUsed', locale)}
              </p>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold tabular-nums border ${
                pct >= 90
                  ? 'bg-rose-50 text-rose-600 border-rose-200'
                  : pct >= 70
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-[#10B981] border-emerald-200'
              }`}
            >
              {pct}%
            </span>
          </div>

          <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#2B2568] via-[#9089F0] to-[#F472B6] transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>

          <button
            type="button"
            onClick={() => requestUpgrade('pro')}
            className="inline-flex items-center justify-center gap-1.5 h-11 min-h-[44px] px-4 rounded-xl bg-[#2B2568] text-white text-xs font-bold hover:bg-[#1e1b4b] transition-colors"
          >
            <Zap size={14} strokeWidth={2.5} />
            Upgrade AI Limit
          </button>
        </div>
      </SectionBlock>

      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-5 py-6 mt-2">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={16} className="text-emerald-700" />
          <p className="text-sm font-extrabold text-emerald-900">
            AI Copilot Suite unlocked
          </p>
        </div>
        <p className="text-xs font-medium text-emerald-800/80">
          Open the floating AI Copilot from Creator Admin to generate course
          outlines, community posts, sales emails, and headlines.
        </p>
      </div>

      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        minPlan={upgradeTarget}
      />
    </>
  );
}

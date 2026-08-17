'use client';

import { Check, Loader2, Sparkles } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  PLAN_DISPLAY_NAME,
  PLAN_LIMITS,
  type WorkspacePlan,
} from '@/lib/config/plans';
import { useLanguage } from '@/lib/i18n';
import { planLabel } from '@/components/admin/AdminPlanModal';

const UPGRADE_CARDS: {
  id: WorkspacePlan;
  price: string;
  blurb: string;
  highlights: string[];
}[] = [
  {
    id: 'creator',
    price: '199 SEK/mo',
    blurb: 'Unlimited members, classroom hosting, and email broadcasts.',
    highlights: [
      'Unlimited community members',
      'Classroom & 25 GB video',
      'Email broadcasts (2,500)',
      '2.5% platform fee',
    ],
  },
  {
    id: 'pro',
    price: '699 SEK/mo',
    blurb: '0% fees, custom domains, AI Copilot, and 3 workspaces.',
    highlights: [
      '0% platform fee',
      'Custom domain linking',
      'AI Copilot Suite',
      '5 teammate seats',
    ],
  },
];

type UpgradeModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  minPlan?: WorkspacePlan;
};

/** Lightweight upgrade dialog used by FeatureGate across admin. */
export default function UpgradeModal({
  open,
  onOpenChange,
  minPlan = 'creator',
}: UpgradeModalProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const cards = UPGRADE_CARDS.filter((c) =>
    minPlan === 'pro' ? c.id === 'pro' : true
  );

  const changePlan = useMutation({
    mutationFn: async (plan: WorkspacePlan) => {
      const r = await fetch('/api/planner/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_plan', plan }),
      });
      if (!r.ok) throw new Error('Failed');
      return r.json() as Promise<{ plan: WorkspacePlan }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-workspace-plan'] });
      queryClient.invalidateQueries({ queryKey: ['planner-team'] });
      toast.success(t('toastPlanSwitched', { plan: planLabel(data.plan) }));
      onOpenChange(false);
    },
    onError: () => toast.error(t('toastUpdatePlanFailed')),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl border-slate-200 bg-white p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={16} className="text-[#F472B6]" />
            <DialogTitle className="text-base font-extrabold text-slate-900">
              Upgrade to {PLAN_DISPLAY_NAME[minPlan]}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-slate-500 font-medium">
            Unlock the features locked on your current plan. Demo mode switches
            instantly (no payment).
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-3">
          {cards.map((card) => {
            const limits = PLAN_LIMITS[card.id];
            return (
              <div
                key={card.id}
                className={`rounded-2xl border p-4 ${
                  card.id === minPlan
                    ? 'border-[#F472B6] bg-[#F472B6]/5'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-sm font-extrabold text-slate-900">
                      {PLAN_DISPLAY_NAME[card.id]}
                    </p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {card.blurb}
                    </p>
                  </div>
                  <p className="text-sm font-black text-slate-900 tabular-nums whitespace-nowrap">
                    {card.price}
                  </p>
                </div>
                <ul className="space-y-1.5 mb-3">
                  {card.highlights.map((h) => (
                    <li
                      key={h}
                      className="flex items-start gap-2 text-xs font-medium text-slate-700"
                    >
                      <Check size={12} className="mt-0.5 text-[#10B981] shrink-0" />
                      {h}
                    </li>
                  ))}
                </ul>
                <p className="text-[10px] font-mono text-slate-400 mb-3">
                  Fee {limits.platformFeePercent}% · {limits.maxTeammateSeats} seats
                </p>
                <button
                  type="button"
                  disabled={changePlan.isPending}
                  onClick={() => changePlan.mutate(card.id)}
                  className={`w-full inline-flex items-center justify-center gap-2 min-h-[44px] rounded-xl text-sm font-bold transition-colors ${
                    card.id === 'pro'
                      ? 'bg-[#0F172A] hover:bg-[#1a1848] text-white'
                      : 'bg-[#F472B6] hover:bg-[#F472B6]/90 text-white'
                  }`}
                >
                  {changePlan.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    `Switch to ${PLAN_DISPLAY_NAME[card.id]}`
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

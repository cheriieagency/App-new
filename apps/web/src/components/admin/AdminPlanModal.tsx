'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/i18n';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { WorkspacePlan } from '@/lib/mock-content-planner';
import { PLAN_DISPLAY_NAME } from '@/lib/config/plans';

const PLANS: {
  id: WorkspacePlan;
  name: string;
  price: string;
  priceNote: string;
  desc: string;
  features: string[];
  highlight?: boolean;
}[] = [
  {
    id: 'starter',
    name: PLAN_DISPLAY_NAME.starter,
    price: '0 SEK',
    priceNote: 'Free forever',
    desc: 'Launch your first digital product or bio link without fixed costs.',
    features: [
      '8% Transaction Fee on Sales (No monthly sub)',
      '1 Social Set & Bio Link Storefront',
      '1 Free Community (Up to 25 members)',
      'Sell digital products & downloads',
      '1-Tap Mobile Checkout',
      'Basic Analytics & Email CRM',
      '1 seat in your workspace',
    ],
  },
  {
    id: 'creator',
    name: PLAN_DISPLAY_NAME.creator,
    price: '199 SEK',
    priceNote: 'per month',
    desc: 'Everything you need to sell, post, and grow your community.',
    highlight: true,
    features: [
      'Unlimited Community Members',
      'Full Social Content Planner & Kanban',
      'Bio Link Storefront & 1-Tap Checkout',
      'Classroom Courses & Video Hosting (25 GB)',
      'Email CRM & Broadcasts (2,500 contacts)',
      'Social Inbox & Instagram DMs',
      'Reduced 2.5% Platform Fee',
      '2 seats in your workspace for teammates',
    ],
  },
  {
    id: 'pro',
    name: PLAN_DISPLAY_NAME.pro,
    price: '699 SEK',
    priceNote: 'per month',
    desc: 'For high-earning creators, educators, and multi-brand agencies.',
    features: [
      '0% Platform Fee (Keep 100% revenue)',
      'Multiple Communities & 3 Workspaces',
      '5 seats in workspace (+99 kr per extra)',
      'Custom Domain Linking (yourname.se)',
      'AI Content & Member Copilot Suite',
      'Social Inbox & Instagram DMs',
      'Priority 1:1 Onboarding & Support',
    ],
  },
];

export function planLabel(plan: WorkspacePlan) {
  return PLAN_DISPLAY_NAME[plan];
}

export function useAdminPlan() {
  return useQuery<{
    plan: WorkspacePlan;
    pro_unlocked?: boolean;
    subscription_status?: string;
    subscription_plan?: string;
    onboarding_completed?: boolean;
  }>({
    queryKey: ['admin-workspace-plan'],
    queryFn: async () => {
      // Prefer dedicated subscription endpoint; fall back to planner/team.
      const primary = await fetch('/api/subscription', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (primary.ok) return primary.json();
      const r = await fetch('/api/planner/team', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    staleTime: 5_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}

export default function AdminPlanModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data, isLoading } = useAdminPlan();
  const current = data?.plan ?? 'creator';
  const proUnlocked = Boolean(data?.pro_unlocked) || current === 'pro';

  const changePlan = useMutation({
    mutationFn: async (plan: WorkspacePlan) => {
      const r = await fetch('/api/planner/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_plan', plan }),
      });
      if (!r.ok) throw new Error('Failed');
      return r.json() as Promise<{ plan: WorkspacePlan; pro_unlocked?: boolean }>;
    },
    onSuccess: (res) => {
      queryClient.setQueryData(['admin-workspace-plan'], {
        plan: res.plan,
        pro_unlocked: res.pro_unlocked,
      });
      queryClient.invalidateQueries({ queryKey: ['planner-team'] });
      toast.success(t('toastPlanSwitched', { plan: planLabel(res.plan) }));
      onOpenChange(false);
    },
    onError: () => toast.error(t('common.error')),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(920px,96vw)] max-h-[min(860px,92vh)] overflow-y-auto rounded-3xl border-slate-200/90 p-0 gap-0">
        <DialogHeader className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-100 text-left">
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
            <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sparkles size={15} />
            </span>
            Your plan
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 font-medium">
            {isLoading
              ? t('common.loading')
              : proUnlocked && data?.pro_unlocked
                ? 'Pro/Agency unlocked on this account — no payment wall.'
                : `Current: ${planLabel(current)}. Choose a plan to upgrade or change.`}
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          {PLANS.map((plan) => {
            const active = current === plan.id;
            const pending = changePlan.isPending && changePlan.variables === plan.id;
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-4 flex flex-col ${
                  active
                    ? 'border-indigo-500 bg-indigo-50/40 shadow-md shadow-indigo-500/10'
                    : plan.highlight
                      ? 'border-indigo-200 bg-white'
                      : 'border-slate-200/90 bg-white'
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-wide text-white px-2.5 py-1 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600">
                    Popular
                  </span>
                )}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="text-sm font-extrabold text-slate-900">{plan.name}</h3>
                  {active && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                      <Check size={10} strokeWidth={3} /> Current
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 font-medium mb-3 leading-snug">
                  {plan.desc}
                </p>
                <div className="mb-3">
                  <p className="text-2xl font-black text-slate-900 tabular-nums tracking-tight">
                    {plan.price}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400">{plan.priceNote}</p>
                </div>
                <ul className="space-y-1.5 mb-4 flex-1">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-1.5 text-[11px] font-medium text-slate-700"
                    >
                      <Check size={12} className="mt-0.5 text-indigo-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={
                    active ||
                    changePlan.isPending ||
                    Boolean(data?.pro_unlocked && plan.id !== 'pro')
                  }
                  onClick={() => changePlan.mutate(plan.id)}
                  className={`h-10 min-h-[40px] w-full rounded-xl text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition-all ${
                    active
                      ? 'bg-slate-100 text-slate-400 cursor-default'
                      : data?.pro_unlocked && plan.id !== 'pro'
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : plan.highlight
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/20 hover:opacity-95'
                        : 'bg-slate-900 text-white hover:opacity-90'
                  }`}
                >
                  {pending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : active ? (
                    data?.pro_unlocked ? 'Pro unlocked' : 'Current plan'
                  ) : data?.pro_unlocked && plan.id !== 'pro' ? (
                    'Included in Pro'
                  ) : current === 'pro' && plan.id !== 'pro' ? (
                    `Switch to ${plan.name}`
                  ) : plan.id === 'starter' ? (
                    'Downgrade to Starter'
                  ) : (
                    `Upgrade to ${plan.name}`
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

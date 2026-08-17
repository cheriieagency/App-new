'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Pencil, Radio, Target, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { adminCardClass } from '@/components/admin/AdminUi';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useWorkspaceOptional } from '@/context/WorkspaceContext';
import { computeCampaignGoalProgress } from '@/lib/analytics/campaign-goal-progress';
import type { AnalyticsMediaItem } from '@/lib/analytics/media';
import { LIVE_ANALYTICS_QUERY } from '@/lib/analytics/live-query';
import type {
  CampaignGoalMetric,
  CampaignLabel,
  PlannerPost,
} from '@/lib/mock-content-planner';

type ProjectGoalProgressProps = {
  campaign: CampaignLabel;
  /** Compact bar for folder tiles (read-only glance). */
  compact?: boolean;
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return n.toLocaleString('sv-SE');
}

/**
 * Project view / engagement goal — target is set by you; current is live from Analytics.
 */
export default function ProjectGoalProgress({
  campaign,
  compact = false,
}: ProjectGoalProgressProps) {
  const { locale } = useLanguage();
  const queryClient = useQueryClient();
  const workspace = useWorkspaceOptional();
  const projectName = workspace?.activeWorkspace?.name ?? '';

  const target = Math.max(0, campaign.goal_target ?? 0);
  const metric: CampaignGoalMetric =
    campaign.goal_metric === 'engagement' ? 'engagement' : 'views';
  const hasGoal = target > 0;

  const [editing, setEditing] = useState(false);
  const [draftMetric, setDraftMetric] = useState<CampaignGoalMetric>(metric);
  const [draftTarget, setDraftTarget] = useState(String(target || ''));

  useEffect(() => {
    if (editing) return;
    setDraftMetric(metric);
    setDraftTarget(target > 0 ? String(target) : '');
  }, [campaign.id, metric, target, editing]);

  // Live analytics (polls every 30s — same as Analytics tab).
  const analyticsQuery = useAnalytics(hasGoal || editing || !compact);
  const media = useMemo(
    () => (analyticsQuery.data?.media ?? []) as AnalyticsMediaItem[],
    [analyticsQuery.data?.media]
  );

  // Planner posts tagged with this project (for scoped progress).
  const postsQuery = useQuery({
    queryKey: ['planner-posts', projectName || 'all'],
    enabled: Boolean(hasGoal || editing || !compact),
    ...LIVE_ANALYTICS_QUERY,
    queryFn: async () => {
      const qs = projectName
        ? `?project=${encodeURIComponent(projectName)}`
        : '';
      const r = await fetch(`/api/planner${qs}`, { credentials: 'include' });
      if (!r.ok) throw new Error('Failed');
      return r.json() as Promise<{ posts: PlannerPost[] }>;
    },
  });

  const campaignPosts = useMemo(() => {
    const all = postsQuery.data?.posts ?? [];
    return all.filter((p) => (p.campaigns ?? []).includes(campaign.id));
  }, [postsQuery.data?.posts, campaign.id]);

  const live = useMemo(
    () =>
      computeCampaignGoalProgress({
        metric,
        campaignPosts,
        media,
      }),
    [metric, campaignPosts, media]
  );

  // Prefer live analytics; fall back to last persisted snapshot while loading.
  const analyticsReady =
    analyticsQuery.isSuccess || (analyticsQuery.data?.media?.length ?? 0) > 0;
  const current = analyticsReady
    ? live.current
    : Math.max(0, campaign.goal_current ?? 0);
  const pct =
    target > 0 ? Math.min(100, Math.round((current / target) * 1000) / 10) : 0;

  // Persist live current from the detail view so folder tiles stay in sync.
  const lastPersisted = useRef<number | null>(campaign.goal_current ?? null);
  useEffect(() => {
    if (compact || !hasGoal || !analyticsReady) return;
    if (lastPersisted.current === current) return;
    // Skip tiny noise while still settling the first fetch.
    if (analyticsQuery.isFetching && lastPersisted.current == null && current === 0) {
      return;
    }
    const t = window.setTimeout(() => {
      lastPersisted.current = current;
      void fetch('/api/planner/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'update',
          id: campaign.id,
          goal_current: current,
        }),
      }).then((r) => {
        if (r.ok) {
          void queryClient.invalidateQueries({ queryKey: ['planner-campaigns'] });
        }
      });
    }, 800);
    return () => window.clearTimeout(t);
  }, [
    compact,
    hasGoal,
    analyticsReady,
    current,
    campaign.id,
    queryClient,
    analyticsQuery.isFetching,
  ]);

  const saveGoal = useMutation({
    mutationFn: async () => {
      const nextMetric = draftMetric;
      const nextTarget = Math.max(0, Math.floor(Number(draftTarget) || 0));
      // Snapshot live progress for the metric being saved.
      const snapshot = computeCampaignGoalProgress({
        metric: nextMetric,
        campaignPosts,
        media,
      });
      const r = await fetch('/api/planner/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'update',
          id: campaign.id,
          goal_metric: nextMetric,
          goal_target: nextTarget,
          goal_current: snapshot.current,
        }),
      });
      if (!r.ok) throw new Error('Failed');
      return r.json() as Promise<{ campaign: CampaignLabel }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-campaigns'] });
      setEditing(false);
      toast.success(t('toastProjectGoalSaved', locale));
    },
    onError: () => toast.error(t('toastProjectGoalSaveFailed', locale)),
  });

  const label = metric === 'engagement' ? 'Engagement' : 'Views';
  const liveHint =
    live.scope === 'campaign'
      ? live.matchedMedia > 0
        ? `Live · ${live.matchedPosts} project post${live.matchedPosts === 1 ? '' : 's'}`
        : 'Live · waiting for analytics match'
      : 'Live · workspace analytics';

  if (compact) {
    if (!hasGoal) {
      return (
        <p className="text-[10px] font-medium text-slate-400 text-center leading-tight mt-0.5">
          No goal set
        </p>
      );
    }
    return (
      <div className="w-full mt-1 px-0.5">
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#2B2568] to-[#F472B6] transition-all"
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
        <p className="mt-0.5 text-[9px] font-mono font-bold text-slate-400 text-center tabular-nums">
          {pct}% · {formatCount(current)}/{formatCount(target)}
        </p>
      </div>
    );
  }

  return (
    <div className={`${adminCardClass} p-4 sm:p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400">
            Project goal
          </p>
          <h2 className="font-clikd-wordmark font-extrabold text-lg text-slate-900 tracking-tight mt-0.5 flex items-center gap-2">
            <Target size={16} className="text-[#F472B6]" strokeWidth={2.4} />
            {hasGoal ? `${label} progress` : 'Set a views or engagement goal'}
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Set your target — progress syncs live from Analytics.
          </p>
        </div>
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 h-11 min-h-[44px] px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Pencil size={13} />
            {hasGoal ? 'Edit goal' : 'Add goal'}
          </button>
        ) : null}
      </div>

      {editing ? (
        <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: 'views' as const, label: 'Views', icon: Eye },
                { id: 'engagement' as const, label: 'Engagement', icon: TrendingUp },
              ] as const
            ).map((opt) => {
              const Icon = opt.icon;
              const active = draftMetric === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDraftMetric(opt.id)}
                  className={`inline-flex items-center gap-1.5 h-10 min-h-[40px] px-3 rounded-xl text-xs font-bold border transition-colors ${
                    active
                      ? 'bg-[#2B2568] text-white border-[#2B2568]'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={13} />
                  {opt.label}
                </button>
              );
            })}
          </div>

          <label className="block space-y-1 max-w-sm">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wide text-slate-400">
              Goal target
            </span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={draftTarget}
              onChange={(e) => setDraftTarget(e.target.value)}
              placeholder="e.g. 50000"
              className="w-full h-11 min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 focus:outline-none focus:border-slate-400"
            />
          </label>

          <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2.5">
            <Radio size={14} className="text-[#10B981] mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800">
                Current progress is live
              </p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {formatCount(
                  computeCampaignGoalProgress({
                    metric: draftMetric,
                    campaignPosts,
                    media,
                  }).current
                )}{' '}
                {draftMetric === 'engagement' ? 'engagement' : 'views'} from
                Analytics
                {analyticsQuery.isFetching ? ' · refreshing…' : ''}
                . Tag posts with this project to scope the count.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saveGoal.isPending}
              onClick={() => saveGoal.mutate()}
              className="inline-flex items-center justify-center h-11 min-h-[44px] px-4 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50"
            >
              {saveGoal.isPending ? 'Saving…' : 'Save goal'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="inline-flex items-center justify-center h-11 min-h-[44px] px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : hasGoal ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="font-mono font-extrabold text-2xl sm:text-3xl text-slate-900 tabular-nums tracking-tight">
                {formatCount(current)}
                <span className="text-base text-slate-400 font-bold">
                  {' '}
                  / {formatCount(target)}
                </span>
              </p>
              <p className="text-xs font-medium text-slate-500 mt-0.5 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[#10B981]">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-60" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#10B981]" />
                  </span>
                  {liveHint}
                </span>
                <span className="text-slate-300">·</span>
                <span>{label.toLowerCase()} toward goal</span>
              </p>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold tabular-nums ${
                pct >= 100
                  ? 'bg-emerald-50 text-[#10B981] border border-emerald-200'
                  : 'bg-[#E9D5FF]/70 text-[#2B2568] border border-[#C4B5FD]/60'
              }`}
            >
              {pct}%
            </span>
          </div>
          <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#2B2568] via-[#9089F0] to-[#F472B6] transition-all duration-500"
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-400 font-medium py-2">
          No goal yet — add a views or engagement target. Progress will sync from
          Analytics automatically.
        </p>
      )}
    </div>
  );
}

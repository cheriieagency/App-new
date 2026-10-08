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

const OUTLINE_BTN =
  'inline-flex items-center justify-center gap-1.5 h-8 min-h-[32px] px-2.5 rounded-sm bg-transparent text-[9px] font-medium uppercase tracking-[0.08em] text-[#8A857D] hover:bg-[#F0EFEA] hover:text-[#2C2621] transition-colors';
const PRIMARY_BTN =
  'inline-flex items-center justify-center gap-1.5 h-8 min-h-[32px] px-3 rounded-sm bg-[#F0EFEA] text-[#2C2621] text-[9px] font-medium uppercase tracking-[0.08em] hover:bg-[#E6E3DB] transition-colors disabled:opacity-40';
const UNDERLINE_INPUT =
  'w-full h-9 min-h-[36px] bg-transparent border-0 border-b border-[#E6E3DB] rounded-none px-0 text-xs text-[#2C2621] placeholder:text-[#C4BFB6] focus:outline-none focus:border-[#2C2621]';

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
    const timer = window.setTimeout(() => {
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
    return () => window.clearTimeout(timer);
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
        <p className="text-[9px] font-medium text-[#A8A29E] text-center leading-tight mt-0.5">
          No goal set
        </p>
      );
    }
    return (
      <div className="w-full mt-1 px-0.5">
        <div className="h-1 bg-[#E6E3DB] overflow-hidden">
          <div
            className="h-full bg-[#2C2621]/70 transition-all"
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
        <p className="mt-0.5 text-[9px] font-semibold text-[#A8A29E] text-center tabular-nums">
          {pct}% · {formatCount(current)}/{formatCount(target)}
        </p>
      </div>
    );
  }

  return (
    <div className={`${adminCardClass} p-4 sm:p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8A857D]">
            Project goal
          </p>
          <h2 className="text-sm font-semibold text-[#2C2621] mt-1 flex items-center gap-1.5">
            <Target size={14} className="text-[#8A857D]" strokeWidth={2} />
            {hasGoal ? `${label} progress` : 'Set a views or engagement goal'}
          </h2>
          <p className="text-[11px] text-[#8A857D] mt-1 leading-snug">
            Set your target — progress syncs live from Analytics.
          </p>
        </div>
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={OUTLINE_BTN}
          >
            <Pencil size={11} />
            {hasGoal ? 'Edit goal' : 'Add goal'}
          </button>
        ) : null}
      </div>

      {editing ? (
        <div className="space-y-3 border border-[#E6E3DB] bg-[#F9F8F6] p-3">
          <div className="inline-flex border border-[#E6E3DB] bg-white">
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
                  className={`inline-flex items-center gap-1.5 h-8 min-h-[32px] px-2.5 text-[9px] font-medium uppercase tracking-[0.08em] border-r border-[#E6E3DB]/80 last:border-r-0 transition-colors ${
                    active
                      ? 'bg-[#F0EFEA] text-[#2C2621]'
                      : 'bg-transparent text-[#8A857D] hover:bg-[#F0EFEA]/70 hover:text-[#2C2621]'
                  }`}
                >
                  <Icon size={12} />
                  {opt.label}
                </button>
              );
            })}
          </div>

          <label className="block space-y-1 max-w-sm">
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8A857D]">
              Goal target
            </span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={draftTarget}
              onChange={(e) => setDraftTarget(e.target.value)}
              placeholder="e.g. 50000"
              className={UNDERLINE_INPUT}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  saveGoal.mutate();
                }
                if (e.key === 'Escape') setEditing(false);
              }}
            />
          </label>

          <div className="flex items-start gap-2 border border-[#E6E3DB] bg-white px-2.5 py-2">
            <Radio size={13} className="text-[#10B981] mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#2C2621]">
                Current progress is live
              </p>
              <p className="text-[11px] text-[#8A857D] mt-0.5 leading-snug">
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
              className={PRIMARY_BTN}
            >
              {saveGoal.isPending ? 'Saving…' : 'Save goal'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8A857D] hover:text-[#2C2621] h-8 min-h-[32px] px-2"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : hasGoal ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="font-semibold text-xl sm:text-2xl text-[#2C2621] tabular-nums tracking-tight">
                {formatCount(current)}
                <span className="text-xs text-[#A8A29E] font-medium">
                  {' '}
                  / {formatCount(target)}
                </span>
              </p>
              <p className="text-[11px] font-medium text-[#8A857D] mt-0.5 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[#10B981]">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-60" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#10B981]" />
                  </span>
                  {liveHint}
                </span>
                <span className="text-[#C4BFB6]">·</span>
                <span>{label.toLowerCase()} toward goal</span>
              </p>
            </div>
            <span
              className={`inline-flex items-center px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] tabular-nums border ${
                pct >= 100
                  ? 'border-[#10B981]/40 text-[#10B981] bg-white'
                  : 'border-[#E6E3DB] text-[#2C2621] bg-[#F9F8F6]'
              }`}
            >
              {pct}%
            </span>
          </div>
          <div className="h-2 bg-[#E6E3DB] overflow-hidden">
            <div
              className="h-full bg-[#2C2621]/65 transition-all duration-500"
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="w-full text-left text-[11px] text-[#8A857D] py-1 leading-snug hover:text-[#2C2621] transition-colors"
        >
          No goal yet — add a views or engagement target. Progress will sync from
          Analytics automatically.
        </button>
      )}
    </div>
  );
}

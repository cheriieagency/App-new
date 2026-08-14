'use client';

/**
 * Inbox → Automations: Comment-to-DM keyword rules (ManyChat-style).
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  MessageSquarePlus,
  MousePointerClick,
  Percent,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Zap,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { adminCardClass, adminKpiClass } from '@/components/admin/AdminUi';
import AdminEmptyState from '@/components/admin/AdminEmptyState';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useLanguage } from '@/lib/locale-context';
import { localeTag } from '@/lib/i18n';

type AutomationRule = {
  /** UUID string from public.dm_automations — never coerce with Number(). */
  id: string;
  workspaceId?: string;
  title: string;
  triggerKeywords: string[];
  dmMessageText: string;
  ctaButtonLabel: string;
  ctaButtonUrl: string;
  replyToCommentPublicly: boolean;
  publicCommentText: string;
  isActive: boolean;
  totalDmsSent: number;
  storefrontClicks: number;
};

type AutomationsPayload = {
  ok?: boolean;
  workspaceId?: string;
  automations: AutomationRule[];
  kpis: {
    activeTriggers: number;
    dmsSentThisMonth: number;
    storefrontClicks: number;
    conversionRate: number;
  };
  message?: string;
};

type FormState = {
  id?: string;
  title: string;
  triggerKeywords: string;
  dmMessageText: string;
  ctaButtonLabel: string;
  ctaButtonUrl: string;
  replyToCommentPublicly: boolean;
  publicCommentText: string;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  title: '',
  triggerKeywords: '',
  dmMessageText:
    'Hej! Tack för din kommentar. Här är direktlänken till min nya Masterclass:',
  ctaButtonLabel: 'Öppna storefront',
  ctaButtonUrl: '',
  replyToCommentPublicly: true,
  publicCommentText: 'Kolla din DM!',
  isActive: true,
};

export default function DMAutomationPanel() {
  const { locale } = useLanguage();
  const tag = localeTag(locale);
  const { activeWorkspace, setActiveWorkspaceId } = useWorkspace();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [testResult, setTestResult] = useState<string | null>(null);

  const storefrontDefault = useMemo(() => {
    const handle = (activeWorkspace.handle || activeWorkspace.bio?.handle || '')
      .replace(/^@/, '')
      .trim();
    if (typeof window === 'undefined') {
      return handle ? `/bio/${handle}` : '';
    }
    return handle
      ? `${window.location.origin}/bio/${encodeURIComponent(handle)}`
      : `${window.location.origin}/bio`;
  }, [activeWorkspace.handle, activeWorkspace.bio?.handle]);

  const { data, isLoading, isError, error, refetch } = useQuery<AutomationsPayload>({
    queryKey: ['dm-automations', activeWorkspace.id],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/inbox/automations?workspaceId=${encodeURIComponent(activeWorkspace.id)}`,
        {
          headers: { 'x-workspace-id': activeWorkspace.id },
          credentials: 'include',
        }
      );
      if (!res.ok) {
        let message = `Failed to load automations (${res.status})`;
        try {
          const errJson = (await res.json()) as { error?: string };
          if (errJson?.error) message = errJson.error;
        } catch {
          /* non-JSON */
        }
        throw new Error(message);
      }
      return res.json();
    },
    enabled: Boolean(activeWorkspace.id),
  });

  // Keep UI workspace aligned with the server-owned workspace used for rules.
  useEffect(() => {
    const resolved = data?.workspaceId?.trim();
    if (!resolved || resolved === activeWorkspace.id) return;
    setActiveWorkspaceId(resolved);
  }, [data?.workspaceId, activeWorkspace.id, setActiveWorkspaceId]);

  const saveMutation = useMutation({
    mutationFn: async (payload: FormState) => {
      // Client-side keyword clean mirrors server: strip #, lowercase, split commas.
      const cleanedKeywords = payload.triggerKeywords
        .split(/[,;\n]+/)
        .map((k) => k.trim().replace(/^#+/, '').toLowerCase())
        .filter(Boolean);

      const res = await fetch('/api/admin/inbox/automations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': activeWorkspace.id,
        },
        credentials: 'include',
        body: JSON.stringify({
          workspaceId: activeWorkspace.id,
          id: payload.id,
          title: payload.title,
          triggerKeywords: cleanedKeywords,
          dmMessageText: payload.dmMessageText,
          ctaButtonTitle: payload.ctaButtonLabel,
          ctaButtonLabel: payload.ctaButtonLabel,
          ctaButtonUrl: payload.ctaButtonUrl || storefrontDefault,
          replyToCommentPublicly: payload.replyToCommentPublicly,
          publicCommentText: payload.publicCommentText,
          isActive: payload.isActive ?? true,
        }),
      });
      if (!res.ok) {
        let message = `Could not save rule (${res.status})`;
        try {
          const errJson = (await res.json()) as { error?: string };
          if (errJson?.error) message = errJson.error;
        } catch {
          /* non-JSON error body */
        }
        throw new Error(message);
      }
      try {
        return (await res.json()) as {
          success?: boolean;
          automation?: AutomationRule;
        };
      } catch {
        throw new Error('Server returned invalid JSON');
      }
    },
    onSuccess: () => {
      toast.success(form.id ? 'Rule updated' : 'Comment-to-DM rule created');
      setModalOpen(false);
      setForm(EMPTY_FORM);
      void qc.invalidateQueries({ queryKey: ['dm-automations', activeWorkspace.id] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (rule: AutomationRule) => {
      const nextActive = !rule.isActive;
      const workspaceForRule =
        rule.workspaceId?.trim() || activeWorkspace.id;
      const res = await fetch('/api/admin/inbox/automations', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceForRule,
        },
        credentials: 'include',
        body: JSON.stringify({
          workspaceId: workspaceForRule,
          id: String(rule.id),
          isActive: nextActive,
        }),
      });
      if (!res.ok) {
        let message = `Toggle failed (${res.status})`;
        try {
          const errJson = (await res.json()) as { error?: string };
          if (errJson?.error) message = errJson.error;
        } catch {
          /* non-JSON */
        }
        throw new Error(message);
      }
      const json = (await res.json()) as {
        success?: boolean;
        automation?: AutomationRule;
      };
      return {
        ruleId: String(rule.id),
        nextActive,
        automation: json.automation,
      };
    },
    onMutate: async (rule) => {
      const key = ['dm-automations', activeWorkspace.id] as const;
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<AutomationsPayload>(key);
      const nextActive = !rule.isActive;
      if (previous?.automations) {
        qc.setQueryData<AutomationsPayload>(key, {
          ...previous,
          automations: previous.automations.map((r) =>
            String(r.id) === String(rule.id)
              ? { ...r, isActive: nextActive }
              : r
          ),
          kpis: {
            ...previous.kpis,
            activeTriggers: previous.automations.reduce((n, r) => {
              const active =
                String(r.id) === String(rule.id) ? nextActive : r.isActive;
              return n + (active ? 1 : 0);
            }, 0),
          },
        });
      }
      return { previous };
    },
    onError: (err, _rule, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(
          ['dm-automations', activeWorkspace.id],
          ctx.previous
        );
      }
      toast.error(err instanceof Error ? err.message : 'Toggle failed');
    },
    onSuccess: (result) => {
      const key = ['dm-automations', activeWorkspace.id] as const;
      const current = qc.getQueryData<AutomationsPayload>(key);
      if (current?.automations) {
        const nextActive =
          result.automation?.isActive ?? result.nextActive;
        qc.setQueryData<AutomationsPayload>(key, {
          ...current,
          automations: current.automations.map((r) =>
            String(r.id) === String(result.ruleId)
              ? {
                  ...r,
                  ...(result.automation || {}),
                  isActive: Boolean(nextActive),
                }
              : r
          ),
          kpis: {
            ...current.kpis,
            activeTriggers: current.automations.reduce((n, r) => {
              const active =
                String(r.id) === String(result.ruleId)
                  ? Boolean(nextActive)
                  : r.isActive;
              return n + (active ? 1 : 0);
            }, 0),
          },
        });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (automationId: string) => {
      const id = String(automationId ?? '').trim();
      if (!id || id === 'NaN' || id === 'undefined') {
        throw new Error('Invalid automation ID');
      }

      const res = await fetch(
        `/api/admin/inbox/automations?id=${encodeURIComponent(id)}`,
        { method: 'DELETE', credentials: 'include' }
      );
      if (!res.ok) {
        let message = `Failed to delete automation (${res.status})`;
        try {
          const errJson = (await res.json()) as { error?: string };
          if (errJson?.error) message = errJson.error;
        } catch {
          /* non-JSON */
        }
        throw new Error(message);
      }
      return res.json().catch(() => ({
        success: true,
        deletedId: id,
      }));
    },
    onMutate: async (automationId: string) => {
      const id = String(automationId);
      await qc.cancelQueries({
        queryKey: ['dm-automations', activeWorkspace.id],
      });
      const previous = qc.getQueryData<AutomationsPayload>([
        'dm-automations',
        activeWorkspace.id,
      ]);
      // Instant UI update — filter out deleted rule (no page reload).
      if (previous) {
        qc.setQueryData<AutomationsPayload>(
          ['dm-automations', activeWorkspace.id],
          {
            ...previous,
            automations: (previous.automations || []).filter(
              (a) => String(a.id) !== id
            ),
            kpis: {
              ...previous.kpis,
              activeTriggers: (previous.automations || []).filter(
                (a) => String(a.id) !== id && a.isActive
              ).length,
            },
          }
        );
      }
      return { previous };
    },
    onSuccess: () => {
      toast.success('Automation rule deleted successfully');
      void qc.invalidateQueries({
        queryKey: ['dm-automations', activeWorkspace.id],
      });
    },
    onError: (err, _id, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(
          ['dm-automations', activeWorkspace.id],
          ctx.previous
        );
      }
      toast.error(err instanceof Error ? err.message : 'Failed to delete automation');
    },
  });

  const kpis = data?.kpis ?? {
    activeTriggers: 0,
    dmsSentThisMonth: 0,
    storefrontClicks: 0,
    conversionRate: 0,
  };
  const rules = data?.automations ?? [];

  const testMutation = useMutation({
    mutationFn: async () => {
      const firstKw = rules[0]?.triggerKeywords?.[0];
      const commentText = firstKw
        ? `Test comment with ${firstKw}`
        : 'Hej! Jag vill ha #KURS info';
      const res = await fetch('/api/admin/inbox/automations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          workspaceId: activeWorkspace.id,
          commentText,
        }),
      });
      if (!res.ok) {
        let message = `Test failed (${res.status})`;
        try {
          const errJson = (await res.json()) as { error?: string };
          if (errJson?.error) message = errJson.error;
        } catch {
          /* non-JSON */
        }
        throw new Error(message);
      }
      return res.json() as Promise<{
        ready?: boolean;
        matchedRule?: { keyword: string; title: string } | null;
        blockers?: string[];
        webhook?: { callbackUrl?: string | null };
        dmsSentTotal?: number;
        commentText?: string;
        subscribeResults?: Array<{ targetId: string; ok: boolean }>;
      }>;
    },
    onSuccess: (json) => {
      if (json.ready) {
        toast.success(
          `Ready — matched “${json.matchedRule?.keyword}”. Live DMs need Meta webhook on a public URL.`
        );
        setTestResult(
          `Keyword match OK for “${json.commentText}”. Callback: ${json.webhook?.callbackUrl || 'not public yet'}. DMs logged: ${json.dmsSentTotal ?? 0}.`
        );
      } else {
        const blockers = json.blockers?.length
          ? json.blockers.join(' ')
          : 'Automation not ready.';
        toast.error(blockers.slice(0, 180));
        setTestResult(blockers);
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Test failed');
    },
  });

  const resyncWebhooksMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/inbox/automations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          workspaceId: activeWorkspace.id,
          action: 'resubscribe_webhooks',
        }),
      });
      if (!res.ok) {
        let message = `Re-sync failed (${res.status})`;
        try {
          const errJson = (await res.json()) as { error?: string };
          if (errJson?.error) message = errJson.error;
        } catch {
          /* non-JSON */
        }
        throw new Error(message);
      }
      return res.json() as Promise<{
        success?: boolean;
        subscribedCount?: number;
        details?: Array<{
          platform: string;
          targetId: string;
          ok: boolean;
          warning?: boolean;
          error?: string;
        }>;
        warnings?: string[];
        ready?: boolean;
        blockers?: string[];
        nextSteps?: string[];
        subscribeResults?: Array<{
          targetId: string;
          ok: boolean;
          warning?: boolean;
          error?: string;
        }>;
      }>;
    },
    onSuccess: (json) => {
      const okCount =
        json.subscribedCount ??
        json.details?.filter((r) => r.ok).length ??
        json.subscribeResults?.filter((r) => r.ok).length ??
        0;
      const warnings =
        json.warnings?.length
          ? json.warnings
          : (json.details || json.subscribeResults || [])
              .filter((r) => r.warning && r.error)
              .map((r) => String(r.error));

      if (json.success || json.ready || okCount > 0) {
        toast.success(
          `Meta webhooks subscribed${okCount ? ` (${okCount})` : ''}.`
        );
        setTestResult(
          [
            json.nextSteps?.join(' ') ||
              'Facebook Page webhooks active (covers linked Instagram).',
            warnings.length ? `Note: ${warnings[0]}` : '',
          ]
            .filter(Boolean)
            .join(' ')
        );
      } else {
        const blockers = json.blockers?.length
          ? json.blockers.join(' ')
          : json.details?.find((d) => d.error && !d.warning)?.error ||
            'Could not re-subscribe Meta webhooks.';
        toast.error(blockers.slice(0, 180));
        setTestResult(blockers);
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Re-sync failed');
    },
  });

  const openCreate = () => {
    setForm({
      ...EMPTY_FORM,
      ctaButtonUrl: storefrontDefault,
    });
    setModalOpen(true);
  };

  const openEdit = (rule: AutomationRule) => {
    setForm({
      id: String(rule.id),
      title: rule.title,
      triggerKeywords: rule.triggerKeywords.join(', '),
      dmMessageText: rule.dmMessageText,
      ctaButtonLabel: rule.ctaButtonLabel || 'Öppna storefront',
      ctaButtonUrl: rule.ctaButtonUrl || storefrontDefault,
      replyToCommentPublicly: rule.replyToCommentPublicly,
      publicCommentText: rule.publicCommentText || 'Kolla din DM!',
      isActive: rule.isActive,
    });
    setModalOpen(true);
  };

  const kpiCards = [
    {
      label: 'Active Triggers',
      value: `${kpis.activeTriggers} Rules`,
      icon: Zap,
    },
    {
      label: 'DMs Sent This Month',
      value: `${kpis.dmsSentThisMonth.toLocaleString(tag)} DMs`,
      icon: MessageSquarePlus,
    },
    {
      label: 'Storefront Clicks',
      value: `${kpis.storefrontClicks.toLocaleString(tag)} Clicks`,
      icon: MousePointerClick,
    },
    {
      label: 'Conversion Rate',
      value: `${kpis.conversionRate.toLocaleString(tag, { maximumFractionDigits: 1 })}%`,
      icon: Percent,
    },
  ];

  return (
    <div className="space-y-4">
      {isError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <p>
            Could not load automations:{' '}
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="h-11 min-h-[44px] px-4 rounded-xl bg-[#2B2568] text-white text-xs font-extrabold"
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {kpiCards.map((k) => (
          <div key={k.label} className={adminKpiClass}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
                {k.label}
              </p>
              <k.icon size={14} className="text-slate-300" />
            </div>
            <p className="mt-3 font-clikd-wordmark font-extrabold text-[24px] sm:text-[26px] leading-none text-slate-900 tracking-tight tabular-nums">
              {isLoading ? '—' : k.value}
            </p>
          </div>
        ))}
      </div>

      <div className={`${adminCardClass} overflow-hidden`}>
        <div className="px-5 sm:px-7 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-clikd-wordmark font-extrabold text-lg text-slate-900 tracking-tight">
              Comment-to-DM Automations
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              When someone comments a keyword, Clikd sends your DM + storefront link.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => resyncWebhooksMutation.mutate()}
              disabled={resyncWebhooksMutation.isPending}
              className="h-11 min-h-[44px] px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-extrabold inline-flex items-center justify-center gap-2 hover:bg-slate-50 disabled:opacity-50"
            >
              {resyncWebhooksMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              🔄 Re-sync Meta Webhooks
            </button>
            <button
              type="button"
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending || rules.length === 0}
              className="h-11 min-h-[44px] px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-extrabold inline-flex items-center justify-center gap-2 hover:bg-slate-50 disabled:opacity-50"
            >
              {testMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Zap size={16} />
              )}
              Test automation
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="h-11 min-h-[44px] px-4 rounded-xl bg-clikd-pink text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 hover:opacity-90"
            >
              <Plus size={16} />
              Create Comment-to-DM Rule
            </button>
          </div>
        </div>

        {testResult ? (
          <div className="mx-5 sm:mx-7 mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-700">
            {testResult}
          </div>
        ) : null}

        {isLoading ? (
          <div className="py-16 flex justify-center text-slate-400">
            <Loader2 className="animate-spin" size={22} />
          </div>
        ) : rules.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              icon={Zap}
              headline="No automation rules yet"
              description="Create a keyword trigger so Instagram comments auto-send a DM with your Clikd storefront link."
              ctaLabel="+ Create Comment-to-DM Rule"
              onCta={openCreate}
            />
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className="px-5 sm:px-7 py-4 flex flex-col lg:flex-row lg:items-center gap-4"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {rule.title}
                    </p>
                    <span
                      className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        rule.isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {rule.isActive ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {rule.triggerKeywords.map((kw) => (
                      <span
                        key={kw}
                        className="inline-flex items-center h-8 px-2.5 rounded-lg bg-[#2B2568]/[0.06] text-[#2B2568] text-xs font-extrabold tracking-wide"
                      >
                        #{kw.toUpperCase()}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {rule.dmMessageText}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {rule.totalDmsSent} DMs sent · {rule.storefrontClicks} clicks
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={rule.isActive}
                    aria-label={
                      rule.isActive ? 'Pause automation' : 'Activate automation'
                    }
                    disabled={
                      toggleMutation.isPending &&
                      String(toggleMutation.variables?.id) === String(rule.id)
                    }
                    onClick={() => toggleMutation.mutate(rule)}
                    className={`relative h-11 min-h-[44px] w-[52px] rounded-full transition-colors disabled:opacity-60 ${
                      rule.isActive ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`absolute top-1.5 h-8 w-8 rounded-full bg-white shadow transition-transform ${
                        rule.isActive ? 'left-5' : 'left-1.5'
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(rule)}
                    className="h-11 min-h-[44px] min-w-[44px] px-3 rounded-xl border border-slate-200 bg-white text-slate-700 inline-flex items-center justify-center gap-1.5 text-xs font-bold"
                  >
                    <Pencil size={14} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Delete this automation rule?')) {
                        deleteMutation.mutate(String(rule.id));
                      }
                    }}
                    className="h-11 min-h-[44px] min-w-[44px] px-3 rounded-xl border border-rose-100 bg-rose-50 text-rose-700 inline-flex items-center justify-center gap-1.5 text-xs font-bold"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => !saveMutation.isPending && setModalOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                  Comment-to-DM
                </p>
                <h3 className="font-clikd-wordmark font-extrabold text-xl text-slate-900 mt-1">
                  {form.id ? 'Edit rule' : 'Create Comment-to-DM Rule'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-slate-50 inline-flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-slate-600">Title</span>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Masterclass keyword"
                className="w-full h-11 min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-slate-600">
                Trigger Keywords (comma-separated)
              </span>
              <input
                value={form.triggerKeywords}
                onChange={(e) =>
                  setForm((f) => ({ ...f, triggerKeywords: e.target.value }))
                }
                placeholder="KURS, MASTERCLASS, START"
                className="w-full h-11 min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm font-mono"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-slate-600">Direct Message</span>
              <textarea
                value={form.dmMessageText}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dmMessageText: e.target.value }))
                }
                rows={4}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm resize-y min-h-[110px]"
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-slate-600">Button Label</span>
                <input
                  value={form.ctaButtonLabel}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ctaButtonLabel: e.target.value }))
                  }
                  className="w-full h-11 min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm"
                />
              </label>
              <label className="block space-y-1.5 sm:col-span-1">
                <span className="text-xs font-bold text-slate-600">
                  Clikd Storefront Link
                </span>
                <input
                  value={form.ctaButtonUrl}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ctaButtonUrl: e.target.value }))
                  }
                  placeholder={storefrontDefault}
                  className="w-full h-11 min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm font-mono"
                />
              </label>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.replyToCommentPublicly}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      replyToCommentPublicly: e.target.checked,
                    }))
                  }
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm font-semibold text-slate-800">
                  Publicera även automatiskt kommentarsvar
                </span>
              </label>
              {form.replyToCommentPublicly ? (
                <input
                  value={form.publicCommentText}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      publicCommentText: e.target.value,
                    }))
                  }
                  placeholder="Kolla din DM!"
                  className="w-full h-11 min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm"
                />
              ) : null}
            </div>

            <button
              type="button"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate(form)}
              className="h-11 min-h-[44px] w-full rounded-xl bg-[#2B2568] text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saveMutation.isPending ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Plus size={16} />
              )}
              {form.id ? 'Save changes' : 'Create rule'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

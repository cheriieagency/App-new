'use client';

/**
 * Inbox → Automations: Comment-to-DM keyword rules (ManyChat-style).
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Loader2,
  MessageSquarePlus,
  MousePointerClick,
  Percent,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
  Zap,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { adminCardClass, adminKpiClass } from '@/components/admin/AdminUi';
import AdminEmptyState from '@/components/admin/AdminEmptyState';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useLanguage } from '@/lib/locale-context';
import { localeTag, t, tf, type Locale, type TranslationKey } from '@/lib/i18n';

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

type DiagnosticStep = {
  step: string;
  label: string;
  success: boolean;
  message: string;
  fix?: string;
  metaError?: string | null;
  details?: Record<string, unknown>;
};

type LivePrivateReplyResult = {
  attempted?: boolean;
  httpStatus?: number;
  ok?: boolean;
  endpoint?: string;
  pageId?: string;
  igUserId?: string;
  liveCommentId?: string;
  payload?: unknown;
  metaResponse?: Record<string, unknown>;
  metaError?: string | null;
  metaErrorCode?: number | null;
  statusLabel?: string;
};

type LiveDiagnosticResult = {
  ok?: boolean;
  workspaceId?: string;
  error?: string;
  note?: string;
  suggestions?: string[];
  tokenScopes?: string[] | null;
  steps: DiagnosticStep[];
  checklist: {
    instagramTokenValid: boolean;
    metaWebhooksSubscribed: boolean;
    activeRulesFound: boolean;
    privateReplyPayloadOk: boolean;
  };
  livePrivateReply?: LivePrivateReplyResult | null;
};

const CHECKLIST_ROWS: Array<{
  key: keyof LiveDiagnosticResult['checklist'];
  labelKey: TranslationKey;
  stepIds: string[];
}> = [
  {
    key: 'instagramTokenValid',
    labelKey: 'dmCheckToken',
    stepIds: ['TOKEN_CHECK', 'TOKEN_VALIDITY'],
  },
  {
    key: 'metaWebhooksSubscribed',
    labelKey: 'dmCheckWebhooks',
    stepIds: ['WEBHOOK_SUBSCRIPTION'],
  },
  {
    key: 'activeRulesFound',
    labelKey: 'dmCheckRules',
    stepIds: ['AUTOMATION_RULES'],
  },
  {
    key: 'privateReplyPayloadOk',
    labelKey: 'dmCheckPayload',
    stepIds: ['PRIVATE_REPLY_PAYLOAD'],
  },
];

type RecentIgComment = {
  id: string;
  text: string;
  username: string | null;
  createdTime: string | null;
  mediaId?: string | null;
};

/** Numeric Instagram comment ids only (rejects keywords like "marsterclass"). */
function isValidInstagramCommentIdClient(raw: string): boolean {
  const id = String(raw || '')
    .trim()
    .replace(/^["']+|["']+$/g, '');
  return /^\d{10,}$/.test(id);
}

function formatCommentAge(createdTime: string | null, locale: Locale): string {
  if (!createdTime) return t('dmJustNow', locale);
  const ts = Date.parse(createdTime);
  if (!Number.isFinite(ts)) return t('dmJustNow', locale);
  const mins = Math.max(0, Math.round((Date.now() - ts) / 60_000));
  if (mins < 1) return t('dmJustNow', locale);
  if (mins < 60) return tf('dmMinsAgo', locale, { n: mins });
  const hours = Math.round(mins / 60);
  if (hours < 48) return tf('dmHoursAgo', locale, { n: hours });
  const days = Math.round(hours / 24);
  return tf('dmDaysAgo', locale, { n: days });
}

function formatCommentOption(c: RecentIgComment, locale: Locale): string {
  const user = c.username
    ? `@${c.username.replace(/^@/, '')}`
    : t('dmUnknownUser', locale);
  const text = (c.text || '').replace(/\s+/g, ' ').trim();
  const preview =
    text.length > 48
      ? `${text.slice(0, 48).trimEnd()}…`
      : text || t('dmEmptyComment', locale);
  return `${user}: "${preview}" (${formatCommentAge(c.createdTime, locale)})`;
}

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
  dmMessageText: '',
  ctaButtonLabel: '',
  ctaButtonUrl: '',
  replyToCommentPublicly: true,
  publicCommentText: '',
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
  const [liveDiagnostic, setLiveDiagnostic] =
    useState<LiveDiagnosticResult | null>(null);
  const [liveCommentId, setLiveCommentId] = useState('');
  const [recentComments, setRecentComments] = useState<RecentIgComment[]>([]);
  const [selectedCommentText, setSelectedCommentText] = useState('');
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const [autoWatchLabel, setAutoWatchLabel] = useState('Auto-watching Instagram comments…');

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

  /**
   * Auto Comment-to-DM: poll Instagram for new keyword comments and send Private
   * Replies without “Fetch latest comments” / “Run live test DM”. Complements
   * Meta webhooks (and covers localhost / missed webhook deliveries).
   */
  useEffect(() => {
    if (!activeWorkspace.id) return;

    let cancelled = false;
    let inFlight = false;

    const runPoll = async () => {
      if (cancelled || inFlight) return;
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'hidden'
      ) {
        return;
      }
      inFlight = true;
      try {
        const res = await fetch('/api/admin/inbox/automations/poll', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-workspace-id': activeWorkspace.id,
          },
          credentials: 'include',
          body: JSON.stringify({ workspaceId: activeWorkspace.id }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          sent?: number;
          matched?: number;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setAutoWatchLabel(
            json.error
              ? `Auto-watch paused: ${json.error}`
              : 'Auto-watch paused (retrying…)'
          );
          return;
        }
        const sent = Number(json.sent) || 0;
        setAutoWatchLabel(
          sent > 0
            ? `Auto-sent ${sent} DM${sent === 1 ? '' : 's'} — watching for new comments…`
            : 'Auto-watching Instagram comments…'
        );
        if (sent > 0) {
          toast.success(
            `Comment-to-DM auto-sent ${sent} DM${sent === 1 ? '' : 's'}`
          );
          void qc.invalidateQueries({
            queryKey: ['dm-automations', activeWorkspace.id],
          });
        }
      } catch (err) {
        console.warn('[DMAutomationPanel] auto-poll failed', err);
        if (!cancelled) {
          setAutoWatchLabel('Auto-watch paused (retrying…)');
        }
      } finally {
        inFlight = false;
      }
    };

    void runPoll();
    const intervalId = window.setInterval(runPoll, 45_000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void runPoll();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [activeWorkspace.id, qc]);

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
      toast.success(
        form.id
          ? t('toastRuleUpdated', locale)
          : t('toastCommentToDmCreated', locale)
      );
      setModalOpen(false);
      setForm(EMPTY_FORM);
      void qc.invalidateQueries({ queryKey: ['dm-automations', activeWorkspace.id] });
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : t('toastSaveFailed', locale)
      );
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
        let message = t('toastToggleFailed', locale);
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
      toast.error(
        err instanceof Error ? err.message : t('toastToggleFailed', locale)
      );
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
        let message = t('toastDeleteAutomationFailed', locale);
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
      toast.success(t('toastAutomationDeleted', locale));
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
      toast.error(
        err instanceof Error
          ? err.message
          : t('toastDeleteAutomationFailed', locale)
      );
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

  const liveDiagnosticMutation = useMutation({
    mutationFn: async (opts?: {
      liveCommentId?: string;
      commentText?: string;
    }) => {
      const raw = opts?.liveCommentId?.trim() || '';
      // Only forward a numeric Instagram comment id — never keywords.
      const commentId = isValidInstagramCommentIdClient(raw) ? raw : undefined;
      if (raw && !commentId) {
        throw new Error(t('dmInvalidCommentId', locale));
      }
      const res = await fetch('/api/admin/inbox/automations/test-live', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': activeWorkspace.id,
        },
        credentials: 'include',
        body: JSON.stringify({
          workspaceId: activeWorkspace.id,
          ...(commentId
            ? {
                liveCommentId: commentId,
                commentText: opts?.commentText || selectedCommentText || undefined,
              }
            : {}),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as LiveDiagnosticResult & {
        error?: string;
      };
      if (!res.ok && !json.steps?.length) {
        throw new Error(json.error || `Live diagnostic failed (${res.status})`);
      }
      return {
        ...json,
        steps: Array.isArray(json.steps) ? json.steps : [],
        checklist: json.checklist ?? {
          instagramTokenValid: false,
          metaWebhooksSubscribed: false,
          activeRulesFound: false,
          privateReplyPayloadOk: false,
        },
        livePrivateReply: json.livePrivateReply ?? null,
      } satisfies LiveDiagnosticResult;
    },
    onSuccess: (json) => {
      setLiveDiagnostic(json);
      if (json.workspaceId && json.workspaceId !== activeWorkspace.id) {
        setActiveWorkspaceId(json.workspaceId);
      }
      const live = json.livePrivateReply;
      if (live?.attempted) {
        if (live.ok) {
          toast.success(
            `Live Private Reply OK — HTTP ${live.statusLabel || live.httpStatus}`
          );
        } else {
          toast.error(
            live.metaError ||
              `Live Private Reply failed — HTTP ${live.statusLabel || live.httpStatus}`
          );
        }
        return;
      }
      if (json.ok) {
        toast.success(t('toastLiveDiagnosticPassed', locale));
      } else {
        toast.error(
          json.suggestions?.[0] ||
            json.steps?.find((s) => !s.success)?.message ||
            'Live diagnostic found issues.'
        );
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Live diagnostic failed');
    },
  });

  const fetchCommentsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/admin/inbox/automations/test-live?action=fetch_comments&workspaceId=${encodeURIComponent(activeWorkspace.id)}`,
        {
          method: 'GET',
          headers: { 'x-workspace-id': activeWorkspace.id },
          credentials: 'include',
        }
      );
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        comments?: RecentIgComment[];
        error?: string;
      };
      if (!res.ok || json.success === false) {
        throw new Error(json.error || t('toastFetchCommentsFailed', locale));
      }
      return Array.isArray(json.comments) ? json.comments : [];
    },
    onSuccess: (comments) => {
      setRecentComments(comments);
      if (comments.length === 0) {
        toast.message(t('toastNoRecentIgComments', locale));
        return;
      }
      toast.success(
        tf('toastFetchedIgComments', locale, { count: comments.length })
      );
      // Auto-select the newest comment for one-click live test.
      const first = comments[0];
      if (first?.id) {
        setLiveCommentId(first.id);
        setSelectedCommentText(first.text || '');
      }
    },
    onError: (err) => {
      toast.error(
        err instanceof Error
          ? err.message
          : t('toastFetchCommentsFailed', locale)
      );
    },
  });

  const openCreate = () => {
    setForm({
      ...EMPTY_FORM,
      dmMessageText: t('dmDefaultMessage', locale),
      ctaButtonLabel: t('dmDefaultCta', locale),
      publicCommentText: t('dmDefaultPublicReply', locale),
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
      ctaButtonLabel: rule.ctaButtonLabel || t('dmDefaultCta', locale),
      ctaButtonUrl: rule.ctaButtonUrl || storefrontDefault,
      replyToCommentPublicly: rule.replyToCommentPublicly,
      publicCommentText: rule.publicCommentText || t('dmDefaultPublicReply', locale),
      isActive: rule.isActive,
    });
    setModalOpen(true);
  };

  const kpiCards = [
    {
      label: t('dmKpiActiveTriggers', locale),
      value: tf('dmKpiRules', locale, { n: kpis.activeTriggers }),
      icon: Zap,
    },
    {
      label: t('dmKpiDmsSent', locale),
      value: tf('dmKpiDms', locale, {
        n: kpis.dmsSentThisMonth.toLocaleString(tag),
      }),
      icon: MessageSquarePlus,
    },
    {
      label: t('dmKpiStorefrontClicks', locale),
      value: tf('dmKpiClicks', locale, {
        n: kpis.storefrontClicks.toLocaleString(tag),
      }),
      icon: MousePointerClick,
    },
    {
      label: t('dmKpiConversion', locale),
      value: `${kpis.conversionRate.toLocaleString(tag, { maximumFractionDigits: 1 })}%`,
      icon: Percent,
    },
  ];

  return (
    <div className="space-y-4">
      {isError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <p>
            {t('dmLoadFailed', locale)}{' '}
            {error instanceof Error ? error.message : t('dmUnknownError', locale)}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="h-11 min-h-[44px] px-4 rounded-xl bg-[#2B2568] text-white text-xs font-extrabold"
          >
            {t('dmRetry', locale)}
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
              {t('dmTitle', locale)}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {t('dmSub', locale)}
            </p>
            <p className="text-xs font-semibold text-emerald-700 mt-1.5 flex items-center gap-1.5">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"
                aria-hidden
              />
              {autoWatchLabel}
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
              {t('dmResyncWebhooks', locale)}
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="h-11 min-h-[44px] px-4 rounded-xl bg-[#F472B6] text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 hover:opacity-90 shadow-sm shadow-[#F472B6]/25"
            >
              <Plus size={16} />
              {t('dmCreateRule', locale)}
            </button>
          </div>
        </div>

        {/* Developer tools — collapsed by default to keep the Automations UI clean */}
        <div className="mx-5 sm:mx-7 mt-4 mb-4">
          <button
            type="button"
            onClick={() => setDevToolsOpen((v) => !v)}
            className="w-full sm:w-auto h-11 min-h-[44px] px-3 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 inline-flex items-center gap-2 transition-colors"
            aria-expanded={devToolsOpen}
          >
            <span aria-hidden>🛠️</span>
            {t('dmDevTools', locale)}
            <span className="text-slate-400 font-mono">
              {devToolsOpen ? '▾' : '▸'}
            </span>
          </button>

          {devToolsOpen ? (
            <div className="mt-3 space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 sm:p-5">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => liveDiagnosticMutation.mutate({})}
                  disabled={liveDiagnosticMutation.isPending}
                  className="h-11 min-h-[44px] px-4 rounded-xl border border-[#2B2568]/20 bg-white text-slate-800 text-sm font-extrabold inline-flex items-center justify-center gap-2 hover:bg-white disabled:opacity-50"
                >
                  {liveDiagnosticMutation.isPending && !liveCommentId.trim() ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Search size={16} />
                  )}
                  {t('dmRunLiveDebug', locale)}
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
                  {t('dmTestAutomation', locale)}
                </button>
                <button
                  type="button"
                  onClick={() => fetchCommentsMutation.mutate()}
                  disabled={fetchCommentsMutation.isPending}
                  className="h-11 min-h-[44px] px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-extrabold inline-flex items-center justify-center gap-2 hover:bg-slate-50 disabled:opacity-50"
                >
                  {fetchCommentsMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <RefreshCw size={16} />
                  )}
                  {t('dmFetchComments', locale)}
                </button>
              </div>

              {testResult ? (
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-medium text-slate-700">
                  {testResult}
                </div>
              ) : null}

              <label className="block min-w-0">
                <span className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t('dmSelectRecentComment', locale)}
                </span>
                <select
                  value={liveCommentId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setLiveCommentId(id);
                    const match = recentComments.find((c) => c.id === id);
                    setSelectedCommentText(match?.text || '');
                  }}
                  disabled={recentComments.length === 0}
                  className="w-full h-11 min-h-[44px] px-3.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2B2568]/25 disabled:opacity-60"
                >
                  <option value="">
                    {recentComments.length === 0
                      ? t('dmFetchCommentsFirst', locale)
                      : t('dmPickComment', locale)}
                  </option>
                  {recentComments.map((c) => (
                    <option key={c.id} value={c.id}>
                      {formatCommentOption(c, locale)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <label className="flex-1 min-w-0">
                  <span className="block text-xs font-bold text-slate-700 mb-1.5">
                    {t('dmCommentIdLabel', locale)}
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={liveCommentId}
                    onChange={(e) => {
                      setLiveCommentId(e.target.value);
                      setSelectedCommentText('');
                    }}
                    placeholder={t('dmCommentIdPlaceholder', locale)}
                    className="w-full h-11 min-h-[44px] px-3.5 rounded-xl border border-slate-200 bg-white text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2B2568]/25"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const id = liveCommentId.trim();
                    if (!id || !isValidInstagramCommentIdClient(id)) {
                      toast.error(t('dmInvalidCommentId', locale));
                      return;
                    }
                    liveDiagnosticMutation.mutate({
                      liveCommentId: id,
                      commentText: selectedCommentText,
                    });
                  }}
                  disabled={
                    liveDiagnosticMutation.isPending ||
                    !isValidInstagramCommentIdClient(liveCommentId)
                  }
                  className="h-11 min-h-[44px] px-4 rounded-xl bg-[#2B2568] text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 hover:bg-[#1a1848] disabled:opacity-50 shrink-0"
                >
                  {liveDiagnosticMutation.isPending && liveCommentId.trim() ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Zap size={16} />
                  )}
                  {t('dmRunLiveTestDm', locale)}
                </button>
              </div>

              {liveDiagnostic ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
                        {t('dmDiagnosticTitle', locale)}
                      </p>
                      <p className="text-sm font-bold text-slate-900 mt-1">
                        {liveDiagnostic.ok
                          ? t('dmAllChecksPassed', locale)
                          : t('dmIssuesFound', locale)}
                      </p>
                      {liveDiagnostic.note ? (
                        <p className="text-xs text-slate-500 mt-1">
                          {liveDiagnostic.note}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => setLiveDiagnostic(null)}
                      className="h-9 min-h-[36px] px-3 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200 inline-flex items-center gap-1 self-start"
                    >
                      <X size={14} />
                      {t('dmDismiss', locale)}
                    </button>
                  </div>

                  <ul className="space-y-2">
                    {CHECKLIST_ROWS.map((row) => {
                      const ok = Boolean(liveDiagnostic.checklist?.[row.key]);
                      const relatedSteps =
                        liveDiagnostic.steps?.filter((s) =>
                          row.stepIds.includes(s.step)
                        ) ?? [];
                      const failed =
                        relatedSteps.find((s) => !s.success) || relatedSteps[0];
                      return (
                        <li
                          key={row.key}
                          className={`rounded-xl border px-3.5 py-3 flex gap-3 items-start ${
                            ok
                              ? 'border-emerald-200/80 bg-emerald-50/70'
                              : 'border-rose-200/80 bg-rose-50/70'
                          }`}
                        >
                          {ok ? (
                            <CheckCircle2
                              size={18}
                              className="text-emerald-600 flex-shrink-0 mt-0.5"
                              aria-hidden
                            />
                          ) : (
                            <XCircle
                              size={18}
                              className="text-rose-600 flex-shrink-0 mt-0.5"
                              aria-hidden
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-extrabold text-slate-900">
                              {ok ? '✓' : '✗'} {t(row.labelKey, locale)}
                            </p>
                            {failed?.message ? (
                              <p className="text-xs text-slate-600 mt-1 font-medium">
                                {failed.message}
                              </p>
                            ) : null}
                            {failed?.metaError ? (
                              <p className="text-xs text-rose-700 mt-1 font-mono break-words">
                                Meta: {failed.metaError}
                              </p>
                            ) : null}
                            {!ok && failed?.fix ? (
                              <p className="text-xs text-[#2B2568] mt-1.5 font-semibold">
                                {t('dmFixPrefix', locale)} {failed.fix}
                              </p>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  {liveDiagnostic.livePrivateReply?.attempted ? (
                    <div
                      className={`rounded-xl border px-3.5 py-3 ${
                        liveDiagnostic.livePrivateReply.ok
                          ? 'border-emerald-200 bg-emerald-50/80'
                          : 'border-rose-200 bg-rose-50/80'
                      }`}
                    >
                      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
                        {t('dmLiveReplyResult', locale)}
                      </p>
                      <p className="text-sm font-extrabold text-slate-900 mt-1">
                        {liveDiagnostic.livePrivateReply.ok ? '✓' : '✗'} HTTP{' '}
                        {liveDiagnostic.livePrivateReply.statusLabel ||
                          liveDiagnostic.livePrivateReply.httpStatus}
                      </p>
                      {liveDiagnostic.livePrivateReply.endpoint ? (
                        <p className="text-[11px] font-mono text-slate-600 mt-1 break-all">
                          Endpoint: {liveDiagnostic.livePrivateReply.endpoint}
                          {liveDiagnostic.livePrivateReply.pageId
                            ? ` · page_id=${liveDiagnostic.livePrivateReply.pageId}`
                            : ''}
                        </p>
                      ) : null}
                      {liveDiagnostic.livePrivateReply.metaError ? (
                        <p className="text-xs text-rose-700 mt-1 font-mono break-words">
                          Meta: {liveDiagnostic.livePrivateReply.metaError}
                        </p>
                      ) : null}
                      <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-slate-900 text-slate-100 text-[11px] p-3 font-mono whitespace-pre-wrap break-words">
                        {JSON.stringify(
                          {
                            httpStatus:
                              liveDiagnostic.livePrivateReply.httpStatus,
                            statusLabel:
                              liveDiagnostic.livePrivateReply.statusLabel,
                            pageId: liveDiagnostic.livePrivateReply.pageId,
                            payload: liveDiagnostic.livePrivateReply.payload,
                            metaResponse:
                              liveDiagnostic.livePrivateReply.metaResponse,
                          },
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {isLoading ? (
          <div className="py-16 flex justify-center text-slate-400">
            <Loader2 className="animate-spin" size={22} />
          </div>
        ) : rules.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              icon={Zap}
              headline={t('dmEmptyHeadline', locale)}
              description={t('dmEmptyDesc', locale)}
              ctaLabel={t('dmEmptyCta', locale)}
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
                      {rule.isActive ? t('dmActive', locale) : t('dmPaused', locale)}
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
                    {tf('dmDmsSentClicks', locale, {
                      dms: rule.totalDmsSent,
                      clicks: rule.storefrontClicks,
                    })}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={rule.isActive}
                    aria-label={
                      rule.isActive
                        ? t('dmPauseAria', locale)
                        : t('dmActivateAria', locale)
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
                    <Pencil size={14} /> {t('dmEdit', locale)}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(t('dmDeleteConfirm', locale))) {
                        deleteMutation.mutate(String(rule.id));
                      }
                    }}
                    className="h-11 min-h-[44px] min-w-[44px] px-3 rounded-xl border border-rose-100 bg-rose-50 text-rose-700 inline-flex items-center justify-center gap-1.5 text-xs font-bold"
                  >
                    <Trash2 size={14} /> {t('dmDelete', locale)}
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
            aria-label={t('dmClose', locale)}
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
                  {t('dmModalEyebrow', locale)}
                </p>
                <h3 className="font-clikd-wordmark font-extrabold text-xl text-slate-900 mt-1">
                  {form.id ? t('dmEditRule', locale) : t('dmCreateRuleTitle', locale)}
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
              <span className="text-xs font-bold text-slate-600">{t('dmFieldTitle', locale)}</span>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={t('dmTitlePlaceholder', locale)}
                className="w-full h-11 min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-slate-600">
                {t('dmFieldKeywords', locale)}
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
              <span className="text-xs font-bold text-slate-600">{t('dmFieldDm', locale)}</span>
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
                <span className="text-xs font-bold text-slate-600">{t('dmFieldButton', locale)}</span>
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
                  {t('dmFieldStorefront', locale)}
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
                  {t('dmPublicReplyToggle', locale)}
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
                  placeholder={t('dmDefaultPublicReply', locale)}
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
              {form.id ? t('dmSaveChanges', locale) : t('dmCreateRuleBtn', locale)}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

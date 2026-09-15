'use client';

/**
 * Analytics → Monthly Reports: directory, automation, builder, guest preview.
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarRange,
  Copy,
  ExternalLink,
  FileDown,
  FileText,
  Loader2,
  Settings2,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { adminCardClass } from '@/components/admin/AdminUi';
import { useWorkspace } from '@/context/WorkspaceContext';
import { getSiteUrl } from '@/lib/site';
import GuestReportDocument from '@/components/admin/analytics/GuestReportDocument';

type EngineTab = 'directory' | 'automation' | 'builder' | 'preview';

type ReportRow = {
  id: string;
  title: string;
  period_start: string;
  period_end: string;
  date_range_label?: string;
  platforms: string[];
  metrics: {
    views: number;
    engagementRate: number;
    followerGrowth: number;
    totalFollowers?: number;
    followersByPlatform?: Array<{
      platform: string;
      handle: string | null;
      count: number;
    }>;
    totalPosts: number;
    likes?: number;
    comments?: number;
    shares?: number;
    topPosts?: Array<{
      id: string;
      platform: string;
      title: string;
      mediaUrl?: string;
      impressions: number;
      likes?: number;
      comments?: number;
      engagementRate: number;
    }>;
    platformBreakdown?: Array<{
      platform: string;
      posts: number;
      views: number;
      engagementRate: number;
    }>;
  };
  ai_insights: {
    executiveSummary: string;
    wins: string[];
    improvements: string[];
    recommendations: string[];
  } | null;
  hide_ai_on_public_link: boolean;
  is_automated: boolean;
  public_share_token: string;
  created_at: string;
  workspace_name?: string | null;
};

type AutomationConfig = {
  enabled: boolean;
  recipient_emails: string[];
  platforms: string[];
  custom_email_note: string | null;
  subject_template: string;
  hide_ai_on_public_link: boolean;
  send_day_of_month?: number;
};

const PLATFORM_OPTIONS = ['instagram', 'facebook', 'tiktok'] as const;

function shareUrl(token: string) {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/reports/share/${token}`;
  }
  return `${getSiteUrl()}/reports/share/${token}`;
}

function monthAgoRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function num(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function MonthlyReportEngine() {
  const { locale } = useLocale();
  const { activeWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const [tab, setTab] = useState<EngineTab>('directory');
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  /** Prefer the report just built / selected so preview works before refetch. */
  const [selectedReport, setSelectedReport] = useState<ReportRow | null>(null);

  const rangeDefault = useMemo(() => monthAgoRange(), []);
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(rangeDefault.start);
  const [endDate, setEndDate] = useState(rangeDefault.end);
  const [platforms, setPlatforms] = useState<string[]>([
    'instagram',
    'facebook',
    'tiktok',
  ]);
  const [includeAi, setIncludeAi] = useState(true);
  const [hideAiPublic, setHideAiPublic] = useState(false);
  const [includeInDepth, setIncludeInDepth] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeCsv, setIncludeCsv] = useState(true);

  const [autoEnabled, setAutoEnabled] = useState(false);
  const [autoEmails, setAutoEmails] = useState('');
  const [autoPlatforms, setAutoPlatforms] = useState<string[]>([
    'instagram',
    'facebook',
    'tiktok',
  ]);
  const [autoNote, setAutoNote] = useState('');
  const [autoSubject, setAutoSubject] = useState(
    'Your {{month}} performance report — {{workspace}}'
  );
  const [autoHideAi, setAutoHideAi] = useState(false);
  const [autoSendDay, setAutoSendDay] = useState(1);

  // Never keep another workspace's report selected after switching brands.
  useEffect(() => {
    setSelectedReport(null);
    setPreviewToken(null);
    setTab('directory');
  }, [activeWorkspace.id]);

  const reportsQuery = useQuery({
    queryKey: ['monthly-reports', activeWorkspace.id],
    queryFn: async () => {
      const r = await fetch(
        `/api/admin/reports?workspaceId=${encodeURIComponent(activeWorkspace.id)}`,
        {
          headers: {
            'x-workspace-id': activeWorkspace.id,
            'x-active-workspace-id': activeWorkspace.id,
          },
          credentials: 'include',
          cache: 'no-store',
        }
      );
      const json = (await r.json().catch(() => ({}))) as {
        reports?: ReportRow[];
        error?: string;
      };
      if (!r.ok) {
        throw new Error(json.error || 'Failed to load reports');
      }
      return { reports: json.reports || [] };
    },
    enabled: Boolean(activeWorkspace.id),
  });

  const automationQuery = useQuery({
    queryKey: ['report-automation', activeWorkspace.id],
    queryFn: async () => {
      const r = await fetch(
        `/api/admin/reports/automation?workspaceId=${encodeURIComponent(activeWorkspace.id)}`,
        {
          headers: {
            'x-workspace-id': activeWorkspace.id,
            'x-active-workspace-id': activeWorkspace.id,
          },
          credentials: 'include',
          cache: 'no-store',
        }
      );
      const json = (await r.json().catch(() => ({}))) as {
        config?: AutomationConfig;
        error?: string;
      };
      if (!r.ok) {
        throw new Error(json.error || 'Failed to load automation');
      }
      return { config: json.config as AutomationConfig };
    },
    enabled: Boolean(activeWorkspace.id),
  });

  // Hydrate automation form when loaded
  useEffect(() => {
    const c = automationQuery.data?.config;
    if (!c) return;
    setAutoEnabled(Boolean(c.enabled));
    setAutoEmails((c.recipient_emails || []).join(', '));
    const cleaned = (c.platforms?.length
      ? c.platforms
      : ['instagram', 'facebook', 'tiktok']
    )
      .map((p) => (p === 'tiktok_business' ? 'tiktok' : p))
      .filter((p) =>
        p === 'instagram' || p === 'facebook' || p === 'tiktok'
      );
    setAutoPlatforms(
      cleaned.length ? [...new Set(cleaned)] : ['instagram', 'facebook', 'tiktok']
    );
    setAutoNote(c.custom_email_note || '');
    setAutoSubject(
      c.subject_template ||
        'Your {{month}} performance report — {{workspace}}'
    );
    setAutoHideAi(Boolean(c.hide_ai_on_public_link));
    setAutoSendDay(
      Math.min(28, Math.max(1, Number(c.send_day_of_month) || 1))
    );
  }, [automationQuery.data]);

  const buildMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': activeWorkspace.id,
          'x-active-workspace-id': activeWorkspace.id,
        },
        credentials: 'include',
        body: JSON.stringify({
          workspaceId: activeWorkspace.id,
          workspace_id: activeWorkspace.id,
          workspaceName: activeWorkspace.name,
          title:
            title.trim() ||
            `${activeWorkspace.name} · ${startDate} → ${endDate}` ||
            'Monthly Analytics Report',
          startDate,
          start_date: startDate,
          endDate,
          end_date: endDate,
          dateRangeLabel: `${startDate} - ${endDate}`,
          date_range_label: `${startDate} - ${endDate}`,
          platforms,
          includeAiAnalysis: includeAi,
          hideAiOnPublicLink: hideAiPublic,
          includeInDepth,
          includeCharts,
          includeCsv,
        }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || t('toastBuildFailed', locale));
      return json as { report: ReportRow };
    },
    onSuccess: (json) => {
      toast.success(t('toastFrozenReportCreated', locale));
      setSelectedReport(json.report);
      setPreviewToken(json.report.public_share_token);
      void qc.invalidateQueries({ queryKey: ['monthly-reports'] });
      setTab('preview');
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : t('toastBuildFailed', locale)
      );
    },
  });

  const saveAutomation = useMutation({
    mutationFn: async () => {
      const recipientEmails = autoEmails
        .split(/[,;\s]+/)
        .map((e) => e.trim())
        .filter(Boolean);
      if (autoEnabled && recipientEmails.length === 0) {
        throw new Error('Add at least one recipient email to enable automation');
      }
      if (autoEnabled && autoPlatforms.length === 0) {
        throw new Error('Select at least one platform for automation');
      }
      const r = await fetch('/api/admin/reports/automation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': activeWorkspace.id,
        },
        body: JSON.stringify({
          workspaceId: activeWorkspace.id,
          workspace_id: activeWorkspace.id,
          enabled: autoEnabled,
          recipientEmails,
          platforms: autoPlatforms,
          customEmailNote: autoNote || null,
          subjectTemplate: autoSubject || 'Your {{month}} performance report — {{workspace}}',
          hideAiOnPublicLink: autoHideAi,
          sendDayOfMonth: autoSendDay,
        }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || t('toastSaveFailed', locale));
      return json;
    },
    onSuccess: () => {
      toast.success(t('toastAutomationSaved', locale));
      void qc.invalidateQueries({ queryKey: ['report-automation'] });
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : t('toastSaveFailed', locale)
      );
    },
  });

  const runAutomation = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/admin/reports/automation/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': activeWorkspace.id,
        },
        body: JSON.stringify({
          workspaceId: activeWorkspace.id,
          workspaceName: activeWorkspace.name,
          sendEmail: true,
        }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || 'Run failed');
      return json as { report: ReportRow; emailed?: boolean; message?: string };
    },
    onSuccess: (json) => {
      toast.success(
        json.emailed
          ? 'Previous-month report created and emailed'
          : json.message || 'Previous-month report created'
      );
      setSelectedReport(json.report);
      setPreviewToken(json.report.public_share_token);
      void qc.invalidateQueries({ queryKey: ['monthly-reports'] });
      setTab('preview');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Run failed');
    },
  });

  const deleteReport = useMutation({
    mutationFn: async (reportId: string) => {
      const r = await fetch(
        `/api/admin/reports?id=${encodeURIComponent(reportId)}&workspaceId=${encodeURIComponent(activeWorkspace.id)}`,
        {
          method: 'DELETE',
          headers: { 'x-workspace-id': activeWorkspace.id },
          credentials: 'include',
        }
      );
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || t('toastDeleteFailed', locale));
      return json;
    },
    onSuccess: () => {
      toast.success(t('toastReportDeleted', locale));
      setSelectedReport(null);
      setPreviewToken(null);
      void qc.invalidateQueries({ queryKey: ['monthly-reports', activeWorkspace.id] });
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : t('toastDeleteFailed', locale)
      );
    },
  });

  const reports = reportsQuery.data?.reports || [];
  const previewReport =
    selectedReport ||
    (previewToken
      ? reports.find((r) => r.public_share_token === previewToken) ?? null
      : null);

  const tabs: { key: EngineTab; label: string; icon: React.ElementType }[] = [
    { key: 'directory', label: 'Saved Reports Directory', icon: FileText },
    { key: 'automation', label: 'Monthly email automation', icon: Settings2 },
    { key: 'builder', label: 'Report Builder & AI', icon: Wand2 },
    { key: 'preview', label: 'Client Guest View Preview', icon: ExternalLink },
  ];

  const togglePlatform = (
    list: string[],
    setList: (v: string[]) => void,
    p: string
  ) => {
    setList(
      list.includes(p) ? list.filter((x) => x !== p) : [...list, p]
    );
  };

  const openPdf = (token: string) => {
    const url = `${shareUrl(token)}?print=1`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-5">
      <div className={`${adminCardClass} p-4 sm:p-5`}>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] font-mono font-medium uppercase tracking-[0.14em] text-[#8A857D]">
              Monthly reports
            </p>
            <h2 className="font-playfair font-medium text-xl text-[#2C2621] tracking-tight mt-1">
              Performance snapshots for clients
            </h2>
            <p className="text-sm text-[#8A857D] mt-1">
              Freeze metrics for <span className="font-medium text-[#2C2621]">{activeWorkspace.name}</span> only —
              reports never cross users or workspaces. Share a guest link or PDF, and email clients on a day you choose each month.
            </p>
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {tabs.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`h-11 min-h-[44px] px-3 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-[#2C3B2E] text-white'
                    : 'bg-[#F0EFEA] text-[#8A857D] hover:bg-[#F0EFEA] border border-[#E6E3DB]'
                }`}
              >
                <Icon size={13} /> {label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === 'directory' && (
        <div className={`${adminCardClass} overflow-hidden`}>
          <div className="px-5 py-4 border-b border-[#E6E3DB] flex items-center justify-between">
            <h3 className="text-sm font-medium text-[#2C2621]">Saved reports</h3>
            <button
              type="button"
              onClick={() => setTab('builder')}
              className="h-10 min-h-[40px] px-3 rounded-xl bg-clikd-pink text-white text-xs font-medium"
            >
              New report
            </button>
          </div>
          {reportsQuery.isLoading ? (
            <div className="py-12 flex justify-center text-[#8A857D] gap-2 text-sm">
              <Loader2 className="animate-spin" size={16} /> Loading…
            </div>
          ) : reportsQuery.isError ? (
            <p className="py-12 text-center text-sm text-rose-500 px-4">
              {reportsQuery.error instanceof Error
                ? reportsQuery.error.message
                : 'Failed to load reports'}
            </p>
          ) : reports.length === 0 ? (
            <p className="py-12 text-center text-sm text-[#8A857D]">
              No frozen reports yet — build one or enable automation.
            </p>
          ) : (
            <ul className="divide-y divide-slate-50">
              {reports.map((r) => {
                const views = num(r.metrics?.views);
                const posts = num(r.metrics?.totalPosts);
                return (
                <li
                  key={r.id}
                  className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#2C2621] truncate">{r.title}</p>
                    <p className="text-xs text-[#8A857D] mt-0.5">
                      {r.date_range_label || `${r.period_start} → ${r.period_end}`}
                      {r.is_automated ? ' · Automated' : ' · Manual'}
                      {' · '}
                      {posts} posts · {views.toLocaleString()} views
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(
                          shareUrl(r.public_share_token)
                        );
                        toast.success(t('toastShareLinkCopied', locale));
                      }}
                      className="h-10 min-h-[40px] px-3 rounded-xl border border-[#E6E3DB] text-xs font-medium inline-flex items-center gap-1.5"
                    >
                      <Copy size={13} /> Copy link
                    </button>
                    <button
                      type="button"
                      onClick={() => openPdf(r.public_share_token)}
                      className="h-10 min-h-[40px] px-3 rounded-xl border border-[#E6E3DB] text-xs font-medium inline-flex items-center gap-1.5"
                    >
                      <FileDown size={13} /> PDF
                    </button>
                    <a
                      href={shareUrl(r.public_share_token)}
                      target="_blank"
                      rel="noreferrer"
                      className="h-10 min-h-[40px] px-3 rounded-xl bg-[#2C3B2E] text-white text-xs font-medium inline-flex items-center gap-1.5"
                    >
                      <ExternalLink size={13} /> Open
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReport(r);
                        setPreviewToken(r.public_share_token);
                        setTab('preview');
                      }}
                      className="h-10 min-h-[40px] px-3 rounded-xl border border-[#E6E3DB] text-xs font-medium"
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      disabled={deleteReport.isPending}
                      onClick={() => {
                        if (
                          window.confirm(
                            'Delete this report? The guest link will stop working.'
                          )
                        ) {
                          deleteReport.mutate(r.id);
                        }
                      }}
                      className="h-10 min-h-[40px] px-3 rounded-xl border border-rose-100 text-rose-600 text-xs font-medium inline-flex items-center gap-1.5"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {tab === 'automation' && (
        <div className={`${adminCardClass} p-5 sm:p-6 space-y-4`}>
          {automationQuery.isError ? (
            <p className="text-sm text-rose-500">
              {automationQuery.error instanceof Error
                ? automationQuery.error.message
                : 'Failed to load automation settings'}
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-[#2C2621]">
                Monthly email automation
              </h3>
              <p className="text-xs text-[#8A857D] mt-0.5">
                Scoped to this workspace only. On your chosen day each month (08:00 UTC),
                we freeze the previous calendar month, create a guest link, and email it
                to the addresses below. Requires CRON_SECRET + RESEND_API_KEY in production.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoEnabled}
              onClick={() => setAutoEnabled((v) => !v)}
              className={`relative h-7 w-12 rounded-full transition-colors flex-shrink-0 ${
                autoEnabled ? 'bg-[rgba(44,59,46,0.08)]' : 'bg-[#E6E3DB]'
              }`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-[#FFFFFF] shadow transition-transform ${
                  autoEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <label className="block">
            <span className="text-[10px] font-mono font-medium uppercase tracking-widest text-[#8A857D]">
              Send day of month
            </span>
            <div className="mt-1.5 flex items-center gap-3">
              <select
                value={autoSendDay}
                onChange={(e) => setAutoSendDay(Number(e.target.value))}
                className="h-11 min-h-[44px] rounded-xl border border-[#E6E3DB] px-3 text-sm font-medium bg-[#FFFFFF]"
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                    {d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[#8A857D]">
                Emails go out on day {autoSendDay} · previous month snapshot
              </p>
            </div>
          </label>

          <label className="block">
            <span className="text-[10px] font-mono font-medium uppercase tracking-widest text-[#8A857D]">
              Recipient emails
            </span>
            <input
              value={autoEmails}
              onChange={(e) => setAutoEmails(e.target.value)}
              placeholder="client@brand.com, you@clikd.app"
              className="mt-1.5 w-full h-11 min-h-[44px] rounded-xl border border-[#E6E3DB] px-3 text-sm"
            />
            <p className="text-[10px] text-[#8A857D] mt-1">
              Comma-separated. Each email gets the guest link (open / print as PDF).
            </p>
          </label>

          <div>
            <span className="text-[10px] font-mono font-medium uppercase tracking-widest text-[#8A857D]">
              Platforms
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {PLATFORM_OPTIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() =>
                    togglePlatform(autoPlatforms, setAutoPlatforms, p)
                  }
                  className={`h-10 min-h-[40px] px-3 rounded-xl text-xs font-medium capitalize ${
                    autoPlatforms.includes(p)
                      ? 'bg-[#2C3B2E] text-white'
                      : 'bg-[#F0EFEA] border border-[#E6E3DB] text-[#8A857D]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-[10px] font-mono font-medium uppercase tracking-widest text-[#8A857D]">
              Subject template
            </span>
            <input
              value={autoSubject}
              onChange={(e) => setAutoSubject(e.target.value)}
              className="mt-1.5 w-full h-11 min-h-[44px] rounded-xl border border-[#E6E3DB] px-3 text-sm"
            />
            <p className="text-[10px] text-[#8A857D] mt-1">
              Tokens: {'{{month}}'} {'{{workspace}}'}
            </p>
          </label>

          <label className="block">
            <span className="text-[10px] font-mono font-medium uppercase tracking-widest text-[#8A857D]">
              Custom email note
            </span>
            <textarea
              value={autoNote}
              onChange={(e) => setAutoNote(e.target.value)}
              rows={3}
              className="mt-1.5 w-full rounded-xl border border-[#E6E3DB] px-3 py-2 text-sm resize-none"
              placeholder="Optional note for your client…"
            />
          </label>

          <label className="flex items-center gap-2 min-h-[44px] cursor-pointer">
            <input
              type="checkbox"
              checked={autoHideAi}
              onChange={(e) => setAutoHideAi(e.target.checked)}
              className="h-4 w-4 rounded border-[#E6E3DB]"
            />
            <span className="text-sm font-medium text-[#2C2621]">
              Hide AI insights on public guest links
            </span>
          </label>

          <label className="flex items-center gap-2 min-h-[44px] cursor-pointer">
            <input
              type="checkbox"
              checked={includeInDepth}
              onChange={(e) => setIncludeInDepth(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <span className="text-sm font-medium text-[#2C2621]">
              Include in-depth post table
            </span>
          </label>
          <label className="flex items-center gap-2 min-h-[44px] cursor-pointer">
            <input
              type="checkbox"
              checked={includeCharts}
              onChange={(e) => setIncludeCharts(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <span className="text-sm font-medium text-[#2C2621]">
              Include graphs / charts
            </span>
          </label>
          <label className="flex items-center gap-2 min-h-[44px] cursor-pointer">
            <input
              type="checkbox"
              checked={includeCsv}
              onChange={(e) => setIncludeCsv(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <span className="text-sm font-medium text-[#2C2621]">
              Include CSV downloads for clients
            </span>
          </label>


          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              disabled={saveAutomation.isPending}
              onClick={() => saveAutomation.mutate()}
              className="h-11 min-h-[44px] px-4 rounded-xl bg-[#2C3B2E] text-white text-xs font-medium inline-flex items-center gap-2 disabled:opacity-60"
            >
              {saveAutomation.isPending ? (
                <Loader2 className="animate-spin" size={14} />
              ) : null}
              Save automation settings
            </button>
            <button
              type="button"
              disabled={runAutomation.isPending}
              onClick={() => runAutomation.mutate()}
              className="h-11 min-h-[44px] px-4 rounded-xl border border-[#E6E3DB] bg-[#FFFFFF] text-[#2C2621] text-xs font-medium inline-flex items-center gap-2 disabled:opacity-60"
            >
              {runAutomation.isPending ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <Wand2 size={14} />
              )}
              Run previous month now
            </button>
          </div>
        </div>
      )}

      {tab === 'builder' && (
        <div className={`${adminCardClass} p-5 sm:p-6 space-y-4`}>
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#2C3B2E]" />
            <h3 className="text-sm font-medium text-[#2C2621]">
              Report builder & AI generator
            </h3>
          </div>

          <label className="block">
            <span className="text-[10px] font-mono font-medium uppercase tracking-widest text-[#8A857D]">
              Title
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`${activeWorkspace.name} monthly report`}
              className="mt-1.5 w-full h-11 min-h-[44px] rounded-xl border border-[#E6E3DB] px-3 text-sm"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[10px] font-mono font-medium uppercase tracking-widest text-[#8A857D]">
                Start date
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1.5 w-full h-11 min-h-[44px] rounded-xl border border-[#E6E3DB] px-3 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-mono font-medium uppercase tracking-widest text-[#8A857D]">
                End date
              </span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1.5 w-full h-11 min-h-[44px] rounded-xl border border-[#E6E3DB] px-3 text-sm"
              />
            </label>
          </div>

          <div>
            <span className="text-[10px] font-mono font-medium uppercase tracking-widest text-[#8A857D]">
              Platforms
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {PLATFORM_OPTIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(platforms, setPlatforms, p)}
                  className={`h-10 min-h-[40px] px-3 rounded-xl text-xs font-medium capitalize ${
                    platforms.includes(p)
                      ? 'bg-[#2C3B2E] text-white'
                      : 'bg-[#F0EFEA] border border-[#E6E3DB] text-[#8A857D]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 min-h-[44px] cursor-pointer">
            <input
              type="checkbox"
              checked={includeAi}
              onChange={(e) => setIncludeAi(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <span className="text-sm font-medium text-[#2C2621]">
              Include AI analysis (gpt-4o-mini)
            </span>
          </label>
          <label className="flex items-center gap-2 min-h-[44px] cursor-pointer">
            <input
              type="checkbox"
              checked={hideAiPublic}
              onChange={(e) => setHideAiPublic(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <span className="text-sm font-medium text-[#2C2621]">
              Hide AI insights on public guest link
            </span>
          </label>

          <button
            type="button"
            disabled={buildMutation.isPending || platforms.length === 0}
            onClick={() => buildMutation.mutate()}
            className="h-11 min-h-[44px] px-4 rounded-xl bg-clikd-pink text-white text-xs font-medium inline-flex items-center gap-2 disabled:opacity-50"
          >
            {buildMutation.isPending ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <CalendarRange size={14} />
            )}
            Freeze report & generate AI
          </button>
        </div>
      )}

      {tab === 'preview' && (
        <div className="space-y-4">
          {!previewReport ? (
            <div className={`${adminCardClass} py-12 text-center text-sm text-[#8A857D]`}>
              Build or select a report to preview the guest view.
            </div>
          ) : (
            <>
              <div className={`${adminCardClass} p-4 flex flex-wrap items-center gap-2 justify-between`}>
                <p className="text-xs text-[#8A857D] font-medium">
                  Guest link preview (same data as public page)
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(
                        shareUrl(previewReport.public_share_token)
                      );
                      toast.success(t('toastShareLinkCopied', locale));
                    }}
                    className="h-10 min-h-[40px] px-3 rounded-xl border border-[#E6E3DB] text-xs font-medium inline-flex items-center gap-1.5"
                  >
                    <Copy size={13} /> Copy link
                  </button>
                  <button
                    type="button"
                    onClick={() => openPdf(previewReport.public_share_token)}
                    className="h-10 min-h-[40px] px-3 rounded-xl border border-[#E6E3DB] text-xs font-medium inline-flex items-center gap-1.5"
                  >
                    <FileDown size={13} /> Save as PDF
                  </button>
                  <a
                    href={shareUrl(previewReport.public_share_token)}
                    target="_blank"
                    rel="noreferrer"
                    className="h-10 min-h-[40px] px-3 rounded-xl bg-[#2C3B2E] text-[#F9F8F6] text-xs font-medium inline-flex items-center gap-1.5"
                  >
                    <ExternalLink size={13} /> Open full guest page
                  </a>
                </div>
              </div>
              <GuestReportPreview report={previewReport} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function GuestReportPreview({ report }: { report: ReportRow }) {
  const periodLabel =
    report.date_range_label ||
    `${report.period_start} → ${report.period_end}`;
  const showAi = !report.hide_ai_on_public_link && report.ai_insights;

  return (
    <GuestReportDocument
      workspaceName={report.workspace_name || 'Workspace'}
      title={report.title}
      periodLabel={periodLabel}
      metrics={report.metrics}
      aiInsights={showAi ? report.ai_insights : null}
    />
  );
}

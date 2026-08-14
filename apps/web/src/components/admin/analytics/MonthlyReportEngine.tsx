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
import { adminCardClass } from '@/components/admin/AdminUi';
import { useWorkspace } from '@/context/WorkspaceContext';
import { getSiteUrl } from '@/lib/site';

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
    totalPosts: number;
    topPosts?: Array<{
      id: string;
      platform: string;
      title: string;
      impressions: number;
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

const PLATFORM_OPTIONS = ['instagram', 'facebook', 'tiktok', 'youtube'] as const;

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
      if (!r.ok) throw new Error('Failed to load reports');
      return r.json() as Promise<{ reports: ReportRow[] }>;
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
      if (!r.ok) throw new Error('Failed to load automation');
      return r.json() as Promise<{ config: AutomationConfig }>;
    },
    enabled: Boolean(activeWorkspace.id),
  });

  // Hydrate automation form when loaded
  useEffect(() => {
    const c = automationQuery.data?.config;
    if (!c) return;
    setAutoEnabled(Boolean(c.enabled));
    setAutoEmails((c.recipient_emails || []).join(', '));
    setAutoPlatforms(
      c.platforms?.length ? c.platforms : ['instagram', 'facebook', 'tiktok']
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
        headers: { 'Content-Type': 'application/json' },
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
        }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || 'Build failed');
      return json as { report: ReportRow };
    },
    onSuccess: (json) => {
      toast.success('Frozen report created');
      setSelectedReport(json.report);
      setPreviewToken(json.report.public_share_token);
      void qc.invalidateQueries({ queryKey: ['monthly-reports'] });
      setTab('preview');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Build failed');
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
      if (!r.ok) throw new Error(json.error || 'Save failed');
      return json;
    },
    onSuccess: () => {
      toast.success('Automation settings saved');
      void qc.invalidateQueries({ queryKey: ['report-automation'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Save failed');
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
      if (!r.ok) throw new Error(json.error || 'Delete failed');
      return json;
    },
    onSuccess: () => {
      toast.success('Report deleted');
      setSelectedReport(null);
      setPreviewToken(null);
      void qc.invalidateQueries({ queryKey: ['monthly-reports', activeWorkspace.id] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    },
  });

  const reports = reportsQuery.data?.reports || [];
  const previewReport =
    selectedReport ||
    reports.find((r) => r.public_share_token === previewToken) ||
    reports[0] ||
    null;

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
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400">
              Monthly reports
            </p>
            <h2 className="font-clikd-wordmark font-extrabold text-xl text-slate-900 tracking-tight mt-1">
              Performance snapshots for clients
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Freeze metrics for <span className="font-semibold text-slate-700">{activeWorkspace.name}</span> only —
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
                className={`h-11 min-h-[44px] px-3 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-[#2B2568] text-white'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
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
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">Saved reports</h3>
            <button
              type="button"
              onClick={() => setTab('builder')}
              className="h-10 min-h-[40px] px-3 rounded-xl bg-clikd-pink text-white text-xs font-extrabold"
            >
              New report
            </button>
          </div>
          {reportsQuery.isLoading ? (
            <div className="py-12 flex justify-center text-slate-400 gap-2 text-sm">
              <Loader2 className="animate-spin" size={16} /> Loading…
            </div>
          ) : reportsQuery.isError ? (
            <p className="py-12 text-center text-sm text-rose-500 px-4">
              {reportsQuery.error instanceof Error
                ? reportsQuery.error.message
                : 'Failed to load reports'}
            </p>
          ) : reports.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">
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
                    <p className="text-sm font-bold text-slate-900 truncate">{r.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
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
                        toast.success('Share link copied');
                      }}
                      className="h-10 min-h-[40px] px-3 rounded-xl border border-slate-200 text-xs font-bold inline-flex items-center gap-1.5"
                    >
                      <Copy size={13} /> Copy link
                    </button>
                    <button
                      type="button"
                      onClick={() => openPdf(r.public_share_token)}
                      className="h-10 min-h-[40px] px-3 rounded-xl border border-slate-200 text-xs font-bold inline-flex items-center gap-1.5"
                    >
                      <FileDown size={13} /> PDF
                    </button>
                    <a
                      href={shareUrl(r.public_share_token)}
                      target="_blank"
                      rel="noreferrer"
                      className="h-10 min-h-[40px] px-3 rounded-xl bg-[#2B2568] text-white text-xs font-bold inline-flex items-center gap-1.5"
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
                      className="h-10 min-h-[40px] px-3 rounded-xl border border-slate-200 text-xs font-bold"
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
                      className="h-10 min-h-[40px] px-3 rounded-xl border border-rose-100 text-rose-600 text-xs font-bold inline-flex items-center gap-1.5"
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
              <h3 className="text-sm font-extrabold text-slate-900">
                Monthly email automation
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
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
                autoEnabled ? 'bg-emerald-500' : 'bg-slate-200'
              }`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  autoEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <label className="block">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
              Send day of month
            </span>
            <div className="mt-1.5 flex items-center gap-3">
              <select
                value={autoSendDay}
                onChange={(e) => setAutoSendDay(Number(e.target.value))}
                className="h-11 min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm font-semibold bg-white"
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                    {d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">
                Emails go out on day {autoSendDay} · previous month snapshot
              </p>
            </div>
          </label>

          <label className="block">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
              Recipient emails
            </span>
            <input
              value={autoEmails}
              onChange={(e) => setAutoEmails(e.target.value)}
              placeholder="client@brand.com, you@clikd.app"
              className="mt-1.5 w-full h-11 min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Comma-separated. Each email gets the guest link (open / print as PDF).
            </p>
          </label>

          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
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
                  className={`h-10 min-h-[40px] px-3 rounded-xl text-xs font-bold capitalize ${
                    autoPlatforms.includes(p)
                      ? 'bg-[#2B2568] text-white'
                      : 'bg-slate-50 border border-slate-200 text-slate-600'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
              Subject template
            </span>
            <input
              value={autoSubject}
              onChange={(e) => setAutoSubject(e.target.value)}
              className="mt-1.5 w-full h-11 min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Tokens: {'{{month}}'} {'{{workspace}}'}
            </p>
          </label>

          <label className="block">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
              Custom email note
            </span>
            <textarea
              value={autoNote}
              onChange={(e) => setAutoNote(e.target.value)}
              rows={3}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none"
              placeholder="Optional note for your client…"
            />
          </label>

          <label className="flex items-center gap-2 min-h-[44px] cursor-pointer">
            <input
              type="checkbox"
              checked={autoHideAi}
              onChange={(e) => setAutoHideAi(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="text-sm font-medium text-slate-700">
              Hide AI insights on public guest links
            </span>
          </label>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              disabled={saveAutomation.isPending}
              onClick={() => saveAutomation.mutate()}
              className="h-11 min-h-[44px] px-4 rounded-xl bg-[#2B2568] text-white text-xs font-extrabold inline-flex items-center gap-2 disabled:opacity-60"
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
              className="h-11 min-h-[44px] px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-extrabold inline-flex items-center gap-2 disabled:opacity-60"
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
            <Sparkles size={16} className="text-[#F472B6]" />
            <h3 className="text-sm font-extrabold text-slate-900">
              Report builder & AI generator
            </h3>
          </div>

          <label className="block">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
              Title
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`${activeWorkspace.name} monthly report`}
              className="mt-1.5 w-full h-11 min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                Start date
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1.5 w-full h-11 min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                End date
              </span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1.5 w-full h-11 min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm"
              />
            </label>
          </div>

          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
              Platforms
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {PLATFORM_OPTIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(platforms, setPlatforms, p)}
                  className={`h-10 min-h-[40px] px-3 rounded-xl text-xs font-bold capitalize ${
                    platforms.includes(p)
                      ? 'bg-[#2B2568] text-white'
                      : 'bg-slate-50 border border-slate-200 text-slate-600'
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
            <span className="text-sm font-medium text-slate-700">
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
            <span className="text-sm font-medium text-slate-700">
              Hide AI insights on public guest link
            </span>
          </label>

          <button
            type="button"
            disabled={buildMutation.isPending || platforms.length === 0}
            onClick={() => buildMutation.mutate()}
            className="h-11 min-h-[44px] px-4 rounded-xl bg-clikd-pink text-white text-xs font-extrabold inline-flex items-center gap-2 disabled:opacity-50"
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
            <div className={`${adminCardClass} py-12 text-center text-sm text-slate-400`}>
              Build or select a report to preview the guest view.
            </div>
          ) : (
            <>
              <div className={`${adminCardClass} p-4 flex flex-wrap items-center gap-2 justify-between`}>
                <p className="text-xs text-slate-500 font-medium">
                  Guest link preview (same data as public page)
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(
                        shareUrl(previewReport.public_share_token)
                      );
                      toast.success('Share link copied');
                    }}
                    className="h-10 min-h-[40px] px-3 rounded-xl border border-slate-200 text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <Copy size={13} /> Copy link
                  </button>
                  <button
                    type="button"
                    onClick={() => openPdf(previewReport.public_share_token)}
                    className="h-10 min-h-[40px] px-3 rounded-xl border border-slate-200 text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <FileDown size={13} /> Save as PDF
                  </button>
                  <a
                    href={shareUrl(previewReport.public_share_token)}
                    target="_blank"
                    rel="noreferrer"
                    className="h-10 min-h-[40px] px-3 rounded-xl bg-slate-900 text-white text-xs font-bold inline-flex items-center gap-1.5"
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
  const m = report.metrics || {
    views: 0,
    engagementRate: 0,
    followerGrowth: 0,
    totalPosts: 0,
  };
  const views = num(m.views);
  const engagementRate = num(m.engagementRate);
  const followerGrowth = num(m.followerGrowth);
  const totalPosts = num(m.totalPosts);
  const showAi = !report.hide_ai_on_public_link && report.ai_insights;

  return (
    <div className="rounded-2xl bg-slate-950 text-slate-100 p-5 sm:p-7 space-y-6 border border-slate-800">
      <div>
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-slate-500">
          Verified Static Snapshot · Powered by clikd.app
        </p>
        <h3 className="font-clikd-wordmark font-extrabold text-2xl mt-2 tracking-tight">
          {report.workspace_name || 'Workspace'}
        </h3>
        <p className="text-sm text-slate-400 mt-1">{report.title}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {report.date_range_label ||
            `${report.period_start} → ${report.period_end}`}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Views', value: views.toLocaleString() },
          { label: 'Eng. rate', value: `${engagementRate}%` },
          { label: 'Followers', value: followerGrowth.toLocaleString() },
          { label: 'Posts', value: String(totalPosts) },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-xl bg-slate-900 border border-slate-800 p-4"
          >
            <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
              {k.label}
            </p>
            <p className="text-xl font-extrabold mt-2 tabular-nums">{k.value}</p>
          </div>
        ))}
      </div>

      {(m.platformBreakdown || []).length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
            Platform breakdown
          </p>
          <ul className="space-y-2">
            {(m.platformBreakdown || []).map((p) => (
              <li
                key={p.platform}
                className="flex justify-between text-sm rounded-xl bg-slate-900/80 border border-slate-800 px-3 py-2.5"
              >
                <span className="capitalize font-semibold">{p.platform}</span>
                <span className="text-slate-400 tabular-nums">
                  {p.posts} posts · {p.views.toLocaleString()} views · {p.engagementRate}% ER
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(m.topPosts || []).length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
            Top posts
          </p>
          <ul className="space-y-2">
            {(m.topPosts || []).slice(0, 5).map((p) => (
              <li
                key={p.id}
                className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-2.5"
              >
                <p className="text-sm font-semibold truncate">{p.title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5 capitalize">
                  {p.platform} · {p.impressions.toLocaleString()} views · {p.engagementRate}% ER
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showAi && report.ai_insights ? (
        <div className="rounded-xl border border-pink-500/30 bg-pink-500/5 p-4 space-y-2">
          <p className="text-xs font-bold text-[#F472B6] uppercase tracking-widest">
            AI insights
          </p>
          <p className="text-sm text-slate-200 leading-relaxed">
            {report.ai_insights.executiveSummary}
          </p>
        </div>
      ) : null}
    </div>
  );
}

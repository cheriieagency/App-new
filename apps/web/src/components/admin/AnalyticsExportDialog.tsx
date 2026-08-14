'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export type AnalyticsExportSectionId =
  | 'kpis'
  | 'performance'
  | 'audience'
  | 'posts'
  | 'reels'
  | 'stories'
  | 'hashtags'
  | 'linkinbio'
  | 'topProducts'
  | 'overview';

type ExportSection = {
  id: AnalyticsExportSectionId;
  label: string;
  description: string;
};

type ExportFormat = 'pdf' | 'csv';
type ExportPreset = '1w' | '1m' | '3m' | '1y' | 'custom' | 'panel';

type ExportPostRow = {
  id: string;
  title: string;
  platform: string;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  er: number;
  publishedAt?: string;
};

const SECTIONS: ExportSection[] = [
  {
    id: 'kpis',
    label: 'KPI summary',
    description: 'Revenue, followers, bio CVR, planned posts',
  },
  {
    id: 'performance',
    label: 'Performance chart',
    description: 'Daily revenue & visitors trend',
  },
  {
    id: 'overview',
    label: 'Engagement overview',
    description: 'Reach, views, likes, comments, shares',
  },
  {
    id: 'audience',
    label: 'Audience',
    description: 'Follower growth and demographics',
  },
  {
    id: 'posts',
    label: 'Posts',
    description: 'Feed post performance metrics',
  },
  {
    id: 'reels',
    label: 'Reels',
    description: 'Short-form video analytics',
  },
  {
    id: 'stories',
    label: 'Stories',
    description: 'Story views and replies',
  },
  {
    id: 'hashtags',
    label: 'Hashtags',
    description: 'Top hashtag reach & engagement',
  },
  {
    id: 'linkinbio',
    label: 'Link-in-bio',
    description: 'Bio store clicks and conversions',
  },
  {
    id: 'topProducts',
    label: 'Top products',
    description: 'Product clicks, CVR and revenue table',
  },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceName: string;
  /** Panel date range — used as the default export window. */
  defaultFrom: string;
  defaultTo: string;
  /** Live KPI rows from the analytics panel */
  kpis: { label: string; value: string; delta: string; meta: string }[];
  topProducts: {
    name: string;
    category: string;
    clicks: number;
    conversion: string;
    revenue: string;
    live: boolean;
  }[];
  engagement: {
    reach: number;
    views: number;
    followers: number;
    followersDelta: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    engagementRate: number;
  };
  posts?: ExportPostRow[];
  reels?: ExportPostRow[];
  stories?: ExportPostRow[];
};

function toDateInputValue(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function rangeFromPreset(preset: Exclude<ExportPreset, 'custom' | 'panel'>): {
  from: string;
  to: string;
} {
  const to = new Date();
  const from = new Date(to);
  if (preset === '1w') from.setDate(from.getDate() - 7);
  else if (preset === '1m') from.setMonth(from.getMonth() - 1);
  else if (preset === '3m') from.setMonth(from.getMonth() - 3);
  else from.setFullYear(from.getFullYear() - 1);
  return { from: toDateInputValue(from), to: toDateInputValue(to) };
}

function formatExportRangeLabel(from: string, to: string) {
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return `${fmt.format(new Date(`${from}T12:00:00`))} – ${fmt.format(
      new Date(`${to}T12:00:00`)
    )}`;
  } catch {
    return `${from} – ${to}`;
  }
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value: string | number) {
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function AnalyticsExportDialog({
  open,
  onOpenChange,
  workspaceName,
  defaultFrom,
  defaultTo,
  kpis,
  topProducts,
  engagement,
  posts = [],
  reels = [],
  stories = [],
}: Props) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<Record<AnalyticsExportSectionId, boolean>>(() =>
    Object.fromEntries(SECTIONS.map((s) => [s.id, true])) as Record<
      AnalyticsExportSectionId,
      boolean
    >
  );
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [busy, setBusy] = useState(false);
  const [preset, setPreset] = useState<ExportPreset>('panel');
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  // Reset export dates to the panel range whenever the dialog opens.
  useEffect(() => {
    if (!open) return;
    setPreset('panel');
    setFrom(defaultFrom);
    setTo(defaultTo);
  }, [open, defaultFrom, defaultTo]);

  const rangeLabel = useMemo(
    () => formatExportRangeLabel(from, to),
    [from, to]
  );

  const rangedPosts = useMemo(
    () =>
      posts.filter((p) => {
        const day = p.publishedAt || '';
        return day >= from && day <= to;
      }),
    [posts, from, to]
  );
  const rangedReels = useMemo(
    () =>
      reels.filter((p) => {
        const day = p.publishedAt || '';
        return day >= from && day <= to;
      }),
    [reels, from, to]
  );
  const rangedStories = useMemo(
    () =>
      stories.filter((p) => {
        const day = p.publishedAt || '';
        return day >= from && day <= to;
      }),
    [stories, from, to]
  );

  const exportEngagement = useMemo(() => {
    // When export dates match the panel, use live panel KPIs.
    if (from === defaultFrom && to === defaultTo) return engagement;
    // Otherwise roll up from content in the export window.
    const rows = [...rangedPosts, ...rangedReels, ...rangedStories];
    let likes = 0;
    let comments = 0;
    let shares = 0;
    let impressions = 0;
    for (const r of rows) {
      likes += r.likes || 0;
      comments += r.comments || 0;
      shares += r.shares || 0;
      impressions += r.impressions || 0;
    }
    const reach = Math.max(impressions, likes + comments + shares);
    return {
      ...engagement,
      likes,
      comments,
      shares,
      views: impressions,
      reach,
      engagementRate:
        reach > 0
          ? Math.round(((likes + comments + shares) / reach) * 1000) / 10
          : 0,
    };
  }, [
    from,
    to,
    defaultFrom,
    defaultTo,
    engagement,
    rangedPosts,
    rangedReels,
    rangedStories,
  ]);

  const selectedCount = useMemo(
    () => SECTIONS.filter((s) => selected[s.id]).length,
    [selected]
  );

  const toggle = (id: AnalyticsExportSectionId) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectAll = (on: boolean) => {
    setSelected(
      Object.fromEntries(SECTIONS.map((s) => [s.id, on])) as Record<
        AnalyticsExportSectionId,
        boolean
      >
    );
  };

  const applyPreset = (next: ExportPreset) => {
    setPreset(next);
    if (next === 'panel') {
      setFrom(defaultFrom);
      setTo(defaultTo);
      return;
    }
    if (next === 'custom') return;
    const r = rangeFromPreset(next);
    setFrom(r.from);
    setTo(r.to);
  };

  const buildCsv = () => {
    const lines: string[] = [];
    lines.push(`Workspace,${csvEscape(workspaceName)}`);
    lines.push(`Date range,${csvEscape(rangeLabel)}`);
    lines.push(`From,${csvEscape(from)}`);
    lines.push(`To,${csvEscape(to)}`);
    lines.push(`Exported at,${csvEscape(new Date().toISOString())}`);
    lines.push('');

    if (selected.kpis) {
      lines.push('KPI Summary');
      lines.push('Metric,Value,Delta,Meta');
      for (const k of kpis) {
        lines.push(
          [k.label, k.value, k.delta, k.meta].map(csvEscape).join(',')
        );
      }
      lines.push('');
    }

    if (selected.overview) {
      lines.push('Engagement Overview');
      lines.push('Metric,Value');
      lines.push(`Reach,${exportEngagement.reach}`);
      lines.push(`Views,${exportEngagement.views}`);
      lines.push(`Followers,${exportEngagement.followers}`);
      lines.push(`Followers delta,${exportEngagement.followersDelta}`);
      lines.push(`Likes,${exportEngagement.likes}`);
      lines.push(`Comments,${exportEngagement.comments}`);
      lines.push(`Shares,${exportEngagement.shares}`);
      lines.push(`Saves,${exportEngagement.saves}`);
      lines.push(`Engagement rate %,${exportEngagement.engagementRate}`);
      lines.push('');
    }

    if (selected.performance) {
      lines.push('Performance');
      lines.push(
        `Note,Daily revenue & visitors for ${rangeLabel} — open Analytics in clikd: for the interactive chart`
      );
      lines.push('');
    }

    if (selected.audience) {
      lines.push('Audience');
      lines.push('Note,Demographics for the selected workspace (see Audience tab)');
      lines.push('');
    }

    if (selected.posts) {
      lines.push('Posts');
      lines.push('Title,Platform,Reach,Likes,Comments,Shares,Engagement %');
      for (const p of rangedPosts) {
        lines.push(
          [
            p.title,
            p.platform,
            p.impressions,
            p.likes,
            p.comments,
            p.shares,
            `${p.er}%`,
          ]
            .map(csvEscape)
            .join(',')
        );
      }
      if (rangedPosts.length === 0) {
        lines.push('No posts in this date range,,,,,');
      }
      lines.push('');
    }

    if (selected.reels) {
      lines.push('Reels');
      lines.push('Title,Platform,Views,Likes,Comments,Shares,Engagement %');
      for (const p of rangedReels) {
        lines.push(
          [
            p.title,
            p.platform,
            p.impressions,
            p.likes,
            p.comments,
            p.shares,
            `${p.er}%`,
          ]
            .map(csvEscape)
            .join(',')
        );
      }
      if (rangedReels.length === 0) {
        lines.push('No reels in this date range,,,,,');
      }
      lines.push('');
    }

    if (selected.stories) {
      lines.push('Stories');
      lines.push('Title,Platform,Views,Likes,Comments,Engagement %');
      for (const p of rangedStories) {
        lines.push(
          [p.title, p.platform, p.impressions, p.likes, p.comments, `${p.er}%`]
            .map(csvEscape)
            .join(',')
        );
      }
      if (rangedStories.length === 0) {
        lines.push('No stories in this date range,,,,,');
      }
      lines.push('');
    }

    if (selected.hashtags) {
      lines.push('Hashtags');
      lines.push('Note,See Analytics → Hashtags for the selected date range');
      lines.push('');
    }

    if (selected.linkinbio) {
      lines.push('Link-in-bio');
      lines.push('Note,Bio clicks for the selected date range — see Link in bio tab');
      lines.push('');
    }

    if (selected.topProducts) {
      lines.push('Top Products');
      lines.push('Product,Category,Clicks,Conversion,Revenue,Status');
      for (const p of topProducts) {
        lines.push(
          [
            p.name,
            p.category,
            p.clicks,
            p.conversion,
            p.revenue,
            p.live ? 'Live' : 'Paused',
          ]
            .map(csvEscape)
            .join(',')
        );
      }
      lines.push('');
    }

    return lines.join('\n');
  };

  const postsTable = (rows: ExportPostRow[], empty: string) => {
    if (rows.length === 0) {
      return `<p class="muted">${empty}</p>`;
    }
    return `
      <table>
        <thead><tr><th>Title</th><th>Platform</th><th>Reach</th><th>Likes</th><th>Comments</th><th>ER</th></tr></thead>
        <tbody>
          ${rows
            .slice(0, 40)
            .map(
              (p) =>
                `<tr><td>${p.title}</td><td>${p.platform}</td><td>${p.impressions.toLocaleString('sv-SE')}</td><td>${p.likes.toLocaleString('sv-SE')}</td><td>${p.comments.toLocaleString('sv-SE')}</td><td>${p.er}%</td></tr>`
            )
            .join('')}
        </tbody>
      </table>
    `;
  };

  const buildPdfHtml = () => {
    const blocks: string[] = [];

    if (selected.kpis) {
      blocks.push(`
        <h2>KPI summary</h2>
        <table>
          <thead><tr><th>Metric</th><th>Value</th><th>Delta</th><th>Meta</th></tr></thead>
          <tbody>
            ${kpis
              .map(
                (k) =>
                  `<tr><td>${k.label}</td><td>${k.value}</td><td>${k.delta}</td><td>${k.meta}</td></tr>`
              )
              .join('')}
          </tbody>
        </table>
      `);
    }

    if (selected.overview) {
      blocks.push(`
        <h2>Engagement overview</h2>
        <div class="grid">
          <div class="card"><div class="label">Reach</div><div class="val">${exportEngagement.reach.toLocaleString('sv-SE')}</div></div>
          <div class="card"><div class="label">Views</div><div class="val">${exportEngagement.views.toLocaleString('sv-SE')}</div></div>
          <div class="card"><div class="label">Followers</div><div class="val">${exportEngagement.followers.toLocaleString('sv-SE')}</div></div>
          <div class="card"><div class="label">Eng. rate</div><div class="val">${exportEngagement.engagementRate}%</div></div>
          <div class="card"><div class="label">Likes</div><div class="val">${exportEngagement.likes.toLocaleString('sv-SE')}</div></div>
          <div class="card"><div class="label">Comments</div><div class="val">${exportEngagement.comments.toLocaleString('sv-SE')}</div></div>
        </div>
      `);
    }

    if (selected.performance) {
      blocks.push(`
        <h2>Performance</h2>
        <p class="muted">Daily revenue &amp; visitors for ${rangeLabel}. Open Analytics in clikd: for the interactive chart.</p>
      `);
    }

    if (selected.audience) {
      blocks.push(`
        <h2>Audience</h2>
        <p class="muted">Follower totals and demographics for this workspace — see the Audience tab for breakdowns.</p>
      `);
    }

    if (selected.posts) {
      blocks.push(`<h2>Posts</h2>${postsTable(rangedPosts, 'No posts in this date range.')}`);
    }

    if (selected.reels) {
      blocks.push(`<h2>Reels</h2>${postsTable(rangedReels, 'No reels in this date range.')}`);
    }

    if (selected.stories) {
      blocks.push(`<h2>Stories</h2>${postsTable(rangedStories, 'No stories in this date range.')}`);
    }

    if (selected.hashtags) {
      blocks.push(`
        <h2>Hashtags</h2>
        <p class="muted">Hashtag performance for ${rangeLabel} — open Analytics → Hashtags for the full list.</p>
      `);
    }

    if (selected.linkinbio) {
      blocks.push(`
        <h2>Link-in-bio</h2>
        <p class="muted">Bio store clicks for ${rangeLabel}.</p>
      `);
    }

    if (selected.topProducts) {
      blocks.push(`
        <h2>Top products</h2>
        <table>
          <thead><tr><th>Product</th><th>Category</th><th>Clicks</th><th>CVR</th><th>Revenue</th><th>Status</th></tr></thead>
          <tbody>
            ${topProducts
              .map(
                (p) =>
                  `<tr><td>${p.name}</td><td>${p.category}</td><td>${p.clicks}</td><td>${p.conversion}</td><td>${p.revenue}</td><td>${p.live ? 'Live' : 'Paused'}</td></tr>`
              )
              .join('')}
          </tbody>
        </table>
      `);
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>clikd: Analytics — ${workspaceName}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: "Plus Jakarta Sans", system-ui, sans-serif; color: #0F172A; margin: 0; padding: 32px; background: #FAFAFA; }
    .brand { font-weight: 800; font-size: 18px; margin-bottom: 4px; }
    .brand span { color: #F472B6; }
    h1 { font-size: 24px; margin: 8px 0 4px; color: #2B2568; }
    .meta { color: #64748b; font-size: 13px; margin-bottom: 24px; }
    h2 { font-size: 15px; margin: 28px 0 10px; color: #0F172A; letter-spacing: 0.02em; }
    table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
    th, td { text-align: left; padding: 10px 12px; font-size: 12px; border-bottom: 1px solid #f1f5f9; }
    th { background: #f8fafc; color: #64748b; text-transform: uppercase; font-size: 10px; letter-spacing: 0.08em; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; }
    .label { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; }
    .val { font-size: 20px; font-weight: 800; margin-top: 6px; }
    .muted { color: #64748b; font-size: 13px; }
    @media print {
      body { background: #fff; padding: 16px; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="brand">clikd<span>:</span></div>
  <h1>Analytics export — ${workspaceName}</h1>
  <p class="meta">${rangeLabel} · Generated ${new Date().toLocaleString('sv-SE')}</p>
  ${blocks.join('\n') || '<p class="muted">No sections selected.</p>'}
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 250);
    });
  </script>
</body>
</html>`;
  };

  const handleDownload = async () => {
    if (selectedCount === 0) return;
    if (from > to) return;
    setBusy(true);
    try {
      const stamp = `${from}_to_${to}`;
      const safeName = workspaceName.replace(/[^\w\-]+/g, '_').toLowerCase() || 'workspace';

      if (format === 'csv') {
        const csv = buildCsv();
        downloadBlob(
          `clikd-analytics-${safeName}-${stamp}.csv`,
          new Blob([csv], { type: 'text/csv;charset=utf-8' })
        );
      } else {
        const html = buildPdfHtml();
        const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
        if (win) {
          win.document.open();
          win.document.write(html);
          win.document.close();
        } else {
          downloadBlob(
            `clikd-analytics-${safeName}-${stamp}.html`,
            new Blob([html], { type: 'text/html;charset=utf-8' })
          );
        }
      }
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  const presetButtons: { key: ExportPreset; label: string }[] = [
    { key: 'panel', label: 'Same as panel' },
    { key: '1w', label: '1 week' },
    { key: '1m', label: '1 month' },
    { key: '3m', label: '3 months' },
    { key: '1y', label: '1 year' },
    { key: 'custom', label: 'Custom' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(520px,94vw)] rounded-3xl border-slate-200/80 bg-white p-0 gap-0 overflow-hidden shadow-2xl">
        <DialogHeader className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-100 text-left">
          <DialogTitle className="font-outfit font-extrabold text-xl text-slate-900 tracking-tight">
            {t('admin.export')}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 font-medium mt-1">
            Choose the date range and sections to include, then download as PDF or CSV.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 sm:px-6 py-4 max-h-[min(58vh,480px)] overflow-y-auto space-y-4">
          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400 mb-2">
              Date range
            </p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {presetButtons.map(({ key, label }) => {
                const active = preset === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyPreset(key)}
                    className={`h-9 min-h-[36px] px-2.5 rounded-lg text-[11px] font-bold transition-colors ${
                      active
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                  From
                </span>
                <input
                  type="date"
                  value={from}
                  max={to}
                  onChange={(e) => {
                    setPreset('custom');
                    setFrom(e.target.value);
                  }}
                  className="mt-1 w-full h-11 min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                  To
                </span>
                <input
                  type="date"
                  value={to}
                  min={from}
                  onChange={(e) => {
                    setPreset('custom');
                    setTo(e.target.value);
                  }}
                  className="mt-1 w-full h-11 min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm"
                />
              </label>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-2">
              Exporting data for{' '}
              <span className="font-semibold text-slate-700">{rangeLabel}</span>
              {' · '}
              {rangedPosts.length} posts · {rangedReels.length} reels ·{' '}
              {rangedStories.length} stories
            </p>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400">
              Sections · {selectedCount}/{SECTIONS.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => selectAll(true)}
                className="text-[11px] font-bold text-[#2B2568] hover:underline min-h-[32px] px-1"
              >
                Select all
              </button>
              <span className="text-slate-300">·</span>
              <button
                type="button"
                onClick={() => selectAll(false)}
                className="text-[11px] font-bold text-slate-500 hover:underline min-h-[32px] px-1"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {SECTIONS.map((section) => {
              const on = selected[section.id];
              return (
                <label
                  key={section.id}
                  className={`flex items-start gap-3 rounded-2xl border px-3.5 py-3 min-h-[52px] cursor-pointer transition-colors ${
                    on
                      ? 'border-[#E9D5FF] bg-[#E9D5FF]/25'
                      : 'border-slate-200/80 bg-white hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`mt-0.5 h-5 w-5 rounded-md border flex items-center justify-center flex-shrink-0 ${
                      on
                        ? 'bg-[#2B2568] border-[#2B2568] text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                    aria-hidden
                  >
                    {on ? <Check size={12} strokeWidth={3} /> : null}
                  </span>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={on}
                    onChange={() => toggle(section.id)}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-extrabold text-slate-900">
                      {section.label}
                    </span>
                    <span className="block text-[12px] text-slate-500 font-medium mt-0.5">
                      {section.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>

          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400 mb-2">
              File format
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormat('pdf')}
                className={`min-h-[56px] rounded-2xl border px-3 py-3 text-left transition-colors ${
                  format === 'pdf'
                    ? 'border-[#F472B6] bg-[#FCE7F3]/50 ring-1 ring-[#F472B6]/30'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <FileText
                    size={16}
                    className={format === 'pdf' ? 'text-[#F472B6]' : 'text-slate-400'}
                  />
                  <span className="text-sm font-extrabold text-slate-900">Visual PDF</span>
                </span>
                <span className="block text-[11px] text-slate-500 font-medium mt-1">
                  Print-ready report layout
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFormat('csv')}
                className={`min-h-[56px] rounded-2xl border px-3 py-3 text-left transition-colors ${
                  format === 'csv'
                    ? 'border-[#F472B6] bg-[#FCE7F3]/50 ring-1 ring-[#F472B6]/30'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <FileSpreadsheet
                    size={16}
                    className={format === 'csv' ? 'text-[#F472B6]' : 'text-slate-400'}
                  />
                  <span className="text-sm font-extrabold text-slate-900">CSV file</span>
                </span>
                <span className="block text-[11px] text-slate-500 font-medium mt-1">
                  Spreadsheet for Excel / Sheets
                </span>
              </button>
            </div>
          </div>
        </div>

        <DialogFooter className="px-5 sm:px-6 py-4 border-t border-slate-100 flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="min-h-[44px] px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 w-full sm:w-auto"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={busy || selectedCount === 0 || from > to}
            onClick={() => void handleDownload()}
            className="min-h-[44px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 disabled:opacity-40 w-full sm:w-auto"
          >
            {busy ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            {format === 'pdf' ? 'Download PDF' : 'Download CSV'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

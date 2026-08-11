'use client';

import { useMemo, useState } from 'react';
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
  rangeLabel: string;
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
};

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
  rangeLabel,
  kpis,
  topProducts,
  engagement,
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

  const buildCsv = () => {
    const lines: string[] = [];
    lines.push(`Workspace,${csvEscape(workspaceName)}`);
    lines.push(`Date range,${csvEscape(rangeLabel)}`);
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
      lines.push(`Reach,${engagement.reach}`);
      lines.push(`Views,${engagement.views}`);
      lines.push(`Followers,${engagement.followers}`);
      lines.push(`Followers delta,${engagement.followersDelta}`);
      lines.push(`Likes,${engagement.likes}`);
      lines.push(`Comments,${engagement.comments}`);
      lines.push(`Shares,${engagement.shares}`);
      lines.push(`Saves,${engagement.saves}`);
      lines.push(`Engagement rate %,${engagement.engagementRate}`);
      lines.push('');
    }

    if (selected.performance) {
      lines.push('Performance');
      lines.push('Note,Daily revenue & visitors chart included in PDF export');
      lines.push('');
    }

    if (selected.audience) {
      lines.push('Audience');
      lines.push('Segment,Share');
      lines.push('Sweden,48%');
      lines.push('Norway,18%');
      lines.push('Denmark,14%');
      lines.push('Finland,9%');
      lines.push('Other,11%');
      lines.push('');
    }

    if (selected.posts) {
      lines.push('Posts');
      lines.push('Title,Reach,Engagement');
      lines.push('Carousel — Niche offer,12400,6.2%');
      lines.push('Reel hook — Soft CTA,22100,8.1%');
      lines.push('Static tip — Checklist,8600,4.4%');
      lines.push('');
    }

    if (selected.reels) {
      lines.push('Reels');
      lines.push('Title,Views,Avg watch %');
      lines.push('3 hooks that convert,48200,54%');
      lines.push('Bio store walkthrough,31100,61%');
      lines.push('');
    }

    if (selected.stories) {
      lines.push('Stories');
      lines.push('Day,Views,Replies');
      lines.push('Mon,4200,38');
      lines.push('Tue,5100,44');
      lines.push('Wed,4800,41');
      lines.push('');
    }

    if (selected.hashtags) {
      lines.push('Hashtags');
      lines.push('Tag,Posts,Reach,ER');
      lines.push('#contentcreator,24,41200,4.8');
      lines.push('#instantcheckout,11,29400,5.2');
      lines.push('#nordicbrand,18,33800,4.1');
      lines.push('');
    }

    if (selected.linkinbio) {
      lines.push('Link-in-bio');
      lines.push('Block,Clicks,CVR');
      lines.push('Masterclass CTA,428,12.4%');
      lines.push('Community join,291,18.2%');
      lines.push('Starter Pack,164,9.1%');
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
          <div class="card"><div class="label">Reach</div><div class="val">${engagement.reach.toLocaleString('sv-SE')}</div></div>
          <div class="card"><div class="label">Views</div><div class="val">${engagement.views.toLocaleString('sv-SE')}</div></div>
          <div class="card"><div class="label">Followers</div><div class="val">${engagement.followers.toLocaleString('sv-SE')}</div></div>
          <div class="card"><div class="label">Eng. rate</div><div class="val">${engagement.engagementRate}%</div></div>
          <div class="card"><div class="label">Likes</div><div class="val">${engagement.likes.toLocaleString('sv-SE')}</div></div>
          <div class="card"><div class="label">Comments</div><div class="val">${engagement.comments.toLocaleString('sv-SE')}</div></div>
        </div>
      `);
    }

    if (selected.performance) {
      blocks.push(`
        <h2>Performance</h2>
        <p class="muted">Daily revenue &amp; visitors for ${rangeLabel}. Open Analytics in clikd: for the interactive chart.</p>
        <div class="bar-row">${[42, 55, 48, 62, 70, 58, 78]
          .map(
            (v) =>
              `<div class="bar" style="height:${Math.round((v / 78) * 80)}px" title="${v}"></div>`
          )
          .join('')}</div>
      `);
    }

    if (selected.audience) {
      blocks.push(`
        <h2>Audience</h2>
        <table>
          <thead><tr><th>Country</th><th>Share</th></tr></thead>
          <tbody>
            <tr><td>Sweden</td><td>48%</td></tr>
            <tr><td>Norway</td><td>18%</td></tr>
            <tr><td>Denmark</td><td>14%</td></tr>
            <tr><td>Finland</td><td>9%</td></tr>
            <tr><td>Other</td><td>11%</td></tr>
          </tbody>
        </table>
      `);
    }

    if (selected.posts) {
      blocks.push(`
        <h2>Posts</h2>
        <table>
          <thead><tr><th>Title</th><th>Reach</th><th>Engagement</th></tr></thead>
          <tbody>
            <tr><td>Carousel — Niche offer</td><td>12,400</td><td>6.2%</td></tr>
            <tr><td>Reel hook — Soft CTA</td><td>22,100</td><td>8.1%</td></tr>
            <tr><td>Static tip — Checklist</td><td>8,600</td><td>4.4%</td></tr>
          </tbody>
        </table>
      `);
    }

    if (selected.reels) {
      blocks.push(`
        <h2>Reels</h2>
        <table>
          <thead><tr><th>Title</th><th>Views</th><th>Avg watch</th></tr></thead>
          <tbody>
            <tr><td>3 hooks that convert</td><td>48,200</td><td>54%</td></tr>
            <tr><td>Bio store walkthrough</td><td>31,100</td><td>61%</td></tr>
          </tbody>
        </table>
      `);
    }

    if (selected.stories) {
      blocks.push(`
        <h2>Stories</h2>
        <table>
          <thead><tr><th>Day</th><th>Views</th><th>Replies</th></tr></thead>
          <tbody>
            <tr><td>Mon</td><td>4,200</td><td>38</td></tr>
            <tr><td>Tue</td><td>5,100</td><td>44</td></tr>
            <tr><td>Wed</td><td>4,800</td><td>41</td></tr>
          </tbody>
        </table>
      `);
    }

    if (selected.hashtags) {
      blocks.push(`
        <h2>Hashtags</h2>
        <table>
          <thead><tr><th>Tag</th><th>Posts</th><th>Reach</th><th>ER</th></tr></thead>
          <tbody>
            <tr><td>#contentcreator</td><td>24</td><td>41,200</td><td>4.8%</td></tr>
            <tr><td>#instantcheckout</td><td>11</td><td>29,400</td><td>5.2%</td></tr>
            <tr><td>#nordicbrand</td><td>18</td><td>33,800</td><td>4.1%</td></tr>
          </tbody>
        </table>
      `);
    }

    if (selected.linkinbio) {
      blocks.push(`
        <h2>Link-in-bio</h2>
        <table>
          <thead><tr><th>Block</th><th>Clicks</th><th>CVR</th></tr></thead>
          <tbody>
            <tr><td>Masterclass CTA</td><td>428</td><td>12.4%</td></tr>
            <tr><td>Community join</td><td>291</td><td>18.2%</td></tr>
            <tr><td>Starter Pack</td><td>164</td><td>9.1%</td></tr>
          </tbody>
        </table>
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
    .bar-row { display: flex; align-items: flex-end; gap: 8px; height: 100px; padding: 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; }
    .bar { flex: 1; background: linear-gradient(180deg, #F472B6, #2B2568); border-radius: 6px 6px 2px 2px; min-height: 8px; }
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
    setBusy(true);
    try {
      const stamp = new Date().toISOString().slice(0, 10);
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
          // Popup blocked — fall back to HTML download the user can open & print.
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(520px,94vw)] rounded-3xl border-slate-200/80 bg-white p-0 gap-0 overflow-hidden shadow-2xl">
        <DialogHeader className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-100 text-left">
          <DialogTitle className="font-outfit font-extrabold text-xl text-slate-900 tracking-tight">
            {t('admin.export')}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 font-medium mt-1">
            Choose which parts of the analytics page to include, then download as a visual PDF
            or CSV spreadsheet.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 sm:px-6 py-4 max-h-[min(52vh,420px)] overflow-y-auto space-y-4">
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
            disabled={busy || selectedCount === 0}
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

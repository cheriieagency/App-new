'use client';

import { useMemo, useState } from 'react';
import {
  BarChart3,
  Download,
  Plus,
  Users,
  Eye,
  Hash,
  Link2,
  Film,
  BookOpen,
} from 'lucide-react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { AdminPageHeader, adminCardClass, adminKpiClass } from '@/components/admin/AdminUi';
import { useAdminNav } from '@/components/admin/AdminNavContext';

type AnalyticsSubTab =
  | 'overview'
  | 'audience'
  | 'posts'
  | 'reels'
  | 'stories'
  | 'hashtags'
  | 'linkinbio';

const SUB_TABS: { key: AnalyticsSubTab; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'Översikt', icon: BarChart3 },
  { key: 'audience', label: 'Publik', icon: Users },
  { key: 'posts', label: 'Inlägg', icon: BookOpen },
  { key: 'reels', label: 'Reels', icon: Film },
  { key: 'stories', label: 'Stories', icon: Eye },
  { key: 'hashtags', label: 'Hashtags', icon: Hash },
  { key: 'linkinbio', label: 'Linkin.bio', icon: Link2 },
];

const TOP_PRODUCTS = [
  {
    name: 'Gratis E-bok: Swish Funnels',
    category: 'Lead Magnet',
    clicks: 1420,
    conversion: '42.8%',
    revenue: '0 SEK',
    live: true,
  },
  {
    name: '1:1 Coaching Call',
    category: 'Tjänst',
    clicks: 510,
    conversion: '18.2%',
    revenue: '12,200 SEK',
    live: true,
  },
  {
    name: 'VIP Community Access',
    category: 'Medlemskap',
    clicks: 390,
    conversion: '22.0%',
    revenue: '7,850 SEK',
    live: true,
  },
  {
    name: 'Creator Starter Pack',
    category: 'Digital produkt',
    clicks: 842,
    conversion: '12.4%',
    revenue: '18,400 SEK',
    live: true,
  },
];

const DAYS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

/** Dual-line performance chart — solid revenue + dashed visitors, pink end highlight. */
function PerformanceChart({ revenue, visitors }: { revenue: number[]; visitors: number[] }) {
  const w = 720;
  const h = 220;
  const padX = 8;
  const padY = 24;
  const max = Math.max(...revenue, ...visitors, 1);

  const toPts = (vals: number[]) =>
    vals.map((v, i) => {
      const x = padX + (i / Math.max(vals.length - 1, 1)) * (w - padX * 2);
      const y = h - padY - (v / max) * (h - padY * 2);
      return { x, y };
    });

  const revPts = toPts(revenue);
  const visPts = toPts(visitors);

  const smooth = (pts: { x: number; y: number }[]) => {
    if (pts.length < 2) return '';
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx.toFixed(1)} ${p0.y.toFixed(1)}, ${cx.toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
    }
    return d;
  };

  const last = revPts[revPts.length - 1];

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[200px] sm:h-[220px]" role="img" aria-label="Prestandadiagram">
        <path
          d={smooth(visPts)}
          fill="none"
          stroke="#CBD5E1"
          strokeWidth="2"
          strokeDasharray="5 6"
          strokeLinecap="round"
        />
        <path
          d={smooth(revPts)}
          fill="none"
          stroke="#0F172A"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {last && (
          <>
            <circle cx={last.x} cy={last.y} r="7" fill="#F472B6" stroke="#fff" strokeWidth="3" />
            <circle cx={last.x} cy={last.y} r="12" fill="#F472B6" fillOpacity="0.15" />
          </>
        )}
      </svg>
      <div className="flex justify-between px-1 -mt-1">
        {DAYS.map((d) => (
          <span
            key={d}
            className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400"
          >
            {d}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function LaterAnalyticsPanel() {
  const { activeWorkspace } = useWorkspace();
  const { setSection } = useAdminNav();
  const [sub, setSub] = useState<AnalyticsSubTab>('overview');
  const chart = activeWorkspace.analytics.revenue_chart;

  const revenue = useMemo(
    () => (chart.length >= 7 ? chart.slice(0, 7) : [42, 55, 48, 62, 70, 58, 78]),
    [chart]
  );
  const visitors = useMemo(
    () => revenue.map((v, i) => Math.round(v * (0.55 + (i % 3) * 0.08))),
    [revenue]
  );

  const kpis = [
    {
      label: 'Intäkter (Swish)',
      value: '42,850 SEK',
      delta: '+24.5%',
      deltaTone: 'good' as const,
      meta: '142 transaktioner',
    },
    {
      label: 'Följare',
      value: '18,804',
      delta: '+842',
      deltaTone: 'neutral' as const,
      meta: '3 konton kopplade',
    },
    {
      label: 'Bio Store CVR',
      value: '34.8%',
      delta: '+2.1%',
      deltaTone: 'good' as const,
      meta: '2,410 klick totalt',
    },
    {
      label: 'Planerade Inlägg',
      value: '131',
      delta: '4 i veckan',
      deltaTone: 'neutral' as const,
      meta: '100% schemalagda',
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Analytics & Intäkter"
        title="Översikt"
        actions={
          <>
            <button
              type="button"
              className="h-10 min-h-[40px] px-3.5 rounded-xl border border-slate-200/90 bg-white text-xs font-semibold text-slate-600 inline-flex items-center hover:bg-slate-50 transition-colors"
            >
              7 Dagar: Aug 02 – Aug 09
            </button>
            <button
              type="button"
              className="h-10 min-h-[40px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <Download size={13} /> Exportera
            </button>
          </>
        }
      />

      {/* Quiet sub-nav — only shown when drilling into detail tabs */}
      <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none -mt-2">
        {SUB_TABS.map(({ key, label }) => {
          const active = sub === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSub(key)}
              className={`h-9 min-h-[36px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0 ${
                active
                  ? 'text-slate-900 bg-slate-100'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {sub === 'overview' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            {kpis.map((k) => (
              <div key={k.label} className={adminKpiClass}>
                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
                  {k.label}
                </p>
                <p className="mt-3 font-clikd-wordmark font-extrabold text-[26px] sm:text-[28px] leading-none text-slate-900 tracking-tight tabular-nums">
                  {k.value}
                </p>
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs font-bold tabular-nums ${
                      k.deltaTone === 'good' ? 'text-emerald-600' : 'text-slate-500'
                    }`}
                  >
                    {k.delta}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">{k.meta}</span>
                </div>
              </div>
            ))}
          </div>

          <div className={`${adminCardClass} p-5 sm:p-7`}>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
              <div>
                <h2 className="font-clikd-wordmark font-extrabold text-lg text-slate-900 tracking-tight">
                  Prestanda & Swish-intäkter
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Dagliga intäkter i SEK under senaste veckan
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-900" /> Intäkter
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-300" /> Besökare
                </span>
              </div>
            </div>
            <PerformanceChart revenue={revenue} visitors={visitors} />
          </div>

          <div className={`${adminCardClass} overflow-hidden`}>
            <div className="px-5 sm:px-7 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100">
              <div>
                <h2 className="font-clikd-wordmark font-extrabold text-lg text-slate-900 tracking-tight">
                  Topprodukter i Bio Store
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Klick, konvertering och Swish-intäkt
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSection('biobuilder')}
                className="h-10 min-h-[40px] px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 hover:bg-slate-50 transition-colors self-start"
              >
                <Plus size={14} /> Ny produkt
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Produkt', 'Kategori', 'Klick', 'Konvertering', 'Intäkt', 'Status'].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-5 sm:px-7 py-3 text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {TOP_PRODUCTS.map((row) => (
                    <tr
                      key={row.name}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50"
                    >
                      <td className="px-5 sm:px-7 py-4 text-sm font-semibold text-slate-900">
                        {row.name}
                      </td>
                      <td className="px-5 sm:px-7 py-4 text-sm text-slate-500">{row.category}</td>
                      <td className="px-5 sm:px-7 py-4 text-sm font-semibold tabular-nums text-slate-800">
                        {row.clicks.toLocaleString('sv-SE')}
                      </td>
                      <td className="px-5 sm:px-7 py-4 text-sm font-bold tabular-nums text-emerald-600">
                        {row.conversion}
                      </td>
                      <td className="px-5 sm:px-7 py-4 text-sm font-semibold tabular-nums text-slate-800">
                        {row.revenue}
                      </td>
                      <td className="px-5 sm:px-7 py-4">
                        <span
                          className={`inline-block w-2 h-2 rounded-full ${
                            row.live ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                          title={row.live ? 'Live' : 'Pausad'}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {sub === 'audience' && (
        <div className={`${adminCardClass} p-6`}>
          <h3 className="font-clikd-wordmark font-extrabold text-base text-slate-900 mb-4">
            Publik · {activeWorkspace.name}
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Följare', value: '18,804' },
              { label: 'Konton', value: '3' },
              { label: 'Räckvidd (7d)', value: '94.2k' },
            ].map((m) => (
              <div key={m.label} className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  {m.label}
                </p>
                <p className="text-xl font-extrabold text-slate-900 mt-1 tabular-nums">{m.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {sub === 'posts' && (
        <MetricTable
          title="Inläggsprestanda"
          rows={[
            { name: 'Launch teaser carousel', metric: '4.8% ER', secondary: '12.4k räckvidd' },
            { name: 'Behind the scenes reel', metric: '6.1% ER', secondary: '18.2k räckvidd' },
            { name: 'Product drop announcement', metric: '3.9% ER', secondary: '9.1k räckvidd' },
          ]}
        />
      )}
      {sub === 'reels' && (
        <MetricTable
          title="Reel-prestanda"
          rows={[
            { name: 'GRWM morning routine', metric: '42k plays', secondary: '2.1k shares' },
            { name: '3 tips in 15s', metric: '31k plays', secondary: '890 shares' },
          ]}
        />
      )}
      {sub === 'stories' && (
        <MetricTable
          title="Story-prestanda"
          rows={[
            { name: 'Poll: which shade?', metric: '78% completion', secondary: '1.2k taps' },
            { name: 'Link sticker — shop', metric: '640 clicks', secondary: '22% exit' },
          ]}
        />
      )}
      {sub === 'hashtags' && (
        <MetricTable
          title="Hashtag-analys"
          rows={[
            { name: '#clikd', metric: '+12% räckvidd', secondary: 'Använd 18×' },
            { name: '#linkinbio', metric: '+8% räckvidd', secondary: 'Använd 11×' },
            { name: '#swishcheckout', metric: '+5% räckvidd', secondary: 'Använd 7×' },
          ]}
        />
      )}
      {sub === 'linkinbio' && (
        <div className={`${adminCardClass} overflow-hidden`}>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
            <div>
              <h3 className="font-clikd-wordmark font-extrabold text-base text-slate-900">
                Linkin.bio Analytics
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {activeWorkspace.analytics.utm_total_clicks} klick totalt · Bio Store UTM
              </p>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {activeWorkspace.analytics.utm_links.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">
                Lägg till produkter i Bio Store för att se länkprestanda.
              </p>
            ) : (
              activeWorkspace.analytics.utm_links.map((row) => (
                <div
                  key={row.slug}
                  className="px-5 py-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{row.title}</p>
                    <p className="text-[11px] font-mono text-slate-400 truncate">/r/{row.slug}</p>
                  </div>
                  <div className="flex items-center gap-6 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-base font-extrabold tabular-nums text-slate-900">
                        {row.clicks}
                      </p>
                      <p className="text-[10px] font-mono font-bold uppercase text-slate-400">
                        Klick
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-extrabold tabular-nums text-slate-900">
                        {row.unique}
                      </p>
                      <p className="text-[10px] font-mono font-bold uppercase text-slate-400">
                        Unika
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricTable({
  title,
  rows,
}: {
  title: string;
  rows: { name: string; metric: string; secondary: string }[];
}) {
  return (
    <div className={`${adminCardClass} overflow-hidden`}>
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="font-clikd-wordmark font-extrabold text-base text-slate-900">{title}</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map((r) => (
          <div key={r.name} className="px-5 py-4 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900">{r.name}</p>
            <div className="text-right">
              <p className="text-sm font-extrabold text-slate-900">{r.metric}</p>
              <p className="text-[11px] font-medium text-slate-400">{r.secondary}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

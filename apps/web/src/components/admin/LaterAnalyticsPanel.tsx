'use client';

import { useMemo, useState } from 'react';
import {
  BarChart3,
  Download,
  Share2,
  TrendingUp,
  Users,
  Eye,
  Hash,
  Link2,
  Film,
  BookOpen,
} from 'lucide-react';
import { useWorkspace } from '@/context/WorkspaceContext';

type AnalyticsSubTab =
  | 'overview'
  | 'audience'
  | 'posts'
  | 'reels'
  | 'stories'
  | 'hashtags'
  | 'linkinbio';

const SUB_TABS: { key: AnalyticsSubTab; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'audience', label: 'Audience', icon: Users },
  { key: 'posts', label: 'Post Performance', icon: BookOpen },
  { key: 'reels', label: 'Reel Performance', icon: Film },
  { key: 'stories', label: 'Story Performance', icon: Eye },
  { key: 'hashtags', label: 'Hashtag Analytics', icon: Hash },
  { key: 'linkinbio', label: 'Linkin.bio Analytics', icon: Link2 },
];

function dateRangeLabel() {
  // Fixed demo window matching Aug 02–09, 2026 (platform “today”).
  return '7 Days: Aug 02, 2026 - Aug 09, 2026';
}

export default function LaterAnalyticsPanel() {
  const { activeWorkspace } = useWorkspace();
  const [sub, setSub] = useState<AnalyticsSubTab>('overview');
  const chart = activeWorkspace.analytics.revenue_chart;

  const profile = useMemo(
    () => ({
      posts: 128 + (activeWorkspace.analytics.products || 0),
      followers: 18420 + activeWorkspace.analytics.active_members * 12,
      following: 312,
      views: chart.reduce((a, b) => a + b * 40, 0),
      reach: chart.reduce((a, b) => a + b * 28, 0),
    }),
    [activeWorkspace, chart]
  );

  const growthSeries = useMemo(
    () =>
      chart.map((h, i) => ({
        day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i] ?? `D${i}`,
        followers: Math.round(profile.followers * (0.92 + h / 1200)),
        views: Math.round(h * 42),
        reach: Math.round(h * 31),
      })),
    [chart, profile.followers]
  );

  const maxBar = Math.max(1, ...growthSeries.map((g) => g.views));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
            Analytics · {activeWorkspace.name}
          </p>
          <h1 className="text-xl sm:text-2xl font-black text-[#1f2430] tracking-tight">
            Performance
          </h1>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">
            {activeWorkspace.handle} · Later-style insights
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="h-11 min-h-[44px] px-3 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-600 inline-flex items-center">
            {dateRangeLabel()}
          </div>
          <button
            type="button"
            className="h-11 min-h-[44px] px-3 rounded-xl border border-zinc-200 bg-white text-xs font-extrabold text-zinc-700 inline-flex items-center gap-1.5 hover:bg-zinc-50"
          >
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* Sub-nav */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none border-b border-zinc-200 pb-0">
        {SUB_TABS.map(({ key, label, icon: Icon }) => {
          const active = sub === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSub(key)}
              className={`relative flex items-center gap-1.5 h-11 min-h-[44px] px-3 text-[11px] sm:text-xs font-extrabold whitespace-nowrap transition-colors flex-shrink-0 ${
                active ? 'text-[#1f2430]' : 'text-zinc-400 hover:text-zinc-700'
              }`}
            >
              <Icon size={13} />
              {label}
              {active && (
                <span className="absolute left-2 right-2 bottom-0 h-0.5 rounded-full bg-[#1f2430]" />
              )}
            </button>
          );
        })}
      </div>

      {(sub === 'overview' || sub === 'audience') && (
        <>
          {/* Profile summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
              <div className="flex items-center gap-4 mb-5">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-black"
                  style={{ background: activeWorkspace.color || '#9b8afb' }}
                >
                  {(activeWorkspace.name?.[0] ?? 'B').toUpperCase()}
                </div>
                <div>
                  <p className="text-base font-black text-[#1f2430]">{activeWorkspace.name}</p>
                  <p className="text-xs font-semibold text-zinc-500">{activeWorkspace.handle}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total Posts', value: profile.posts },
                  { label: 'Followers', value: profile.followers.toLocaleString('en-US') },
                  { label: 'Following', value: profile.following },
                ].map((m) => (
                  <div key={m.label} className="rounded-xl bg-[#f7f8fa] p-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                      {m.label}
                    </p>
                    <p className="text-xl font-black text-[#1f2430] mt-1 tabular-nums">{m.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={15} className="text-emerald-500" />
                <h3 className="text-sm font-black text-[#1f2430]">Performance Report</h3>
              </div>
              <p className="text-xs text-zinc-500 font-medium flex-1">
                Share a clean snapshot of growth, reach, and content performance for this Social
                Set.
              </p>
              <button
                type="button"
                className="mt-4 h-11 min-h-[44px] rounded-xl bg-[#1f2430] text-white text-xs font-extrabold inline-flex items-center justify-center gap-2 hover:opacity-90"
              >
                <Share2 size={13} /> Share Performance Report
              </button>
            </div>
          </div>

          {/* Growth chart */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
              <div>
                <h3 className="text-sm font-black text-[#1f2430]">Profile Growth & Discovery</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Followers, Views, and Reach</p>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#1f2430]" /> Followers
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#7c6cf0]" /> Views
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#34d399]" /> Reach
                </span>
              </div>
            </div>

            <div className="flex items-end gap-2 h-40">
              {growthSeries.map((g) => (
                <div key={g.day} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                  <div className="w-full flex items-end justify-center gap-0.5 h-28">
                    <div
                      className="w-[28%] rounded-t-md bg-[#1f2430]/90"
                      style={{ height: `${Math.max(8, (g.followers % 100) + 20)}%` }}
                      title={`Followers trend`}
                    />
                    <div
                      className="w-[28%] rounded-t-md bg-[#7c6cf0]"
                      style={{ height: `${Math.max(8, (g.views / maxBar) * 100)}%` }}
                      title={`Views ${g.views}`}
                    />
                    <div
                      className="w-[28%] rounded-t-md bg-[#34d399]"
                      style={{ height: `${Math.max(8, (g.reach / maxBar) * 100)}%` }}
                      title={`Reach ${g.reach}`}
                    />
                  </div>
                  <span className="text-[9px] font-bold text-zinc-400">{g.day}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {sub === 'posts' && (
        <MetricTable
          title="Post Performance"
          rows={[
            { name: 'Launch teaser carousel', metric: '4.8% ER', secondary: '12.4k reach' },
            { name: 'Behind the scenes reel cut', metric: '6.1% ER', secondary: '18.2k reach' },
            { name: 'Product drop announcement', metric: '3.9% ER', secondary: '9.1k reach' },
          ]}
        />
      )}
      {sub === 'reels' && (
        <MetricTable
          title="Reel Performance"
          rows={[
            { name: 'GRWM morning routine', metric: '42k plays', secondary: '2.1k shares' },
            { name: '3 tips in 15s', metric: '31k plays', secondary: '890 shares' },
          ]}
        />
      )}
      {sub === 'stories' && (
        <MetricTable
          title="Story Performance"
          rows={[
            { name: 'Poll: which shade?', metric: '78% completion', secondary: '1.2k taps' },
            { name: 'Link sticker — shop', metric: '640 clicks', secondary: '22% exit' },
          ]}
        />
      )}
      {sub === 'hashtags' && (
        <MetricTable
          title="Hashtag Analytics"
          rows={[
            { name: '#nordiccreator', metric: '+12% reach', secondary: 'Used 18×' },
            { name: '#linkinbio', metric: '+8% reach', secondary: 'Used 11×' },
            { name: '#swishcheckout', metric: '+5% reach', secondary: 'Used 7×' },
          ]}
        />
      )}
      {sub === 'linkinbio' && (
        <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-[#1f2430]">Linkin.bio Analytics</h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                {activeWorkspace.analytics.utm_total_clicks} total clicks · Bio Store UTM
              </p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wide text-[#7c6cf0] bg-[#f2eeff] px-2.5 py-1 rounded-full">
              utm_medium=bio_store
            </span>
          </div>
          <div className="divide-y divide-zinc-100">
            {activeWorkspace.analytics.utm_links.length === 0 ? (
              <p className="py-10 text-center text-sm text-zinc-400">
                Add store products in Bio Builder to see link performance.
              </p>
            ) : (
              activeWorkspace.analytics.utm_links.map((row) => (
                <div
                  key={row.slug}
                  className="px-5 py-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-black text-[#1f2430] truncate">{row.title}</p>
                    <p className="text-[11px] font-mono text-zinc-400 truncate">/r/{row.slug}</p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-lg font-black tabular-nums text-[#1f2430]">{row.clicks}</p>
                      <p className="text-[10px] font-bold uppercase text-zinc-400">Clicks</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black tabular-nums text-[#1f2430]">{row.unique}</p>
                      <p className="text-[10px] font-bold uppercase text-zinc-400">Unique</p>
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
    <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100">
        <h3 className="text-sm font-black text-[#1f2430]">{title}</h3>
      </div>
      <div className="divide-y divide-zinc-100">
        {rows.map((r) => (
          <div key={r.name} className="px-5 py-4 flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-[#1f2430]">{r.name}</p>
            <div className="text-right">
              <p className="text-sm font-black text-[#1f2430]">{r.metric}</p>
              <p className="text-[11px] font-medium text-zinc-400">{r.secondary}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

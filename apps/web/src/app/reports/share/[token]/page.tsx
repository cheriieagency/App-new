'use client';

/**
 * Public guest report — verified snapshot (no login).
 * ?print=1 opens the browser print dialog (Save as PDF).
 */

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { FileDown } from 'lucide-react';

type SharePayload = {
  ok?: boolean;
  error?: string;
  title?: string;
  workspaceName?: string;
  periodStart?: string;
  periodEnd?: string;
  metrics?: {
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
      likes?: number;
      comments?: number;
    }>;
  };
  aiInsights?: {
    executiveSummary: string;
    wins: string[];
    improvements: string[];
    recommendations: string[];
  } | null;
  verifiedSnapshot?: boolean;
};

export default function PublicReportSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [data, setData] = useState<SharePayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch(`/api/reports/share/${encodeURIComponent(token)}`);
        const json = (await r.json()) as SharePayload;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setData({ error: 'Failed to load report' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Auto-open print dialog when opened via Save as PDF (?print=1).
  useEffect(() => {
    if (loading || !data?.ok) return;
    try {
      const wantsPrint =
        new URLSearchParams(window.location.search).get('print') === '1';
      if (!wantsPrint) return;
      const id = window.setTimeout(() => window.print(), 400);
      return () => window.clearTimeout(id);
    } catch {
      /* ignore */
    }
  }, [loading, data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm font-semibold">
        Loading report…
      </div>
    );
  }

  if (!data?.ok || !data.metrics) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-lg font-extrabold">Report unavailable</p>
        <p className="text-sm text-slate-400">
          {data?.error === 'Link expired'
            ? 'This guest link has expired.'
            : 'This share link is invalid or disabled.'}
        </p>
        <Link
          href="https://clikd.app"
          className="mt-2 h-11 min-h-[44px] px-4 rounded-xl bg-[#F472B6] text-slate-950 text-xs font-extrabold inline-flex items-center"
        >
          Powered by clikd.app
        </Link>
      </div>
    );
  }

  const m = data.metrics;
  const totalFollowers = m.totalFollowers ?? m.followerGrowth;
  const likes = m.likes ?? 0;
  const comments = m.comments ?? 0;
  const shares = m.shares ?? 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 print:bg-white print:text-slate-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-emerald-400/90">
            Verified Static Snapshot · Powered by clikd.app
          </p>
          <button
            type="button"
            onClick={() => window.print()}
            className="h-10 min-h-[40px] px-3 rounded-xl bg-white text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5"
          >
            <FileDown size={13} /> Save as PDF
          </button>
        </div>

        <header className="space-y-2">
          <p className="hidden print:block text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-slate-500">
            Verified Static Snapshot · Powered by clikd.app
          </p>
          <h1 className="font-clikd-wordmark font-extrabold text-3xl sm:text-4xl tracking-tight">
            {data.workspaceName}
          </h1>
          <p className="text-base text-slate-300 print:text-slate-700 font-semibold">
            {data.title}
          </p>
          <p className="text-sm text-slate-500">
            {data.periodStart} → {data.periodEnd}
          </p>
        </header>

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Views', value: m.views.toLocaleString() },
            { label: 'Eng. rate', value: `${m.engagementRate}%` },
            { label: 'Followers', value: totalFollowers.toLocaleString() },
            { label: 'Total posts', value: String(m.totalPosts) },
          ].map((k) => (
            <div
              key={k.label}
              className="rounded-2xl bg-slate-900 border border-slate-800 p-4 print:bg-slate-50 print:border-slate-200"
            >
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                {k.label}
              </p>
              <p className="text-2xl font-extrabold mt-2 tabular-nums tracking-tight">
                {k.value}
              </p>
            </div>
          ))}
        </section>

        {(likes > 0 || comments > 0 || shares > 0) && (
          <section className="grid grid-cols-3 gap-3">
            {[
              { label: 'Likes', value: likes.toLocaleString() },
              { label: 'Comments', value: comments.toLocaleString() },
              { label: 'Shares', value: shares.toLocaleString() },
            ].map((k) => (
              <div
                key={k.label}
                className="rounded-2xl bg-slate-900 border border-slate-800 p-4 text-center print:bg-slate-50 print:border-slate-200"
              >
                <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                  {k.label}
                </p>
                <p className="text-xl font-extrabold mt-2 tabular-nums tracking-tight">
                  {k.value}
                </p>
              </div>
            ))}
          </section>
        )}

        {(m.followersByPlatform || []).length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Audience snapshot
            </h2>
            <ul className="space-y-2">
              {(m.followersByPlatform || []).map((f) => (
                <li
                  key={f.platform}
                  className="rounded-2xl bg-slate-900 border border-slate-800 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 print:bg-slate-50 print:border-slate-200"
                >
                  <span className="capitalize font-bold">
                    {f.platform}
                    {f.handle ? (
                      <span className="text-slate-500 font-normal ml-1">
                        @{f.handle.replace(/^@/, '')}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-sm text-slate-400 print:text-slate-600 tabular-nums">
                    {f.count.toLocaleString()} followers
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(m.platformBreakdown || []).length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Platform breakdown
            </h2>
            <ul className="space-y-2">
              {(m.platformBreakdown || []).map((p) => (
                <li
                  key={p.platform}
                  className="rounded-2xl bg-slate-900 border border-slate-800 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 print:bg-slate-50 print:border-slate-200"
                >
                  <span className="capitalize font-bold">{p.platform}</span>
                  <span className="text-sm text-slate-400 print:text-slate-600 tabular-nums">
                    {p.posts} posts · {p.views.toLocaleString()} views ·{' '}
                    {p.engagementRate}% ER
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(m.topPosts || []).length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Top performing posts
            </h2>
            <ul className="space-y-2">
              {(m.topPosts || []).map((p) => (
                <li
                  key={p.id}
                  className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex gap-3 print:bg-slate-50 print:border-slate-200"
                >
                  {p.mediaUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.mediaUrl}
                      alt=""
                      className="w-20 h-20 object-cover flex-shrink-0 bg-slate-800"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-slate-800 flex-shrink-0 print:bg-slate-200" />
                  )}
                  <div className="py-3 pr-3 min-w-0 flex-1">
                    <p className="text-sm font-bold truncate">{p.title}</p>
                    <p className="text-[11px] text-slate-500 mt-1 capitalize">
                      {p.platform} · {p.impressions.toLocaleString()} views ·{' '}
                      {p.engagementRate}% ER
                      {p.likes != null ? ` · ${p.likes.toLocaleString()} likes` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {data.aiInsights ? (
          <section className="rounded-2xl border border-[#F472B6]/35 bg-[#F472B6]/5 p-5 space-y-4 print:border-pink-200 print:bg-pink-50">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[#F472B6]">
              Strategy notes
            </h2>
            <p className="text-sm text-slate-200 print:text-slate-800 leading-relaxed">
              {data.aiInsights.executiveSummary}
            </p>
            {data.aiInsights.wins?.length ? (
              <div>
                <p className="text-[11px] font-bold text-emerald-400 print:text-emerald-700 uppercase mb-1">
                  Wins
                </p>
                <ul className="list-disc list-inside text-sm text-slate-300 print:text-slate-700 space-y-1">
                  {data.aiInsights.wins.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {data.aiInsights.improvements?.length ? (
              <div>
                <p className="text-[11px] font-bold text-amber-400 print:text-amber-700 uppercase mb-1">
                  Areas to improve
                </p>
                <ul className="list-disc list-inside text-sm text-slate-300 print:text-slate-700 space-y-1">
                  {data.aiInsights.improvements.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {data.aiInsights.recommendations?.length ? (
              <div>
                <p className="text-[11px] font-bold text-sky-400 print:text-sky-700 uppercase mb-1">
                  Recommendations
                </p>
                <ul className="list-disc list-inside text-sm text-slate-300 print:text-slate-700 space-y-1">
                  {data.aiInsights.recommendations.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}

        <footer className="pt-4 border-t border-slate-800 print:border-slate-200 text-center">
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600">
            Verified Static Snapshot · Powered by{' '}
            <Link href="https://clikd.app" className="text-[#F472B6]">
              clikd.app
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}

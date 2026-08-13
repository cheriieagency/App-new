'use client';

/**
 * Public guest report — dark slate verified snapshot (no login).
 */

import { use, useEffect, useState } from 'react';
import Link from 'next/link';

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
    totalPosts: number;
    topPosts?: Array<{
      id: string;
      platform: string;
      title: string;
      mediaUrl?: string;
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8">
        <header className="space-y-2">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-emerald-400/90">
            Verified Static Snapshot · Powered by clikd.app
          </p>
          <h1 className="font-clikd-wordmark font-extrabold text-3xl sm:text-4xl tracking-tight">
            {data.workspaceName}
          </h1>
          <p className="text-base text-slate-300 font-semibold">{data.title}</p>
          <p className="text-sm text-slate-500">
            {data.periodStart} → {data.periodEnd}
          </p>
        </header>

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Views', value: m.views.toLocaleString() },
            { label: 'Eng. rate', value: `${m.engagementRate}%` },
            { label: 'Followers', value: m.followerGrowth.toLocaleString() },
            { label: 'Total posts', value: String(m.totalPosts) },
          ].map((k) => (
            <div
              key={k.label}
              className="rounded-2xl bg-slate-900 border border-slate-800 p-4"
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

        {(m.platformBreakdown || []).length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Platform breakdown
            </h2>
            <ul className="space-y-2">
              {(m.platformBreakdown || []).map((p) => (
                <li
                  key={p.platform}
                  className="rounded-2xl bg-slate-900 border border-slate-800 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
                >
                  <span className="capitalize font-bold">{p.platform}</span>
                  <span className="text-sm text-slate-400 tabular-nums">
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
                  className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex gap-3"
                >
                  {p.mediaUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.mediaUrl}
                      alt=""
                      className="w-20 h-20 object-cover flex-shrink-0 bg-slate-800"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-slate-800 flex-shrink-0" />
                  )}
                  <div className="py-3 pr-3 min-w-0 flex-1">
                    <p className="text-sm font-bold truncate">{p.title}</p>
                    <p className="text-[11px] text-slate-500 mt-1 capitalize">
                      {p.platform} · {p.impressions.toLocaleString()} views ·{' '}
                      {p.engagementRate}% ER
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {data.aiInsights ? (
          <section className="rounded-2xl border border-[#F472B6]/35 bg-[#F472B6]/5 p-5 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[#F472B6]">
              Strategy notes
            </h2>
            <p className="text-sm text-slate-200 leading-relaxed">
              {data.aiInsights.executiveSummary}
            </p>
            {data.aiInsights.wins?.length ? (
              <div>
                <p className="text-[11px] font-bold text-emerald-400 uppercase mb-1">
                  Wins
                </p>
                <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
                  {data.aiInsights.wins.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {data.aiInsights.recommendations?.length ? (
              <div>
                <p className="text-[11px] font-bold text-sky-400 uppercase mb-1">
                  Recommendations
                </p>
                <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
                  {data.aiInsights.recommendations.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}

        <footer className="pt-4 border-t border-slate-800 text-center">
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

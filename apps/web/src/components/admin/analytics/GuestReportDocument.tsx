'use client';

/**
 * White guest monthly report — KPIs, optional charts, in-depth tables,
 * and CSV downloads from the frozen Supabase snapshot (no mock metrics).
 */

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download } from 'lucide-react';

export type ReportContentOptions = {
  includeInDepth: boolean;
  includeCharts: boolean;
  includeCsv: boolean;
};

export type GuestReportMetrics = {
  views?: number;
  engagementRate?: number;
  followerGrowth?: number;
  totalFollowers?: number;
  totalPosts?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  followersByPlatform?: Array<{
    platform: string;
    handle?: string | null;
    count: number;
  }>;
  platformBreakdown?: Array<{
    platform: string;
    posts: number;
    views: number;
    engagementRate: number;
    likes?: number;
    comments?: number;
  }>;
  topPosts?: Array<{
    id: string;
    platform: string;
    title: string;
    mediaUrl?: string;
    impressions?: number;
    likes?: number;
    comments?: number;
    engagementRate?: number;
  }>;
  options?: Partial<ReportContentOptions>;
};

export type GuestReportAi = {
  executiveSummary?: string;
  wins?: string[];
  improvements?: string[];
  recommendations?: string[];
} | null;

export type GuestReportDocumentProps = {
  workspaceName: string;
  title: string;
  periodLabel: string;
  metrics: GuestReportMetrics | null | undefined;
  aiInsights?: GuestReportAi;
  options?: Partial<ReportContentOptions>;
  className?: string;
};

function num(v: unknown) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function csvEscape(value: unknown) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(filename: string, rows: string[][]) {
  const body = rows.map((r) => r.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function resolveReportOptions(
  metrics?: GuestReportMetrics | null,
  override?: Partial<ReportContentOptions>
): ReportContentOptions {
  const fromMetrics = metrics?.options || {};
  return {
    includeInDepth:
      override?.includeInDepth ?? fromMetrics.includeInDepth ?? true,
    includeCharts:
      override?.includeCharts ?? fromMetrics.includeCharts ?? true,
    includeCsv: override?.includeCsv ?? fromMetrics.includeCsv ?? true,
  };
}

export default function GuestReportDocument({
  workspaceName,
  title,
  periodLabel,
  metrics,
  aiInsights,
  options: optionsOverride,
  className = '',
}: GuestReportDocumentProps) {
  const m = metrics || {};
  const options = resolveReportOptions(m, optionsOverride);

  const views = num(m.views);
  const engagementRate = num(m.engagementRate);
  const totalFollowers = num(m.totalFollowers ?? m.followerGrowth);
  const totalPosts = num(m.totalPosts);
  const likes = num(m.likes);
  const comments = num(m.comments);
  const shares = num(m.shares);
  const followersByPlatform = m.followersByPlatform || [];
  const platformBreakdown = m.platformBreakdown || [];
  const topPosts = m.topPosts || [];

  const chartData = platformBreakdown.map((p) => ({
    platform: p.platform,
    views: num(p.views),
    posts: num(p.posts),
    engagementRate: num(p.engagementRate),
  }));

  const hasLiveData =
    views > 0 ||
    totalPosts > 0 ||
    totalFollowers > 0 ||
    platformBreakdown.length > 0 ||
    topPosts.length > 0;

  const safePeriod = periodLabel.replace(/[^\w.-]+/g, '-');

  const onDownloadPostsCsv = () => {
    downloadCsv(`clikd-report-posts-${safePeriod}.csv`, [
      ['platform', 'title', 'impressions', 'likes', 'comments', 'engagement_rate'],
      ...topPosts.map((p) => [
        p.platform,
        p.title,
        String(num(p.impressions)),
        String(num(p.likes)),
        String(num(p.comments)),
        String(num(p.engagementRate)),
      ]),
    ]);
  };

  const onDownloadPlatformCsv = () => {
    downloadCsv(`clikd-report-platforms-${safePeriod}.csv`, [
      ['platform', 'posts', 'views', 'likes', 'comments', 'engagement_rate'],
      ...platformBreakdown.map((p) => [
        p.platform,
        String(num(p.posts)),
        String(num(p.views)),
        String(num(p.likes)),
        String(num(p.comments)),
        String(num(p.engagementRate)),
      ]),
    ]);
  };

  const onDownloadSummaryCsv = () => {
    downloadCsv(`clikd-report-summary-${safePeriod}.csv`, [
      ['metric', 'value'],
      ['workspace', workspaceName],
      ['title', title],
      ['period', periodLabel],
      ['views', String(views)],
      ['engagement_rate_pct', String(engagementRate)],
      ['followers', String(totalFollowers)],
      ['posts', String(totalPosts)],
      ['likes', String(likes)],
      ['comments', String(comments)],
      ['shares', String(shares)],
    ]);
  };

  return (
    <div
      className={`rounded-xl bg-white text-[#2C2621] p-5 sm:p-7 space-y-6 border border-[#E6E3DB] shadow-[0_1px_2px_rgba(44,38,33,0.04)] ${className}`}
    >
      <div>
        <p className="text-[10px] font-mono font-medium uppercase tracking-[0.16em] text-[#8A857D]">
          Verified static snapshot · Powered by clikd.app
        </p>
        <h3 className="font-playfair font-medium text-2xl mt-2 tracking-tight text-[#2C2621]">
          {workspaceName}
        </h3>
        <p className="text-sm text-[#8A857D] mt-1">{title}</p>
        <p className="text-xs text-[#8A857D] mt-0.5">{periodLabel}</p>
      </div>

      {!hasLiveData ? (
        <div className="rounded-xl border border-dashed border-[#E6E3DB] bg-[#F9F8F6] px-4 py-6 text-sm text-[#8A857D]">
          No live posts or connected audiences were found for this period.
          Connect social accounts and publish in-range content, then rebuild the
          report. Nothing here is mocked.
        </div>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Views', value: views.toLocaleString() },
          { label: 'Eng. rate', value: `${engagementRate}%` },
          { label: 'Followers', value: totalFollowers.toLocaleString() },
          { label: 'Posts', value: String(totalPosts) },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-xl bg-[#F9F8F6] border border-[#E6E3DB] p-4"
          >
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#8A857D]">
              {k.label}
            </p>
            <p className="text-xl font-medium mt-2 tabular-nums text-[#2C2621]">
              {k.value}
            </p>
          </div>
        ))}
      </div>

      {(likes > 0 || comments > 0 || shares > 0) && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Likes', value: likes.toLocaleString() },
            { label: 'Comments', value: comments.toLocaleString() },
            { label: 'Shares', value: shares.toLocaleString() },
          ].map((k) => (
            <div
              key={k.label}
              className="rounded-xl bg-[#F9F8F6] border border-[#E6E3DB] px-3 py-2.5 text-center"
            >
              <p className="text-[10px] font-mono uppercase tracking-widest text-[#8A857D]">
                {k.label}
              </p>
              <p className="text-lg font-medium mt-1 tabular-nums">{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {options.includeCharts && chartData.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-widest text-[#8A857D]">
            Views by platform
          </p>
          <div className="h-56 w-full rounded-xl border border-[#E6E3DB] bg-[#F9F8F6] p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke="#E6E3DB" vertical={false} />
                <XAxis
                  dataKey="platform"
                  tick={{ fill: '#8A857D', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#8A857D', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #E6E3DB',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="views" fill="#2C3B2E" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="h-56 w-full rounded-xl border border-[#E6E3DB] bg-[#F9F8F6] p-3">
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#8A857D] mb-2 px-1">
              Engagement rate by platform
            </p>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke="#E6E3DB" vertical={false} />
                <XAxis
                  dataKey="platform"
                  tick={{ fill: '#8A857D', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#8A857D', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #E6E3DB',
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="engagementRate"
                  fill="#B85C38"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {options.includeCsv ? (
        <div className="rounded-xl border border-[#E6E3DB] bg-[#F9F8F6] p-4 space-y-3">
          <p className="text-xs font-medium uppercase tracking-widest text-[#8A857D]">
            Download CSV
          </p>
          <p className="text-xs text-[#8A857D]">
            Export frozen snapshot data for your client — the same numbers stored
            in Supabase for this report.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onDownloadSummaryCsv}
              className="h-11 min-h-[44px] px-3 rounded-xl border border-[#E6E3DB] bg-white text-xs font-bold text-[#2C2621] inline-flex items-center gap-1.5"
            >
              <Download size={13} /> Summary CSV
            </button>
            <button
              type="button"
              onClick={onDownloadPlatformCsv}
              disabled={platformBreakdown.length === 0}
              className="h-11 min-h-[44px] px-3 rounded-xl border border-[#E6E3DB] bg-white text-xs font-bold text-[#2C2621] inline-flex items-center gap-1.5 disabled:opacity-40"
            >
              <Download size={13} /> Platforms CSV
            </button>
            <button
              type="button"
              onClick={onDownloadPostsCsv}
              disabled={topPosts.length === 0}
              className="h-11 min-h-[44px] px-3 rounded-xl border border-[#E6E3DB] bg-white text-xs font-bold text-[#2C2621] inline-flex items-center gap-1.5 disabled:opacity-40"
            >
              <Download size={13} /> Top posts CSV
            </button>
          </div>
        </div>
      ) : null}

      {followersByPlatform.length > 0 ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-[#8A857D] mb-2">
            Audience snapshot
          </p>
          <ul className="space-y-2">
            {followersByPlatform.map((f) => (
              <li
                key={f.platform}
                className="flex justify-between text-sm rounded-xl bg-[#F9F8F6] border border-[#E6E3DB] px-3 py-2.5"
              >
                <span className="capitalize font-medium">
                  {f.platform}
                  {f.handle ? (
                    <span className="text-[#8A857D] font-normal ml-1">
                      @{String(f.handle).replace(/^@/, '')}
                    </span>
                  ) : null}
                </span>
                <span className="text-[#8A857D] tabular-nums">
                  {num(f.count).toLocaleString()} followers
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {platformBreakdown.length > 0 ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-[#8A857D] mb-2">
            Platform breakdown
          </p>
          <ul className="space-y-2">
            {platformBreakdown.map((p) => (
              <li
                key={p.platform}
                className="flex justify-between text-sm rounded-xl bg-[#F9F8F6] border border-[#E6E3DB] px-3 py-2.5 gap-3"
              >
                <span className="capitalize font-medium">{p.platform}</span>
                <span className="text-[#8A857D] tabular-nums text-right">
                  {p.posts} posts · {num(p.views).toLocaleString()} views ·{' '}
                  {num(p.engagementRate)}% ER
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {options.includeInDepth && topPosts.length > 0 ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-[#8A857D] mb-2">
            In-depth · Top posts
          </p>
          <div className="overflow-x-auto rounded-xl border border-[#E6E3DB]">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-[#F9F8F6] text-[10px] font-mono uppercase tracking-widest text-[#8A857D]">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Post</th>
                  <th className="px-3 py-2.5 font-medium">Platform</th>
                  <th className="px-3 py-2.5 font-medium tabular-nums">Views</th>
                  <th className="px-3 py-2.5 font-medium tabular-nums">Likes</th>
                  <th className="px-3 py-2.5 font-medium tabular-nums">
                    Comments
                  </th>
                  <th className="px-3 py-2.5 font-medium tabular-nums">ER</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E3DB]">
                {topPosts.map((p) => (
                  <tr key={p.id} className="bg-white">
                    <td className="px-3 py-2.5 max-w-[220px]">
                      <div className="flex items-center gap-2 min-w-0">
                        {p.mediaUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.mediaUrl}
                            alt=""
                            className="h-10 w-10 rounded-lg object-cover flex-shrink-0 bg-[#F0EFEA]"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-[#F0EFEA] flex-shrink-0" />
                        )}
                        <span className="truncate font-medium">{p.title}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 capitalize text-[#8A857D]">
                      {p.platform}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {num(p.impressions).toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {num(p.likes).toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {num(p.comments).toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {num(p.engagementRate)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : topPosts.length > 0 ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-[#8A857D] mb-2">
            Top posts
          </p>
          <ul className="space-y-2">
            {topPosts.slice(0, 8).map((p) => (
              <li
                key={p.id}
                className="rounded-xl bg-[#F9F8F6] border border-[#E6E3DB] overflow-hidden flex gap-3"
              >
                {p.mediaUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.mediaUrl}
                    alt=""
                    className="w-16 h-16 object-cover flex-shrink-0 bg-[#E6E3DB]"
                  />
                ) : (
                  <div className="w-16 h-16 bg-[#E6E3DB] flex-shrink-0" />
                )}
                <div className="py-2.5 pr-3 min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{p.title}</p>
                  <p className="text-[11px] text-[#8A857D] mt-0.5 capitalize">
                    {p.platform} · {num(p.impressions).toLocaleString()} views ·{' '}
                    {num(p.engagementRate)}% ER
                    {p.likes != null
                      ? ` · ${num(p.likes).toLocaleString()} likes`
                      : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {aiInsights?.executiveSummary ? (
        <div className="rounded-xl border border-[#E6E3DB] bg-[#F9F8F6] p-4 space-y-3">
          <p className="text-xs font-medium text-[#2C3B2E] uppercase tracking-widest">
            Strategy notes
          </p>
          <p className="text-sm text-[#2C2621] leading-relaxed">
            {aiInsights.executiveSummary}
          </p>
          {aiInsights.wins?.length ? (
            <div>
              <p className="text-[11px] font-medium text-emerald-700 uppercase mb-1">
                Wins
              </p>
              <ul className="list-disc list-inside text-sm text-[#8A857D] space-y-1">
                {aiInsights.wins.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {aiInsights.improvements?.length ? (
            <div>
              <p className="text-[11px] font-medium text-amber-700 uppercase mb-1">
                Areas to improve
              </p>
              <ul className="list-disc list-inside text-sm text-[#8A857D] space-y-1">
                {aiInsights.improvements.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {aiInsights.recommendations?.length ? (
            <div>
              <p className="text-[11px] font-medium text-sky-700 uppercase mb-1">
                Recommendations
              </p>
              <ul className="list-disc list-inside text-sm text-[#8A857D] space-y-1">
                {aiInsights.recommendations.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

'use client';

/**
 * Interactive Meta Ads KPI trends — Spend, Conversions, ROAS, CPC + date presets.
 * Copy + currency follow the active LanguageSwitcher locale.
 */

import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { adminCardClass } from '@/components/admin/AdminUi';
import { formatAdsMoney } from '@/lib/ads/format-money';
import { localeTag, useLanguage } from '@/lib/i18n';

export type AdsInsightDay = {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  cpc: number;
  conversions: number;
  purchase_roas: number;
};

export type AdsKpis = {
  totalSpend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  avgCpc: number;
  avgRoas: number;
};

type MetricKey = 'spend' | 'conversions' | 'purchase_roas' | 'cpc';

export default function AdsKpiTrends({
  series,
  kpis,
  currency = 'SEK',
  preset,
  since,
  until,
  onPresetChange,
  onCustomRange,
  loading,
}: {
  series: AdsInsightDay[];
  kpis: AdsKpis;
  currency?: string;
  preset: string;
  since: string;
  until: string;
  onPresetChange: (preset: 'last_7d' | 'last_30d') => void;
  onCustomRange: (since: string, until: string) => void;
  loading?: boolean;
}) {
  const { locale, t } = useLanguage();
  const [active, setActive] = useState<MetricKey>('spend');

  const metrics = useMemo(
    () =>
      [
        {
          key: 'spend' as const,
          label: t('adsSpend'),
          color: '#F472B6',
          kpi: 'totalSpend' as const,
          format: 'money' as const,
        },
        {
          key: 'conversions' as const,
          label: t('adsConversions'),
          color: '#2B2568',
          kpi: 'conversions' as const,
          format: 'number' as const,
        },
        {
          key: 'purchase_roas' as const,
          label: t('adsRoas'),
          color: '#10B981',
          kpi: 'avgRoas' as const,
          format: 'roas' as const,
        },
        {
          key: 'cpc' as const,
          label: t('adsCpc'),
          color: '#7C3AED',
          kpi: 'avgCpc' as const,
          format: 'cpc' as const,
        },
      ] as const,
    [t]
  );

  const metric = metrics.find((m) => m.key === active) || metrics[0];

  const chartData = useMemo(
    () =>
      (series || []).map((d) => ({
        ...d,
        label: d.date.slice(5),
      })),
    [series]
  );

  const presetActive =
    preset === 'last_7d' || preset === 'last_30d' ? preset : null;

  function formatKpi(value: number, format: string) {
    if (format === 'money' || format === 'cpc') {
      return formatAdsMoney(value, currency, locale);
    }
    if (format === 'roas') return `${(value || 0).toFixed(2)}x`;
    return new Intl.NumberFormat(localeTag(locale)).format(
      Math.round(value || 0)
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-[family-name:var(--font-space-grotesk)] text-lg font-semibold text-[#0F172A]">
            {t('adsPerformance')}
          </h2>
          <p className="text-sm text-slate-500">{t('adsPerformanceSub')}</p>
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:ml-auto sm:w-auto">
          {(
            [
              ['last_7d', t('adsLast7Days')],
              ['last_30d', t('adsLast30Days')],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onPresetChange(id)}
              className={`min-h-11 rounded-xl px-3.5 text-sm font-medium transition ${
                presetActive === id
                  ? 'bg-[#2B2568] text-white'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
          <label className="flex min-h-11 items-center gap-2 rounded-xl bg-white px-3 text-sm text-slate-600 ring-1 ring-slate-200">
            <span className="sr-only">{t('adsFromDate')}</span>
            <input
              type="date"
              value={since}
              onChange={(e) => onCustomRange(e.target.value, until)}
              className="bg-transparent outline-none"
            />
            <span className="text-slate-300">→</span>
            <input
              type="date"
              value={until}
              onChange={(e) => onCustomRange(since, e.target.value)}
              className="bg-transparent outline-none"
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((m) => {
          const selected = active === m.key;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => setActive(m.key)}
              className={`${adminCardClass} min-h-[88px] p-4 text-left transition ${
                selected
                  ? 'ring-2 ring-[#F472B6]'
                  : 'hover:ring-1 hover:ring-slate-200'
              } ${loading ? 'opacity-70' : ''}`}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {m.label}
              </p>
              <p className="mt-1 font-[family-name:var(--font-fira-code)] text-xl font-semibold text-[#0F172A]">
                {formatKpi(kpis[m.kpi] || 0, m.format)}
              </p>
              <span
                className="mt-2 inline-block h-1 w-8 rounded-full"
                style={{ background: m.color }}
              />
            </button>
          );
        })}
      </div>

      <div className={`${adminCardClass} p-4 sm:p-5`}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-[#0F172A]">
            {t('adsTrend', { metric: metric.label })}
          </p>
          <p className="text-xs text-slate-400">
            {since} → {until}
          </p>
        </div>
        <div className="h-56 w-full">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              {t('adsNoInsightData')}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id={`ads-${metric.key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={metric.color}
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="100%"
                      stopColor={metric.color}
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#E2E8F0"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 8px 24px rgba(15,23,42,0.06)',
                  }}
                  formatter={(value) => [
                    formatKpi(Number(value) || 0, metric.format),
                    metric.label,
                  ]}
                  labelFormatter={(label) => String(label)}
                />
                <Area
                  type="monotone"
                  dataKey={metric.key}
                  stroke={metric.color}
                  strokeWidth={2.5}
                  fill={`url(#ads-${metric.key})`}
                  isAnimationActive
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}

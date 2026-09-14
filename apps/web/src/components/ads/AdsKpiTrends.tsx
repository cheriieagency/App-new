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
          color: '#2C3B2E',
          kpi: 'totalSpend' as const,
          format: 'money' as const,
        },
        {
          key: 'conversions' as const,
          label: t('adsConversions'),
          color: '#B85C38',
          kpi: 'conversions' as const,
          format: 'number' as const,
        },
        {
          key: 'purchase_roas' as const,
          label: t('adsRoas'),
          color: '#243228',
          kpi: 'avgRoas' as const,
          format: 'roas' as const,
        },
        {
          key: 'cpc' as const,
          label: t('adsCpc'),
          color: '#8A857D',
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
          <h2 className="font-playfair font-medium text-lg text-[#2C2621]">
            {t('adsPerformance')}
          </h2>
          <p className="text-sm text-[#8A857D] font-medium">
            {t('adsPerformanceSub')}
          </p>
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
                  ? 'bg-[#2C3B2E] text-[#F9F8F6]'
                  : 'bg-[#FFFFFF] text-[#8A857D] border border-[#E6E3DB] hover:bg-[#F0EFEA]'
              }`}
            >
              {label}
            </button>
          ))}
          <label className="flex min-h-11 items-center gap-2 rounded-xl bg-[#FFFFFF] px-3 text-sm text-[#8A857D] border border-[#E6E3DB]">
            <span className="sr-only">{t('adsFromDate')}</span>
            <input
              type="date"
              value={since}
              onChange={(e) => onCustomRange(e.target.value, until)}
              className="bg-transparent outline-none text-[#2C2621]"
            />
            <span className="text-[#E6E3DB]">→</span>
            <input
              type="date"
              value={until}
              onChange={(e) => onCustomRange(since, e.target.value)}
              className="bg-transparent outline-none text-[#2C2621]"
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
                  ? 'border-[#2C3B2E] bg-[rgba(44,59,46,0.06)]'
                  : 'hover:bg-[#F0EFEA]/50'
              } ${loading ? 'opacity-70' : ''}`}
            >
              <p className="text-[10px] font-inter font-medium uppercase tracking-[0.14em] text-[#8A857D]">
                {m.label}
              </p>
              <p className="mt-1 font-[family-name:var(--font-fira-code)] text-xl font-medium text-[#2C2621]">
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
          <p className="text-sm font-medium text-[#2C2621]">
            {t('adsTrend', { metric: metric.label })}
          </p>
          <p className="text-xs text-[#8A857D] font-medium">
            {since} → {until}
          </p>
        </div>
        <div className="h-56 w-full">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-[#8A857D]">
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
                      stopOpacity={0.28}
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
                  stroke="#E6E3DB"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#8A857D', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#8A857D', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #E6E3DB',
                    background: '#FFFFFF',
                    boxShadow: 'none',
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
                  strokeWidth={2}
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

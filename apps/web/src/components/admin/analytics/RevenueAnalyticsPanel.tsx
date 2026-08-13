'use client';

/**
 * Admin Analytics → Revenue: live storefront KPIs, 30-day chart, wallet payouts.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Banknote,
  Loader2,
  Package,
  Receipt,
  Wallet,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { adminCardClass, adminKpiClass } from '@/components/admin/AdminUi';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useLanguage } from '@/lib/locale-context';
import { localeTag } from '@/lib/i18n';

type RevenuePayload = {
  ok?: boolean;
  grossRevenue: number;
  netEarnings: number;
  totalOrders: number;
  walletBalance: number;
  stripeConnectEnabled: boolean;
  stripeConnectAccountId: string | null;
  salesByProduct: Array<{
    productTitle: string;
    orderCount: number;
    revenue: number;
  }>;
  dailyRevenueSeries: Array<{ date: string; revenue: number; orders: number }>;
  recentTransactions: Array<{
    id: number | string;
    buyerEmail: string | null;
    productTitle: string;
    amountGrossSek: number;
    platformFeeSek: number;
    amountNetSek: number;
    createdAt: string;
  }>;
  message?: string;
};

function formatSek(n: number, locale: string) {
  return `${Math.round(n).toLocaleString(locale)} SEK`;
}

export default function RevenueAnalyticsPanel() {
  const { locale } = useLanguage();
  const tag = localeTag(locale);
  const { activeWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const [payoutOpen, setPayoutOpen] = useState(false);

  const { data, isLoading, isFetching } = useQuery<RevenuePayload>({
    queryKey: ['analytics-revenue', activeWorkspace.id],
    queryFn: async () => {
      const res = await fetch(
        `/api/analytics/revenue?workspaceId=${encodeURIComponent(activeWorkspace.id)}`,
        { headers: { 'x-workspace-id': activeWorkspace.id } }
      );
      if (!res.ok) throw new Error('Failed to load revenue');
      return res.json();
    },
    enabled: Boolean(activeWorkspace.id),
    refetchInterval: 30_000,
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/payouts/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: activeWorkspace.id }),
      });
      const json = (await res.json()) as {
        url?: string | null;
        error?: string;
        stripeConnectEnabled?: boolean;
      };
      if (!res.ok) {
        throw new Error(json.error || 'Could not start Stripe Connect');
      }
      if (!json.url && !json.stripeConnectEnabled) {
        throw new Error(json.error || 'Could not start Stripe Connect');
      }
      return json;
    },
    onSuccess: (json) => {
      if (json.url) {
        window.location.href = json.url;
        return;
      }
      toast.success('Bank account already connected');
      void qc.invalidateQueries({ queryKey: ['analytics-revenue', activeWorkspace.id] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Connect failed');
    },
  });

  const payoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: activeWorkspace.id }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        walletBalance?: number;
        payout?: { amountSek: number; status: string };
      };
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Payout failed');
      }
      return json;
    },
    onSuccess: (json) => {
      toast.success(
        `Payout ${formatSek(json.payout?.amountSek || 0, tag)} — ${json.payout?.status || 'requested'}`
      );
      setPayoutOpen(false);
      void qc.invalidateQueries({ queryKey: ['analytics-revenue', activeWorkspace.id] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Payout failed');
    },
  });

  const chartData = useMemo(() => {
    return (data?.dailyRevenueSeries || []).map((d) => ({
      ...d,
      label: d.date.slice(5),
    }));
  }, [data?.dailyRevenueSeries]);

  const gross = data?.grossRevenue ?? 0;
  const net = data?.netEarnings ?? 0;
  const orders = data?.totalOrders ?? 0;
  const wallet = data?.walletBalance ?? 0;
  const connectReady = Boolean(data?.stripeConnectEnabled);

  const kpis = [
    {
      label: 'Total Gross Sales',
      value: formatSek(gross, tag),
      meta: 'Completed orders',
    },
    {
      label: 'Net Creator Earnings',
      value: formatSek(net, tag),
      meta: 'After platform fee',
    },
    {
      label: 'Total Orders',
      value: orders.toLocaleString(tag),
      meta: 'Link-in-Bio + store',
    },
    {
      label: 'Available Wallet Balance',
      value: formatSek(wallet, tag),
      meta: 'Ready to withdraw',
      cta: true,
    },
  ];

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((k) => (
          <div key={k.label} className={adminKpiClass}>
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
              {k.label}
            </p>
            <p className="mt-3 font-clikd-wordmark font-extrabold text-[26px] sm:text-[28px] leading-none text-slate-900 tracking-tight tabular-nums">
              {isLoading ? '—' : k.value}
            </p>
            <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs text-slate-400 font-medium">{k.meta}</span>
              {k.cta ? (
                <button
                  type="button"
                  onClick={() => setPayoutOpen(true)}
                  className="h-11 min-h-[44px] px-3.5 rounded-xl bg-clikd-pink text-white text-xs font-extrabold inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                >
                  <Wallet size={14} /> Request Payout
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className={`${adminCardClass} p-5 sm:p-7`}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
          <div>
            <h2 className="font-clikd-wordmark font-extrabold text-lg text-slate-900 tracking-tight">
              Sales & revenue
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Daily gross sales for the last 30 days
              {isFetching ? ' · refreshing…' : ''}
            </p>
          </div>
        </div>
        <div className="h-[240px] w-full min-h-[200px]">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-slate-400">
              No sales yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F472B6" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#F472B6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #E2E8F0',
                    fontSize: 12,
                  }}
                  formatter={(value) => [
                    formatSek(Number(value) || 0, tag),
                    'Revenue',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#F472B6"
                  strokeWidth={2}
                  fill="url(#revFill)"
                  animationDuration={700}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
        <div className={`${adminCardClass} overflow-hidden`}>
          <div className="px-5 sm:px-7 py-5 border-b border-slate-100 flex items-center gap-2">
            <Package size={16} className="text-slate-400" />
            <div>
              <h2 className="font-clikd-wordmark font-extrabold text-lg text-slate-900 tracking-tight">
                Top selling products
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">By gross revenue</p>
            </div>
          </div>
          <ul className="divide-y divide-slate-50">
            {(data?.salesByProduct || []).length === 0 ? (
              <li className="px-5 sm:px-7 py-10 text-sm text-slate-400 text-center">
                No product sales yet
              </li>
            ) : (
              (data?.salesByProduct || []).map((row) => (
                <li
                  key={row.productTitle}
                  className="px-5 sm:px-7 py-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {row.productTitle}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {row.orderCount} order{row.orderCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <p className="text-sm font-bold tabular-nums text-emerald-600 shrink-0">
                    {formatSek(row.revenue, tag)}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className={`${adminCardClass} overflow-hidden`}>
          <div className="px-5 sm:px-7 py-5 border-b border-slate-100 flex items-center gap-2">
            <Receipt size={16} className="text-slate-400" />
            <div>
              <h2 className="font-clikd-wordmark font-extrabold text-lg text-slate-900 tracking-tight">
                Recent transactions
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">Last 10 completed orders</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Buyer', 'Product', 'Gross', 'Fee', 'Net', 'Date'].map((h) => (
                    <th
                      key={h}
                      className="px-5 sm:px-7 py-3 text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.recentTransactions || []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 sm:px-7 py-10 text-sm text-slate-400 text-center"
                    >
                      —
                    </td>
                  </tr>
                ) : (
                  (data?.recentTransactions || []).map((tx) => (
                    <tr
                      key={String(tx.id)}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50"
                    >
                      <td className="px-5 sm:px-7 py-3.5 text-sm text-slate-600 truncate max-w-[140px]">
                        {tx.buyerEmail || '—'}
                      </td>
                      <td className="px-5 sm:px-7 py-3.5 text-sm font-semibold text-slate-900 truncate max-w-[140px]">
                        {tx.productTitle}
                      </td>
                      <td className="px-5 sm:px-7 py-3.5 text-sm tabular-nums text-slate-800">
                        {Math.round(tx.amountGrossSek)}
                      </td>
                      <td className="px-5 sm:px-7 py-3.5 text-sm tabular-nums text-slate-500">
                        {Math.round(tx.platformFeeSek)}
                      </td>
                      <td className="px-5 sm:px-7 py-3.5 text-sm font-bold tabular-nums text-emerald-600">
                        {Math.round(tx.amountNetSek)}
                      </td>
                      <td className="px-5 sm:px-7 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleDateString(tag)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {payoutOpen ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <button
            type="button"
            aria-label="Close payout"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => !payoutMutation.isPending && setPayoutOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Request payout"
            className="relative z-10 w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                  Creator wallet
                </p>
                <h3 className="font-clikd-wordmark font-extrabold text-xl text-slate-900 mt-1">
                  {formatSek(wallet, tag)}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Minimum payout 100 SEK
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPayoutOpen(false)}
                className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-slate-50 flex items-center justify-center"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {!connectReady ? (
              <div className="rounded-2xl border border-clikd-lilac/60 bg-[#FDF4FF] px-4 py-4 space-y-3">
                <p className="text-sm font-semibold text-slate-800">
                  Connect Bank Account with Stripe Express to enable 1-Click payouts
                </p>
                <button
                  type="button"
                  disabled={connectMutation.isPending}
                  onClick={() => connectMutation.mutate()}
                  className="h-11 min-h-[44px] w-full rounded-xl bg-[#2B2568] text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {connectMutation.isPending ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Banknote size={16} />
                  )}
                  Connect Bank Account
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={payoutMutation.isPending || wallet < 100}
                onClick={() => payoutMutation.mutate()}
                className="h-11 min-h-[44px] w-full rounded-xl bg-clikd-pink text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {payoutMutation.isPending ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Wallet size={16} />
                )}
                Withdraw {formatSek(wallet, tag)} to Bank Account
              </button>
            )}

            {connectReady && wallet < 100 ? (
              <p className="text-xs text-slate-400 text-center">
                Earn at least 100 SEK before requesting a payout.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

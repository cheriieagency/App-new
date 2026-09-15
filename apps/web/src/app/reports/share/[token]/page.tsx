'use client';

/**
 * Public guest report — verified snapshot (no login).
 * White canvas with charts / in-depth / CSV when frozen into the report.
 * ?print=1 opens the browser print dialog (Save as PDF).
 */

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { FileDown } from 'lucide-react';
import GuestReportDocument, {
  type GuestReportMetrics,
  type GuestReportAi,
} from '@/components/admin/analytics/GuestReportDocument';

type SharePayload = {
  ok?: boolean;
  error?: string;
  title?: string;
  workspaceName?: string;
  periodStart?: string;
  periodEnd?: string;
  metrics?: GuestReportMetrics;
  aiInsights?: GuestReportAi;
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
      <div className="min-h-screen bg-[#F9F8F6] text-[#8A857D] flex items-center justify-center text-sm font-medium">
        Loading report…
      </div>
    );
  }

  if (!data?.ok || !data.metrics) {
    return (
      <div className="min-h-screen bg-[#F9F8F6] text-[#2C2621] flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-lg font-extrabold">Report unavailable</p>
        <p className="text-sm text-[#8A857D]">
          {data?.error === 'Link expired'
            ? 'This guest link has expired.'
            : 'This share link is invalid or disabled.'}
        </p>
        <Link
          href="https://clikd.app"
          className="mt-2 h-11 min-h-[44px] px-4 rounded-xl bg-[#2C2621] text-white text-xs font-extrabold inline-flex items-center"
        >
          Powered by clikd.app
        </Link>
      </div>
    );
  }

  const periodLabel =
    data.periodStart && data.periodEnd
      ? `${data.periodStart} → ${data.periodEnd}`
      : '';

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#2C2621]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[#8A857D]">
            Verified static snapshot · Powered by clikd.app
          </p>
          <button
            type="button"
            onClick={() => window.print()}
            className="h-10 min-h-[40px] px-3 rounded-xl bg-[#2C2621] text-white text-xs font-extrabold inline-flex items-center gap-1.5"
          >
            <FileDown size={13} /> Save as PDF
          </button>
        </div>

        <GuestReportDocument
          workspaceName={data.workspaceName || 'Workspace'}
          title={data.title || 'Monthly report'}
          periodLabel={periodLabel}
          metrics={data.metrics}
          aiInsights={data.aiInsights || null}
        />

        <p className="text-center text-[11px] text-[#8A857D] print:hidden">
          Metrics are frozen from live connected accounts at report creation —
          not demo data.
        </p>
      </div>
    </div>
  );
}

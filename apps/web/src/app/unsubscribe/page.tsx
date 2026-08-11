'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, MailX } from 'lucide-react';
import Link from 'next/link';

function UnsubscribeInner() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasToken = useMemo(() => token.trim().length > 8, [token]);

  const confirm = async () => {
    if (!hasToken) {
      setError('Missing or invalid unsubscribe link.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Unsubscribe failed');
        return;
      }
      setDone(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-8 shadow-[0_8px_40px_-16px_rgba(15,23,42,0.12)] text-center">
        <p className="font-clikd-wordmark font-extrabold text-xl text-slate-900 mb-6">
          clikd<span className="text-[#F472B6]">:</span>
        </p>

        {done ? (
          <>
            <CheckCircle2 className="mx-auto text-[#10B981] mb-3" size={36} />
            <h1 className="font-outfit font-extrabold text-2xl text-slate-900 mb-2">
              You&apos;re unsubscribed
            </h1>
            <p className="text-sm text-slate-500 font-medium mb-6">
              You won&apos;t receive further marketing emails from this list. Transactional
              receipts may still arrive when you make a purchase.
            </p>
          </>
        ) : (
          <>
            <MailX className="mx-auto text-slate-400 mb-3" size={36} />
            <h1 className="font-outfit font-extrabold text-2xl text-slate-900 mb-2">
              Unsubscribe
            </h1>
            <p className="text-sm text-slate-500 font-medium mb-6">
              Confirm to stop marketing emails from clikd: workspaces.
            </p>
            {error ? (
              <p className="text-sm font-bold text-rose-500 mb-4">{error}</p>
            ) : null}
            <button
              type="button"
              disabled={!hasToken || loading}
              onClick={() => void confirm()}
              className="w-full min-h-[44px] rounded-2xl bg-[#2B2568] text-white text-sm font-extrabold hover:bg-[#1a1848] disabled:opacity-50"
            >
              {loading ? 'Working…' : 'Confirm unsubscribe'}
            </button>
          </>
        )}

        <Link
          href="/"
          className="inline-flex mt-6 text-sm font-bold text-[#F472B6] hover:text-[#2B2568]"
        >
          ← Back to clikd:
        </Link>
      </div>
    </main>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#FAFAFA] flex items-center justify-center text-slate-400 text-sm">
          Loading…
        </main>
      }
    >
      <UnsubscribeInner />
    </Suspense>
  );
}

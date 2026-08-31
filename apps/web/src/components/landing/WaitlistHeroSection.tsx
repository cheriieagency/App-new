'use client';

/**
 * VIP waitlist signup block — hero CTA for early access.
 * Used at the top of the live landing page (and standalone waitlist page).
 */

import { useMemo, useState, type FormEvent } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import {
  ltAccent,
  ltBadge,
  ltCta,
  ltHero,
  ltHeroSub,
  ltMuted,
} from '@/components/landing/landingType';

function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatQueueCount(n: number) {
  return n.toLocaleString('sv-SE');
}

export function WaitlistHeroSection() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [queueNumber, setQueueNumber] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    const e = normalizeEmail(email);
    return isValidEmail(e) && !pending;
  }, [email, pending]);

  const queueEstimate = queueNumber ?? 452;
  const queueEstimateText = formatQueueCount(queueEstimate);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const normalized = normalizeEmail(email);
    if (!isValidEmail(normalized)) {
      setError('Please enter a valid email address.');
      return;
    }

    setPending(true);
    try {
      const r = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalized }),
      });

      const data: unknown = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg =
          typeof data === 'object' && data != null && 'error' in data
            ? String((data as { error?: unknown }).error)
            : 'Failed to join waitlist.';
        setError(msg);
        return;
      }

      const q =
        typeof data === 'object' && data != null && 'queueNumber' in data
          ? Number((data as { queueNumber?: unknown }).queueNumber)
          : null;
      if (!q || !Number.isFinite(q)) {
        setError('Something went wrong—please try again.');
        return;
      }

      setQueueNumber(q);
    } catch (err) {
      setError('Network error—please try again.');
      console.error('[waitlist] submit failed', err);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-0 pt-6 sm:pt-12 text-center">
      <span className={`${ltBadge} gap-1 min-h-[44px] normal-case tracking-normal`}>
        <Sparkles size={12} />
        VIP Early Access
      </span>

      <h1 className={`mt-6 sm:mt-8 ${ltHero} px-1`}>
        Be first in the future{' '}
        <span className={`block ${ltAccent}`}>creators studio.</span>
      </h1>

      <p className={`${ltHeroSub} px-1`}>
        An all-in-one social media dashboard that replaces 5 separate tools. Direct dispatch to
        TikTok, Meta, Linkedin, Youtube &amp; Pinterest, fast checkout, community, email marketing,
        and Meta Ads.
      </p>

      {queueNumber == null ? (
        <>
          <form onSubmit={submit} className="mt-8 sm:mt-10 max-w-xl mx-auto">
            <div className="flex flex-col sm:flex-row items-stretch justify-center gap-3">
              <input
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="Enter your email address..."
                className="w-full sm:flex-1 sm:max-w-[420px] h-12 min-h-[44px] rounded-2xl border border-slate-200/90 bg-white px-5 text-base sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FCE7F3] focus:border-[#F472B6]/50"
              />

              <button
                type="submit"
                disabled={!canSubmit}
                className={`h-12 min-h-[44px] rounded-2xl bg-[#F472B6] hover:bg-[#F472B6]/90 text-white ${ltCta} px-6 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {pending ? 'Joining…' : 'Join the waitlist'}
                <ArrowRight size={16} />
              </button>
            </div>

            {error ? (
              <p className="mt-4 w-full text-sm font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 text-left sm:text-center">
                {error}
              </p>
            ) : (
              <p className={`mt-4 ${ltMuted} px-1`}>
                🔒 VIP queue + launch updates only. No spam-blasts.
              </p>
            )}
          </form>

          <p className={`mt-4 ${ltMuted} px-2`}>
            🔥 {queueEstimateText} creators are already in the queue for early access.
          </p>
        </>
      ) : (
        <div className="mt-8 sm:mt-10 max-w-xl mx-auto px-1">
          <div className="rounded-3xl bg-white/70 backdrop-blur border border-[#E9D5FF] p-5 sm:p-7 shadow-sm text-left sm:text-center">
            <p className="font-mono font-bold uppercase tracking-[0.14em] text-[#2B2568] text-[10px]">
              You&apos;re in
            </p>
            <p className="mt-3 font-outfit font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
              VIP queue spot secured.
            </p>
            <p className="mt-3 text-sm text-slate-600 font-display leading-relaxed">
              Check your inbox for your early access invite. If it doesn&apos;t arrive within a
              minute, check spam.
            </p>

            <div className="mt-5">
              <button
                type="button"
                onClick={() => {
                  setQueueNumber(null);
                  setEmail('');
                  setError(null);
                }}
                className={`w-full h-12 min-h-[44px] rounded-2xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-800 ${ltCta} px-5 transition-all`}
              >
                Join with a different email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

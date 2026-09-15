'use client';

/**
 * Editorial waitlist hero — VIP early access CTA for `/`.
 */

import { useMemo, useState, type FormEvent } from 'react';

function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatQueueCount(n: number) {
  return n.toLocaleString('en-US');
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
    <section className="mx-auto max-w-3xl px-6 sm:px-10 pt-24 sm:pt-32 pb-8 text-center">
      <span className="inline-flex items-center rounded-full border border-[#E6E3DB] bg-[rgba(184,92,56,0.06)] px-3.5 py-1.5 text-[10px] font-medium tracking-[0.18em] text-[#B85C38]">
        VIP EARLY ACCESS
      </span>

      <h1 className="mt-10 sm:mt-12 font-playfair text-[2.65rem] sm:text-5xl md:text-6xl lg:text-[4.25rem] font-medium leading-[1.08] tracking-[-0.02em] text-[#2C2621]">
        Join the new era of social media planning.
        <br />
        <em className="italic font-normal">Clikd studio</em>
      </h1>

      <p className="mt-7 sm:mt-8 mx-auto max-w-xl font-inter text-[15px] sm:text-base leading-relaxed text-[#8A857D]">
        An all-in-one social media dashboard that replaces 5 separate tools. Direct publishing,
        checkout, community, email, and ads — in one calm studio built for modern creators.
      </p>

      {queueNumber == null ? (
        <>
          <form onSubmit={submit} className="mt-12 sm:mt-14 mx-auto max-w-lg">
            <div className="flex flex-col sm:flex-row items-stretch gap-3 sm:gap-0 sm:border sm:border-[#E6E3DB] sm:bg-[#FFFFFF] sm:rounded-xl sm:p-1.5">
              <label className="sr-only" htmlFor="waitlist-email">
                Email address
              </label>
              <input
                id="waitlist-email"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="Your email address"
                className="w-full sm:flex-1 h-12 min-h-[44px] rounded-xl sm:rounded-lg border border-[#E6E3DB] sm:border-0 bg-[#FFFFFF] sm:bg-transparent px-4 text-[15px] font-inter text-[#2C2621] placeholder:text-[#8A857D]/70 focus:outline-none focus:ring-1 focus:ring-[#2C3B2E]/25 sm:focus:ring-0"
              />
              <button
                type="submit"
                disabled={!canSubmit}
                className="h-12 min-h-[44px] shrink-0 rounded-xl sm:rounded-lg bg-[#2C3B2E] px-6 text-[13px] font-inter font-medium tracking-wide text-[#F9F8F6] transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pending ? 'Joining…' : 'Join the waitlist'}
              </button>
            </div>

            {error ? (
              <p className="mt-5 text-sm font-inter text-[#B85C38]">{error}</p>
            ) : (
              <p className="mt-5 text-[12px] font-inter tracking-wide text-[#8A857D]">
                VIP queue + launch updates only.
              </p>
            )}
          </form>
        </>
      ) : (
        <div className="mt-12 sm:mt-14 mx-auto max-w-md editorial-card p-8 text-left sm:text-center">
          <p className="font-inter text-[10px] font-medium uppercase tracking-[0.16em] text-[#2C3B2E]">
            You&apos;re in
          </p>
          <p className="mt-3 font-playfair text-2xl sm:text-3xl text-[#2C2621] tracking-tight">
            VIP queue spot secured.
          </p>
          <p className="mt-3 text-sm font-inter leading-relaxed text-[#8A857D]">
            Check your inbox for confirmation. If it doesn&apos;t arrive within a minute, check
            spam.
          </p>
          <p className="mt-5 font-playfair text-xl text-[#2C2621]">#{queueEstimateText}</p>
          <button
            type="button"
            onClick={() => {
              setQueueNumber(null);
              setEmail('');
              setError(null);
            }}
            className="mt-6 w-full h-11 min-h-[44px] rounded-xl border border-[#E6E3DB] bg-[#F9F8F6] text-[13px] font-inter font-medium text-[#2C2621] hover:bg-[#FFFFFF] transition-colors"
          >
            Join with a different email
          </button>
        </div>
      )}
    </section>
  );
}

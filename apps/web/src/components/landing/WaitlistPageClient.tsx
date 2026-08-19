'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { ArrowRight, Mail, Sparkles, Users, Clock, ShieldCheck } from 'lucide-react';
import { ClikdWordmark } from '@/components/brand/ClikdLogo';

function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase();
}

function isValidEmail(email: string) {
  // Simple, practical validation: enough for UI + server-side guard.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatQueueNumber(n: number) {
  return `#${n.toLocaleString('en-US')}`;
}

export function WaitlistPageClient() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [queueNumber, setQueueNumber] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    const e = normalizeEmail(email);
    return isValidEmail(e) && !pending;
  }, [email, pending]);

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
            ? String((data as any).error)
            : 'Failed to join waitlist.';
        setError(msg);
        return;
      }

      const q =
        typeof data === 'object' && data != null && 'queueNumber' in data
          ? Number((data as any).queueNumber)
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
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Developer shortcut login */}
      <div className="flex justify-end px-4 sm:px-6 pt-4">
        <a
          href="/admin"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 backdrop-blur px-4 py-2 text-xs font-mono font-medium text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-colors"
        >
          Developer Login
        </a>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          {/* Left: value + proof */}
          <div className="space-y-6">
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-[#F472B6]">
              VIP early access
            </p>

            <div className="space-y-3">
              <h1 className="font-outfit font-bold text-4xl sm:text-5xl lg:text-[3.25rem] text-slate-900 tracking-tight leading-tight">
                clikd: VIP Waitlist
              </h1>
              <p className="text-slate-600 font-medium text-base sm:text-lg leading-relaxed font-display">
                Join the queue to get early access to the all-in-one studio: planner, bio store,
                community, ads and checkout—built for Nordic creators.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {[
                {
                  Icon: Sparkles,
                  title: 'Priority access',
                  sub: 'Be the first to get feature drops.',
                },
                { Icon: Clock, title: 'Coming soon', sub: 'We’ll invite you as we launch.' },
                {
                  Icon: Users,
                  title: 'Creator-first',
                  sub: 'Built for real social media workflows.',
                },
                {
                  Icon: ShieldCheck,
                  title: 'No spam',
                  sub: 'Only early access and launch info.',
                },
              ].map((x) => (
                <div
                  key={x.title}
                  className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
                >
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#E9D5FF]/70 text-[#2B2568]">
                    <x.Icon size={18} />
                  </div>
                  <p className="mt-3 font-outfit font-extrabold text-slate-900 tracking-tight">
                    {x.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 font-display">{x.sub}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-500 font-display">
              <Mail size={16} className="text-[#F472B6]" />
              <span>Early access only. Unsubscribe anytime.</span>
            </div>
          </div>

          {/* Right: form */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4 mb-6">
                <ClikdWordmark className="text-xl" />
                <span className="inline-flex items-center gap-1 rounded-full bg-[#FCE7F3] text-[#2B2568] px-3 py-1 text-[10px] font-extrabold">
                  <Sparkles size={12} /> Coming soon
                </span>
              </div>

              {queueNumber == null ? (
                <>
                  <h2 className="font-outfit font-extrabold text-2xl text-slate-900 tracking-tight">
                    Get on the VIP queue
                  </h2>
                  <p className="text-slate-600 mt-2 font-display leading-relaxed text-sm">
                    Enter your email. We’ll send your early access invite automatically.
                  </p>

                  <form onSubmit={submit} className="mt-6 space-y-3">
                    <label className="block">
                      <span className="sr-only">Email address</span>
                      <input
                        value={email}
                        onChange={(ev) => setEmail(ev.target.value)}
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="you@company.com"
                        className="w-full h-12 min-h-[44px] rounded-xl border border-slate-200/90 bg-white px-4 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FCE7F3] focus:border-[#F472B6]/50"
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={!canSubmit}
                      className="w-full h-12 min-h-[44px] rounded-xl bg-[#2B2568] hover:bg-[#1a1848] text-white font-extrabold text-sm px-5 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {pending ? 'Joining…' : 'Join waitlist'}
                      <ArrowRight size={16} />
                    </button>

                    {error ? (
                      <p className="text-sm font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                        {error}
                      </p>
                    ) : (
                      <p className="text-[12px] text-slate-500 font-display leading-relaxed">
                        By joining, you agree to receive early access emails. No marketing blasts.
                      </p>
                    )}
                  </form>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-[#E9D5FF]/50 border border-[#E9D5FF] p-5">
                    <p className="font-mono font-bold uppercase tracking-[0.14em] text-[#2B2568] text-[10px]">
                      Confirmation
                    </p>
                    <p className="mt-3 font-outfit font-extrabold text-2xl text-slate-900 tracking-tight">
                      You&apos;re in.
                    </p>
                    <p className="mt-2 text-slate-600 font-display leading-relaxed">
                      Queue number: <span className="font-mono font-extrabold text-[#2B2568]">{formatQueueNumber(queueNumber)}</span>
                    </p>
                  </div>

                  <p className="text-sm text-slate-600 font-display leading-relaxed">
                    Watch your inbox for your early access invite. If you don&apos;t see it within a
                    minute, check spam.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setQueueNumber(null);
                      setEmail('');
                      setError(null);
                    }}
                    className="w-full h-12 min-h-[44px] rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-800 font-extrabold text-sm px-5 transition-all"
                  >
                    Join with a different email
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


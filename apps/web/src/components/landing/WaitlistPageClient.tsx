'use client';

import { useMemo, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Mail,
  Sparkles,
  Users,
  CheckCircle2,
  Send,
  Inbox,
  Home,
  BarChart3,
  Megaphone,
  Music2,
  Camera,
} from 'lucide-react';
import { ClikdWordmark } from '@/components/brand/ClikdLogo';
import { PlatformShowcaseSection } from '@/components/landing/PlatformShowcaseSection';

function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase();
}

function isValidEmail(email: string) {
  // Simple, practical validation: enough for UI + server-side guard.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatQueueCount(n: number) {
  // Space as thousands separator (matches the screenshot vibe).
  return n.toLocaleString('sv-SE');
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
    <div className="min-h-screen bg-[#FAFAFA] overflow-x-hidden">
      {/* Top bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-5 sm:pt-8">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <ClikdWordmark className="text-lg sm:text-xl shrink-0" />

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Developer shortcut login */}
            <a
              href="/admin"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 backdrop-blur px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-mono font-medium text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-colors min-h-[44px] whitespace-nowrap"
            >
              <span className="sm:hidden">Dev Login</span>
              <span className="hidden sm:inline">Developer Login</span>
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-0 pt-6 sm:pt-12 text-center">
        {/* Promo pill */}
        <span className="inline-flex items-center gap-1 rounded-full bg-[#FCE7F3] text-[#2B2568] px-4 py-2 text-[10px] font-extrabold min-h-[44px]">
          <Sparkles size={12} />
          VIP Early Access
        </span>

        {/* Headline */}
        <h1 className="mt-6 sm:mt-8 font-outfit font-black text-[2.15rem] leading-[1.05] tracking-tight text-slate-900 sm:text-[2.9rem] lg:text-[3.7rem] px-1">
          Be first in the future{' '}
          <span className="block bg-gradient-to-r from-[#F472B6] via-[#E9D5FF] to-[#10B981] bg-clip-text text-transparent">
              creators studio.
          </span>
        </h1>

        <p className="mt-4 mx-auto max-w-2xl text-slate-600 font-display text-[15px] sm:text-lg leading-relaxed px-1">
          An all-in-one social media dashboard that replaces 5 separate tools. Direct dispatch to TikTok, Meta,
          Linkedin, Youtube &amp; Pinterest, fast checkout, community, email marketing, and Meta Ads.
        </p>

        {/* Email + CTA */}
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
                  className="h-12 min-h-[44px] rounded-2xl bg-[#F472B6] hover:bg-[#F472B6]/90 text-white font-extrabold text-sm px-6 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
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
                <p className="mt-4 text-[12px] sm:text-[12px] text-slate-500 font-display leading-relaxed px-1">
                  🔒 VIP queue + launch updates only. No spam-blasts.
                </p>
              )}
            </form>

            {/* Queue line */}
            <p className="mt-4 text-sm text-slate-500 font-display px-2 leading-relaxed">
              🔥 {queueEstimateText} creators are already in the queue for early access.
            </p>
          </>
        ) : (
          <div className="mt-8 sm:mt-10 max-w-xl mx-auto px-1">
            <div className="rounded-3xl bg-white/70 backdrop-blur border border-[#E9D5FF] p-5 sm:p-7 shadow-sm text-left sm:text-center">
              <p className="font-mono font-bold uppercase tracking-[0.14em] text-[#2B2568] text-[10px]">
                You&apos;re in
              </p>
              <p className="mt-3 font-outfit font-black text-2xl sm:text-3xl text-slate-900 tracking-tight">
                VIP queue spot secured.
              </p>
              <p className="mt-3 text-sm text-slate-600 font-display leading-relaxed">
                Check your inbox for your early access invite. If it doesn&apos;t arrive within a minute, check spam.
              </p>

              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => {
                    setQueueNumber(null);
                    setEmail('');
                    setError(null);
                  }}
                  className="w-full h-12 min-h-[44px] rounded-2xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-800 font-extrabold text-sm px-5 transition-all"
                >
                  Join with a different email
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Feature cards + comparison chart */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24 text-center">
        {/* Feature cards */}
        <section className="mt-10 sm:mt-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 text-left">
          {/* Card 1: Large (spans 2 columns on desktop) */}
          <div className="lg:col-span-2 bg-white/80 backdrop-blur border border-slate-200/80 rounded-3xl p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shrink-0">
                <Send size={22} />
              </div>

              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-700 px-3 sm:px-4 py-2 text-[10px] sm:text-[11px] font-extrabold border border-emerald-100 w-fit">
                Direct Publishing API
              </span>
            </div>

            <p className="mt-4 font-outfit font-black text-slate-900 text-[1.35rem] sm:text-[1.6rem] leading-tight tracking-tight">
              Automated Multi-Platform Auto-Posting
            </p>

            <p className="mt-2 text-sm sm:text-[15px] text-slate-600 font-display leading-relaxed">
              Schedule and publish videos directly to TikTok, Instagram Reels, and Facebook in seconds. Integrated
              OAuth scopes ensure zero manual draft approvals or push notification hassles.
            </p>

            <div className="mt-6 h-px bg-slate-200/70" />

            <div className="mt-5 flex flex-col gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-extrabold text-white min-h-[44px]">
                    <Music2 size={14} />
                    TikTok Direct Post Active
                  </span>

                  <span className="inline-flex items-center justify-center gap-2 rounded-full bg-[#FCE7F3] text-[#2B2568] px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-extrabold border border-[#F472B6]/20 min-h-[44px]">
                    <Camera size={14} />
                    Instagram Auto-Reel
                  </span>
                </div>

                <div className="flex items-center gap-2 text-emerald-600 font-extrabold text-xs sm:text-sm">
                  100% Direct API Status
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Email CRM */}
          <div className="bg-white/80 backdrop-blur border border-slate-200/80 rounded-3xl p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-700">
              <Mail size={22} />
            </div>
            <p className="mt-4 font-outfit font-extrabold text-slate-900 tracking-tight">Email CRM & Broadcasts</p>
            <p className="mt-2 text-sm text-slate-600 font-display leading-relaxed">
              Subscriber directly, automated email broadcasts, tags, and engagement tracking built on custom Resend
              infrastructure.
            </p>

            <div className="mt-6 h-px bg-slate-200/70" />

            <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
              <div className="inline-flex items-center gap-2 text-emerald-700 font-extrabold text-sm">
                <CheckCircle2 size={16} /> Resend Verified
              </div>
              <p className="text-xs font-display text-slate-500">99.8% Inbox Guarantee</p>
            </div>
          </div>

          {/* Row 2 cards */}
          <div className="bg-white/80 backdrop-blur border border-slate-200/80 rounded-3xl p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-700">
              <Inbox size={22} />
            </div>
            <p className="mt-4 font-outfit font-extrabold text-slate-900 tracking-tight">Automated DMs</p>
            <p className="mt-2 text-sm text-slate-600 font-display leading-relaxed">
              Manage DMs and comments across Instagram and TikTok profiles seamlessly from a single workspace.
            </p>

            <div className="mt-6 h-px bg-slate-200/70" />

            <div className="mt-5 flex items-center justify-between">
              <div className="text-sm font-extrabold text-slate-700 flex items-center gap-2">
                Auto Comment-to-DM Trigger
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur border border-slate-200/80 rounded-3xl p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="w-12 h-12 rounded-2xl bg-[#FCE7F3] flex items-center justify-center text-[#2B2568]">
              <Home size={22} />
            </div>
            <p className="mt-4 font-outfit font-extrabold text-slate-900 tracking-tight">Bio Link Storefront</p>
            <p className="mt-2 text-sm text-slate-600 font-display leading-relaxed">
              Custom themes, UTM tracking, digital products, and a tap mobile checkout flow.
            </p>

            <div className="mt-6 h-px bg-slate-200/70" />

            <div className="mt-5 flex items-center justify-between">
              <div className="text-sm font-extrabold text-[#F472B6] flex items-center gap-2">
                1-Tap Swish &amp; Card Checkout
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur border border-slate-200/80 rounded-3xl p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-700">
              <Users size={22} />
            </div>
            <p className="mt-4 font-outfit font-extrabold text-slate-900 tracking-tight">Community &amp; Courses</p>
            <p className="mt-2 text-sm text-slate-600 font-display leading-relaxed">
              Member feeds, moderation tools, classroom courses, storefront, live events, and XP leaderboards.
            </p>

            <div className="mt-6 h-px bg-slate-200/70" />

            <div className="mt-5 flex items-center justify-between">
              <div className="text-sm font-extrabold text-violet-700 flex items-center gap-2">
                Gamified Member Hub &amp; XP
              </div>
            </div>
          </div>

          {/* Row 3 cards */}
          <div className="bg-white/80 backdrop-blur border border-slate-200/80 rounded-3xl p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex items-start justify-between gap-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-50 flex items-center justify-center text-cyan-700">
                <Megaphone size={22} />
              </div>
              <span className="inline-flex items-center rounded-full bg-[#FFFBEB] text-[#F59E0B] px-3 py-1 text-[11px] font-extrabold border border-[#F59E0B]/20">
                NEW
              </span>
            </div>

            <p className="mt-4 font-outfit font-extrabold text-slate-900 tracking-tight">Meta Ads Manager &amp; ROAS</p>
            <p className="mt-2 text-sm text-slate-600 font-display leading-relaxed">
              Launch Facebook &amp; Instagram ad campaigns directly from your studio with real-time ROAS tracking and
              conversion attribution.
            </p>

            <div className="mt-6 h-px bg-slate-200/70" />

            <div className="mt-5 flex items-center justify-between">
              <div className="text-sm font-extrabold text-slate-700 flex items-center gap-2">
                Real-time Campaign ROAS
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white/80 backdrop-blur border border-slate-200/80 rounded-3xl p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-700">
              <BarChart3 size={22} />
            </div>

            <p className="mt-4 font-outfit font-extrabold text-slate-900 tracking-tight">
              In-depth Analytics &amp; Revenue Reports
            </p>

            <p className="mt-2 text-sm text-slate-600 font-display leading-relaxed">
              Reach, video views, impressions, audience growth, Linkin.bio performance, and total Swish &amp; card sales
              reports unified in one view.
            </p>

            <div className="mt-5 flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-4 py-2 text-xs font-extrabold">
                Reach: 94.2K
              </span>
              <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-4 py-2 text-xs font-extrabold">
                Views: 186.4K
              </span>
              <span className="inline-flex items-center rounded-full bg-[#E0F2FE] text-[#0284C7] px-4 py-2 text-xs font-extrabold">
                +842 Followers
              </span>
            </div>

            <div className="mt-6 h-px bg-slate-200/70" />

            <div className="mt-5 flex items-center justify-between">
              <div className="text-sm font-extrabold text-slate-700 flex items-center gap-2">
                Full Cross-Platform Reports
              </div>
            </div>
          </div>
          </div>
        </section>

        <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 overflow-hidden">
          <PlatformShowcaseSection />
        </div>

      </div>
    </div>
  );
}


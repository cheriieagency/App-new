'use client';

import Link from 'next/link';
import { Battery, Signal, Wifi } from 'lucide-react';
import { motion } from 'motion/react';

const CREATOR_AVATARS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&fit=crop&q=80',
];

const COVER_IMG =
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=640&h=240&fit=crop&q=80';
const AVATAR_IMG =
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=160&h=160&fit=crop&q=80';

const FLOAT_CARDS = [
  {
    emoji: '⚡',
    title: 'Swish Checkout',
    sub: '10s 1-Tap Buy',
    className: 'absolute -left-8 lg:-left-12 top-12',
  },
  {
    emoji: '🧾',
    title: 'Accounting Sync',
    sub: 'Fortnox & VAT',
    className: 'absolute -right-8 lg:-right-12 top-48',
  },
  {
    emoji: '🤖',
    title: 'AI Content Copilot',
    sub: '3x AI Assistants',
    className: 'absolute -left-8 lg:-left-12 top-64',
  },
  {
    emoji: '💬',
    title: 'Community Active',
    sub: '1,340 Members',
    className: 'absolute -right-8 lg:-right-12 bottom-16',
  },
] as const;

function PhoneStorefront() {
  return (
    <div className="relative mx-auto w-full max-w-[320px]">
      {/* Ambient glow behind phone */}
      <div
        className="absolute inset-0 -z-10 scale-125 bg-gradient-to-tr from-indigo-500/20 via-purple-500/20 to-pink-500/10 blur-3xl animate-pulse"
        aria-hidden
      />

      {/* Floating glass callouts */}
      {FLOAT_CARDS.map((card, i) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.35 + i * 0.08 }}
          className={`${card.className} glass-card p-3 rounded-2xl shadow-xl z-20 border-slate-200/80 hidden sm:flex items-start gap-2.5 max-w-[168px]`}
        >
          <span className="text-base leading-none mt-0.5" aria-hidden>
            {card.emoji}
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold text-slate-900 leading-tight truncate">
              {card.title}
            </p>
            <p className="text-[10px] font-semibold text-slate-500 mt-0.5">{card.sub}</p>
          </div>
        </motion.div>
      ))}

      {/* Phone shell */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.12 }}
        className="relative mx-auto w-full max-w-[320px]"
      >
        {/* Side volume buttons */}
        <div
          className="absolute -left-[3px] top-28 w-[3px] h-8 rounded-l-sm bg-gradient-to-b from-slate-400 to-slate-500 shadow-sm"
          aria-hidden
        />
        <div
          className="absolute -left-[3px] top-40 w-[3px] h-12 rounded-l-sm bg-gradient-to-b from-slate-400 to-slate-500 shadow-sm"
          aria-hidden
        />
        {/* Power button */}
        <div
          className="absolute -right-[3px] top-36 w-[3px] h-14 rounded-r-sm bg-gradient-to-b from-slate-400 to-slate-500 shadow-sm"
          aria-hidden
        />

        <div className="relative rounded-[2.35rem] bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 p-[10px] shadow-2xl shadow-indigo-900/20">
          {/* Titanium bezel + screen */}
          <div className="relative rounded-[1.9rem] overflow-hidden bg-white min-h-[630px] flex flex-col">
            {/* Dynamic Island */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-30 w-24 h-5 bg-black rounded-full" />

            {/* iOS status bar */}
            <div className="relative z-20 flex items-center justify-between px-5 pt-3.5 pb-1 text-[10px] font-bold text-slate-900">
              <span>9:41</span>
              <div className="flex items-center gap-1 text-slate-800">
                <Signal size={11} strokeWidth={2.5} aria-hidden />
                <Wifi size={11} strokeWidth={2.5} aria-hidden />
                <Battery size={12} strokeWidth={2.5} aria-hidden />
              </div>
            </div>

            <div className="flex-1 px-3.5 pb-5 pt-1 overflow-visible">
              {/* Cover clipped separately; avatar sits outside cover so it never clips */}
              <div className="relative mb-10 overflow-visible pt-1">
                <div className="h-24 rounded-2xl overflow-hidden">
                  <img
                    src={COVER_IMG}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 z-10 w-16 h-16">
                  <img
                    src={AVATAR_IMG}
                    alt="Sofia Bergström"
                    className="w-16 h-16 rounded-full object-cover ring-[3px] ring-white shadow-lg"
                  />
                </div>
              </div>

              {/* Profile info */}
              <div className="text-center mb-3">
                <p className="font-display font-extrabold text-slate-900 text-[15px] leading-none">
                  Sofia Bergström <span aria-hidden>✔️</span>
                </p>
                <p className="text-[10px] text-slate-500 font-medium mt-1.5 leading-snug">
                  Nordic Creator • Digital Courses & Live
                </p>
              </div>

              {/* Stat pills */}
              <div className="flex justify-center gap-1.5 mb-3.5">
                {[
                  { value: '48.2K', label: 'Followers' },
                  { value: '1,340', label: 'Members' },
                  { value: '12', label: 'Courses' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="flex-1 min-w-0 rounded-xl bg-slate-50 border border-slate-100 px-1.5 py-1.5 text-center"
                  >
                    <p className="text-[11px] font-extrabold text-slate-900 leading-none">
                      {stat.value}
                    </p>
                    <p className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase tracking-wide">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="w-full min-h-10 rounded-xl text-white text-[11px] font-extrabold flex items-center justify-center gap-1.5 mb-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md shadow-indigo-600/20">
                Enter Member Portal →
              </div>

              {/* Featured storefront */}
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                  Featured Storefront
                </p>
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                  🟢 Swish Active
                </span>
              </div>

              <div className="space-y-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-2.5 py-2 flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-sm shrink-0">
                    🎓
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-900 truncate">
                      Masterclass · Niche & Audience
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">Course · 8 modules</p>
                  </div>
                  <span className="text-[10px] font-extrabold text-slate-900 shrink-0">
                    1,499 SEK
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-2.5 py-2 flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-pink-100 flex items-center justify-center text-sm shrink-0">
                    ⚡
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-900 truncate">
                      Swish Starter Pack
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">Digital download</p>
                  </div>
                  <span className="text-[10px] font-extrabold text-emerald-600 shrink-0">
                    FREE
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-2.5 py-2 flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center text-sm shrink-0">
                    🎥
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-900 truncate">
                      Live Q&A Webinar
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">RSVP · This week</p>
                  </div>
                  <span className="text-[10px] font-extrabold text-indigo-600 shrink-0">
                    RSVP
                  </span>
                </div>
              </div>
            </div>

            {/* Home indicator */}
            <div className="pb-2 pt-1 flex justify-center" aria-hidden>
              <div className="w-28 h-1 rounded-full bg-slate-900/80" />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="relative min-h-[100svh] overflow-hidden pt-16 bg-gradient-to-b from-slate-50 via-indigo-50/20 to-slate-50">
      <div
        className="absolute -top-24 -left-16 w-[28rem] h-[28rem] rounded-full bg-indigo-400/15 blur-3xl pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute top-20 -right-24 w-[32rem] h-[32rem] rounded-full bg-pink-400/15 blur-3xl pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute bottom-10 left-1/3 w-72 h-72 rounded-full bg-purple-400/10 blur-3xl pointer-events-none"
        aria-hidden
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-20 lg:pb-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-10 items-center">
          {/* Left column — copy & CTAs */}
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-700 border border-indigo-500/20 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider mb-5"
            >
              ⚡ The All-in-One Platform for Nordic Creators
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="font-display font-extrabold text-slate-900 text-[2rem] sm:text-5xl lg:text-[3.15rem] leading-[1.08] tracking-tight mb-5"
            >
              Build, Sell & Scale —{' '}
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Community, Bio & Socials
              </span>{' '}
              in One App
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-md mx-auto lg:mx-0 mb-8"
            >
              Stop juggling Later, Linktree, Skool and Stripe. Sell digital products, host
              courses, plan social media content, and take instant Swish & Vipps payments — all
              in one app.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16 }}
              className="flex flex-col sm:flex-row items-center lg:items-stretch justify-center lg:justify-start gap-3 mb-8"
            >
              <Link
                href="/account/signup"
                className="w-full sm:w-auto bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:opacity-95 text-white font-bold px-7 py-4 rounded-2xl shadow-xl shadow-pink-500/25 flex items-center justify-center gap-2.5 transition-all transform hover:-translate-y-0.5 min-h-[44px]"
              >
                Start Your Free Community →
              </Link>
              <button
                type="button"
                onClick={() =>
                  document.getElementById('communities')?.scrollIntoView({ behavior: 'smooth' })
                }
                className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold px-7 py-4 rounded-2xl shadow-sm transition-all min-h-[44px]"
              >
                Explore Popular Communities
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.22 }}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3"
            >
              <div className="flex -space-x-2.5">
                {CREATOR_AVATARS.map((src, i) => (
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-sm"
                    style={{ zIndex: 4 - i }}
                  />
                ))}
              </div>
              <p className="text-sm font-semibold text-slate-600">
                <span aria-hidden>⭐⭐⭐⭐⭐</span> 500+ Nordic creators building income
              </p>
            </motion.div>
          </div>

          {/* Right column — phone + float cards */}
          <div className="relative flex justify-center lg:justify-end lg:pr-6">
            <PhoneStorefront />
          </div>
        </div>
      </div>
    </section>
  );
}

'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Check, LayoutGrid, List, X } from 'lucide-react';
import { useState } from 'react';

const FRAGMENTED_TOOLS = [
  {
    title: 'Link in Bio & Store',
    sub: 'Stan Store / Linktree',
    cost: '~$99 / mo',
  },
  {
    title: 'Community & Courses',
    sub: 'Skool / Circle',
    cost: '~$99 / mo',
  },
  {
    title: 'Social Content Planner',
    sub: 'Later / Planoly',
    cost: '~$25 / mo',
  },
  {
    title: 'Nordic VAT & Tax',
    sub: 'Manual calculation & friction',
    cost: 'Extra Time',
  },
];

const WINNER_PILLARS = [
  {
    title: '1-Tap Mobile Checkout',
    body: 'Convert mobile visitors in 10s with BankID, cards & Apple Pay.',
  },
  {
    title: 'Link in Bio & Digital Store',
    body: 'Sell e-books, courses & coaching with luxury theme presets.',
  },
  {
    title: 'Social Planner & Social Sets',
    body: 'Monthly calendar, Kanban board & multi-channel post scheduler.',
  },
  {
    title: 'Automated Nordic VAT & Tax',
    body: 'Automated 6%/25% VAT, Fortnox sync & receipt exports built-in.',
  },
];

type MockupView = 'bento' | 'table';

/** Why Choose Us — bento comparison: fragmented stack vs clikd: Creator Studio. */
export function ComparisonSection() {
  const [view, setView] = useState<MockupView>('bento');

  return (
    <section
      id="why-choose-us"
      className="relative py-16 sm:py-24 overflow-hidden bg-[#FAFAFA]"
      aria-labelledby="why-choose-heading"
    >
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-10">
          <span className="inline-flex items-center rounded-full bg-purple-50 border border-purple-200/80 px-3.5 py-1.5">
            <span className="font-mono text-xs font-bold text-purple-900 tracking-wide">
              ⚡ WHY CHOOSE CLIKD:
            </span>
          </span>
          <h2
            id="why-choose-heading"
            className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight font-outfit leading-tight"
          >
            Stop Juggling Multiple Subscriptions
          </h2>
          <p className="mt-4 text-slate-500 font-medium text-base sm:text-lg leading-relaxed font-sans max-w-2xl mx-auto">
            One unified studio replacing 4+ separate subscriptions, complex logins, and hidden
            transaction fees.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400">
              Mockup view:
            </span>
            <div className="inline-flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setView('bento')}
                className={`inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-full text-[11px] font-extrabold transition-colors ${
                  view === 'bento'
                    ? 'bg-[#2B2568] text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                <LayoutGrid size={13} strokeWidth={2.4} />
                Option A: Bento Cards
                <span
                  className={`ml-0.5 text-[9px] font-bold ${
                    view === 'bento' ? 'text-white/70' : 'text-slate-400'
                  }`}
                >
                  (Recommended)
                </span>
              </button>
              <button
                type="button"
                onClick={() => setView('table')}
                className={`inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-full text-[11px] font-extrabold transition-colors ${
                  view === 'table'
                    ? 'bg-[#2B2568] text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                <List size={13} strokeWidth={2.4} />
                Option B: Clean Glass Table
              </button>
            </div>
          </div>
        </div>

        {view === 'bento' ? <BentoComparison /> : <GlassTableComparison />}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="mt-5 sm:mt-6 rounded-2xl border border-purple-100 bg-gradient-to-r from-purple-50 via-pink-50 to-indigo-50 p-5 text-center"
        >
          <p className="text-sm sm:text-base font-bold text-slate-800 font-sans leading-snug">
            <span aria-hidden>💡 </span>
            Save over{' '}
            <span className="font-extrabold text-[#2B2568]">$2,000 / year</span> and{' '}
            <span className="font-extrabold text-[#2B2568]">15+ hours a week</span> by consolidating
            your creator stack into Clikd.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function BentoComparison() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45 }}
      className="grid lg:grid-cols-12 gap-4 sm:gap-5 items-stretch"
    >
      {/* Left — Fragmented Way (5/12) */}
      <div className="lg:col-span-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-[0_8px_30px_-16px_rgba(15,23,42,0.12)] flex flex-col">
        <div className="flex items-center justify-between gap-2 mb-4">
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200/70 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-rose-500">
            ❌ The Fragmented Way
          </span>
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
            4 Separate Apps
          </span>
        </div>

        <h3 className="font-outfit font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
          Stacking 4+ Tools
        </h3>
        <p className="mt-2 text-sm text-slate-500 font-medium leading-relaxed font-sans">
          Disconnected tools, double-entry admin, and high monthly subscription overhead.
        </p>

        <ul className="mt-5 space-y-2 flex-1">
          {FRAGMENTED_TOOLS.map((tool) => (
            <li
              key={tool.title}
              className="flex items-center gap-2.5 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 min-h-[52px]"
            >
              <span
                className="h-6 w-6 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center flex-shrink-0"
                aria-hidden
              >
                <X size={12} strokeWidth={2.75} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] sm:text-[13px] font-extrabold text-slate-800 leading-tight">
                  {tool.title}
                </p>
                <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5 truncate">
                  {tool.sub}
                </p>
              </div>
              <span className="text-[12px] font-mono font-extrabold text-rose-500 flex-shrink-0 tabular-nums">
                {tool.cost}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 pt-4 border-t border-slate-100 flex items-end justify-between gap-3">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
            Total Estimated Cost:
          </p>
          <p className="text-xl sm:text-2xl font-mono font-extrabold text-rose-500 tabular-nums tracking-tight">
            ~$223+ / mo
          </p>
        </div>
      </div>

      {/* Right — Winner (7/12) */}
      <div
        className="lg:col-span-7 rounded-2xl sm:rounded-3xl border-2 border-[#F472B6] p-5 sm:p-6 lg:p-7 flex flex-col text-white"
        style={{
          background: 'linear-gradient(155deg, #2B2568 0%, #1e1b4b 48%, #020617 100%)',
          boxShadow: '0 20px 50px -10px rgba(244, 114, 182, 0.25)',
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#10B981]/20 border border-[#10B981]/30 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#10B981]">
            ✓ All-in-One Winner
          </span>
          <span className="inline-flex items-center rounded-full bg-white/10 border border-white/15 px-2.5 py-1 text-[10px] font-bold text-white/90">
            clikd<span className="text-[#F472B6]">:</span> Creator Studio
          </span>
        </div>

        <h3 className="font-outfit font-extrabold text-2xl sm:text-3xl tracking-tight leading-tight">
          One Platform. Zero Friction.
        </h3>
        <p className="mt-2.5 text-sm sm:text-[15px] text-[#C4B5FD] font-medium leading-relaxed font-sans max-w-xl">
          Plan multi-channel calendars, monetize your link-in-bio, and host active member
          communities — all in one unified studio.
        </p>

        <div className="mt-5 grid sm:grid-cols-2 gap-2.5 flex-1">
          {WINNER_PILLARS.map((pillar) => (
            <div
              key={pillar.title}
              className="rounded-2xl bg-white/[0.06] border border-white/10 p-3.5 sm:p-4"
            >
              <div className="flex items-start gap-2">
                <span
                  className="mt-0.5 h-5 w-5 rounded-full bg-[#10B981]/20 text-[#10B981] flex items-center justify-center flex-shrink-0"
                  aria-hidden
                >
                  <Check size={11} strokeWidth={3} />
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] sm:text-[13px] font-extrabold text-[#10B981] leading-snug">
                    {pillar.title}
                  </p>
                  <p className="mt-1 text-[11px] sm:text-xs text-slate-300/90 font-medium leading-relaxed">
                    {pillar.body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-white/45">
              Starting from
            </p>
            <p className="mt-1 text-2xl sm:text-3xl font-mono font-extrabold text-white tabular-nums tracking-tight">
              199 SEK <span className="text-lg text-white/60">/mo</span>
            </p>
          </div>
          <Link
            href="/account/signup"
            className="inline-flex items-center justify-center min-h-[44px] px-6 py-3.5 rounded-2xl bg-[#F472B6] hover:bg-[#e0529c] text-slate-950 font-black text-xs transition-colors shadow-lg shadow-pink-500/20"
          >
            Start Your Free Studio →
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

/** Compact glass table fallback (Option B). */
function GlassTableComparison() {
  const rows = [
    { feature: 'Monthly cost', old: '~$223+ / mo', neu: '199 SEK / mo' },
    { feature: 'Link in bio + store', old: 'Stan / Linktree', neu: 'Built-in luxury themes' },
    { feature: 'Community & courses', old: 'Skool / Circle', neu: 'Hub + classroom + events' },
    { feature: 'Content planner', old: 'Later / Planoly', neu: 'Social Sets calendar' },
    { feature: 'Nordic VAT & tax', old: 'Manual friction', neu: '6%/25% + Fortnox sync' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45 }}
      className="rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white/80 backdrop-blur-sm shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] overflow-hidden"
    >
      <div className="grid grid-cols-[1fr_1fr_1.15fr] border-b border-slate-100">
        <div className="px-3 sm:px-5 py-4 sm:py-5" />
        <div className="px-3 sm:px-5 py-4 sm:py-5 border-l border-slate-100">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-rose-400">
            Fragmented stack
          </p>
        </div>
        <div className="px-3 sm:px-5 py-4 sm:py-5 bg-[#2B2568] text-white">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-[#10B981]">
            ✓ clikd: Studio
          </p>
        </div>
      </div>
      {rows.map((row, i) => (
        <div
          key={row.feature}
          className={`grid grid-cols-[1fr_1fr_1.15fr] ${
            i < rows.length - 1 ? 'border-b border-slate-100' : ''
          }`}
        >
          <div className="px-3 sm:px-5 py-3.5 sm:py-4 flex items-center">
            <p className="text-[12px] sm:text-sm font-extrabold text-slate-800">{row.feature}</p>
          </div>
          <div className="px-3 sm:px-5 py-3.5 sm:py-4 border-l border-slate-100 flex items-center gap-2">
            <X size={12} className="text-rose-400 flex-shrink-0 hidden sm:block" strokeWidth={2.5} />
            <p className="text-[11px] sm:text-sm font-semibold text-slate-500">{row.old}</p>
          </div>
          <div className="px-3 sm:px-5 py-3.5 sm:py-4 bg-[#2B2568] flex items-center gap-2">
            <Check
              size={12}
              className="text-[#10B981] flex-shrink-0 hidden sm:block"
              strokeWidth={2.75}
            />
            <p className="text-[11px] sm:text-sm font-bold text-white">{row.neu}</p>
          </div>
        </div>
      ))}
    </motion.div>
  );
}

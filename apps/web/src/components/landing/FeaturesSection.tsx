'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';

type FeatureTab = {
  id: number;
  title: string;
  previewTitle: string;
  subtitle: string;
  emoji: string;
  badge: string;
  footer: string;
};

const TABS: FeatureTab[] = [
  {
    id: 1,
    title: 'Link-in-Bio Builder',
    previewTitle: 'Link-in-Bio Storefront Builder',
    subtitle: 'Themes, UTM tracking, products & 1-tap Swish checkout.',
    emoji: '🔗',
    badge: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    footer: 'Connected to Instant Swish & Vipps Payments',
  },
  {
    id: 2,
    title: 'Content Planner & Social Sets',
    previewTitle: 'Content Planner & Social Sets',
    subtitle: 'Calendar, Kanban & multi-brand Social Sets for Instagram & TikTok.',
    emoji: '📅',
    badge: 'bg-purple-50 text-purple-600 border-purple-200',
    footer: 'Multi-brand Social Sets synced across Instagram & TikTok',
  },
  {
    id: 3,
    title: 'In-depth Analytics',
    previewTitle: 'In-depth Analytics Overview',
    subtitle: 'Overview, audience growth, posts, reels & bio link metrics.',
    emoji: '📊',
    badge: 'bg-pink-50 text-pink-600 border-pink-200',
    footer: 'Realtime growth, reach and bio-link sales in one view',
  },
  {
    id: 4,
    title: 'Gamified Community & Forum',
    previewTitle: 'Gamified Community & Forum',
    subtitle: 'Feed, XP levels, classroom courses & member leaderboards.',
    emoji: '💬',
    badge: 'bg-cyan-50 text-cyan-600 border-cyan-200',
    footer: 'Members earn XP, unlock levels and climb the leaderboard',
  },
  {
    id: 5,
    title: 'Nordic VAT & Accounting',
    previewTitle: 'Nordic VAT & Accounting',
    subtitle: 'Proper 6%/25% VAT, receipt exports & BankID verification.',
    emoji: '🧾',
    badge: 'bg-amber-50 text-amber-600 border-amber-200',
    footer: 'Fortnox + BankID ready for Swedish & Nordic compliance',
  },
];

function BioPreview() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Theme</p>
          <p className="text-sm font-extrabold text-slate-900">Nordic Minimal</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Swish Status</p>
          <p className="text-sm font-extrabold text-emerald-700">Enabled · 10s Buy</p>
        </div>
      </div>
      <div className="mx-auto max-w-[220px] rounded-[1.75rem] bg-slate-900 p-3 shadow-xl">
        <div className="rounded-[1.35rem] bg-slate-950 overflow-hidden text-white">
          <div className="h-14 bg-gradient-to-r from-clikd-midnight via-fuchsia-600 to-clikd-pink" />
          <div className="px-3 pb-3 -mt-5 text-center">
            <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-white text-slate-900 font-extrabold flex items-center justify-center ring-2 ring-slate-900">
              SB
            </div>
            <p className="text-xs font-extrabold">Sofia Bergström ✔️</p>
            <p className="text-[10px] text-slate-400 mt-0.5 mb-3">clikd:</p>
            <div className="space-y-1.5 text-left">
              <div className="rounded-xl bg-white/10 px-2.5 py-2 flex justify-between gap-2">
                <span className="text-[10px] font-bold truncate">Masterclass</span>
                <span className="text-[10px] font-extrabold shrink-0">1,499 SEK</span>
              </div>
              <div className="rounded-xl bg-white/10 px-2.5 py-2 flex justify-between gap-2">
                <span className="text-[10px] font-bold truncate">Swish Starter Pack</span>
                <span className="text-[10px] font-extrabold text-emerald-400 shrink-0">FREE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlannerPreview() {
  const cols = [
    { title: 'IDEA', items: ['Reel hooks', 'Story poll'] },
    { title: 'IN PROGRESS', items: ['Carousel draft'] },
    { title: 'SCHEDULED', items: ['Thu 18:00', 'Fri 09:30'] },
  ];
  return (
    <div className="space-y-4">
      <span className="inline-flex items-center rounded-full bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1 text-xs font-extrabold">
        Social Set · @charlie.agency
      </span>
      <div className="grid grid-cols-3 gap-2">
        {cols.map((col) => (
          <div key={col.title} className="rounded-2xl bg-slate-50 border border-slate-200 p-2.5 min-h-[160px]">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
              {col.title}
            </p>
            <div className="space-y-1.5">
              {col.items.map((item) => (
                <div
                  key={item}
                  className="rounded-xl bg-white border border-slate-200 px-2 py-2 text-[11px] font-bold text-slate-700 shadow-sm"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsPreview() {
  const bars = [40, 55, 48, 72, 64, 88, 76];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Followers', value: '48.2K' },
          { label: 'Growth', value: '+18.4%' },
          { label: 'Reach', value: '142.9K' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-pink-100 bg-pink-50/60 px-3 py-3 text-center"
          >
            <p className="text-lg font-extrabold text-slate-900">{stat.value}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-3">
          7-day growth
        </p>
        <div className="flex items-end gap-1.5 h-28">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-lg bg-gradient-to-t from-pink-500 to-indigo-500"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function CommunityPreview() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-4">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-700 mb-1">
          Member status
        </p>
        <p className="text-lg font-extrabold text-slate-900">Level 3 · VIP Member</p>
        <p className="text-sm font-bold text-cyan-700 mt-1">1,240 XP earned</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-3">
          Leaderboard
        </p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-extrabold text-slate-900">Your rank</p>
            <p className="text-xs font-medium text-slate-500">This week · Community XP</p>
          </div>
          <span className="text-2xl font-extrabold text-indigo-600">#4</span>
        </div>
      </div>
    </div>
  );
}

function AccountingPreview() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 mb-1">
            Accounting integration
          </p>
          <p className="text-base font-extrabold text-slate-900">Fortnox Connected ✓</p>
        </div>
        <span className="text-2xl" aria-hidden>
          🧾
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Course VAT</p>
          <p className="text-xl font-extrabold text-slate-900 mt-1">25%</p>
          <p className="text-[11px] font-medium text-slate-500">Receipt ready</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Book VAT</p>
          <p className="text-xl font-extrabold text-slate-900 mt-1">6%</p>
          <p className="text-[11px] font-medium text-slate-500">Receipt ready</p>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700">
        BankID verification · Enabled
      </div>
    </div>
  );
}

function PreviewCanvas({ tabId }: { tabId: number }) {
  switch (tabId) {
    case 1:
      return <BioPreview />;
    case 2:
      return <PlannerPreview />;
    case 3:
      return <AnalyticsPreview />;
    case 4:
      return <CommunityPreview />;
    case 5:
      return <AccountingPreview />;
    default:
      return <BioPreview />;
  }
}

export function FeaturesSection() {
  const [activeTab, setActiveTab] = useState<number>(1);
  const active = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  return (
    <section
      id="features"
      className="relative py-20 sm:py-28 overflow-hidden bg-gradient-to-b from-slate-50 via-indigo-50/20 to-slate-50"
    >
      <div
        className="absolute -top-16 -right-20 w-[28rem] h-[28rem] rounded-full bg-indigo-400/10 blur-3xl pointer-events-none"
        aria-hidden
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-500/10 border border-indigo-500/20 px-4 py-1.5 rounded-full mb-4">
            ⚡ The Platform
          </div>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 tracking-tight">
            Everything to{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Sell, Post & Scale
            </span>
          </h2>
          <p className="mt-4 text-slate-600 font-medium text-base sm:text-lg leading-relaxed">
            Creator Admin for social planning, bio link & analytics — plus community, live events,
            email CRM, and Nordic checkout for your members.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-5 lg:gap-6 items-start">
          {/* Left — feature tabs */}
          <div className="lg:col-span-5 space-y-3">
            {TABS.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left flex items-start gap-3.5 min-h-[44px] ${
                    isActive
                      ? 'bg-white border-indigo-500/80 shadow-lg shadow-indigo-500/10 ring-2 ring-indigo-500/20 rounded-2xl p-4 transition-all duration-300'
                      : 'bg-white/70 hover:bg-white border border-slate-200/80 opacity-80 hover:opacity-100 rounded-2xl p-4 transition-all duration-300'
                  }`}
                >
                  <span
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-base border ${tab.badge}`}
                    aria-hidden
                  >
                    {tab.emoji}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display font-extrabold text-sm sm:text-base text-slate-900">
                      {tab.title}
                    </span>
                    <span className="block text-sm font-medium text-slate-500 mt-0.5 leading-snug">
                      {tab.subtitle}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right — live admin preview */}
          <div className="lg:col-span-7">
            <div className="bg-white/95 border border-slate-200/90 rounded-3xl p-6 shadow-xl relative overflow-hidden min-h-[520px] flex flex-col justify-between">
              <div
                className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-indigo-400/10 blur-3xl pointer-events-none"
                aria-hidden
              />

              <div className="relative">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0"
                      aria-hidden
                    />
                    <h3 className="font-display font-extrabold text-base sm:text-lg text-slate-900 truncate">
                      {active.previewTitle}
                    </h3>
                  </div>
                  <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] px-3 py-1 rounded-full font-mono font-bold shrink-0">
                    Live Admin Preview
                  </span>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={active.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.22 }}
                  >
                    <PreviewCanvas tabId={active.id} />
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="relative mt-8 pt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm font-medium text-slate-500">{active.footer}</p>
                <Link
                  href="/admin"
                  className="text-indigo-600 font-bold hover:text-indigo-700 text-sm inline-flex items-center min-h-[44px]"
                >
                  Try in Admin Dashboard →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

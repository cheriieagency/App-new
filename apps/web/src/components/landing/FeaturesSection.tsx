'use client';

import { useState, type ElementType } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  CalendarDays,
  Link2,
  MessageSquare,
  Receipt,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '@/lib/locale-context';
import { t, type TranslationKey } from '@/lib/i18n';

type FeatureTabDef = {
  id: number;
  titleKey: TranslationKey;
  summaryKey: TranslationKey;
  icon: ElementType;
  iconWrap: string;
};

const TABS: FeatureTabDef[] = [
  {
    id: 1,
    titleKey: 'featureStoreTitle',
    summaryKey: 'featureStoreSummary',
    icon: Link2,
    iconWrap: 'bg-[#FCE7F3] text-[#F472B6]',
  },
  {
    id: 2,
    titleKey: 'featurePlannerTitle',
    summaryKey: 'featurePlannerSummary',
    icon: CalendarDays,
    iconWrap: 'bg-slate-100 text-slate-700',
  },
  {
    id: 3,
    titleKey: 'featureAnalyticsTitle',
    summaryKey: 'featureAnalyticsSummary',
    icon: BarChart3,
    iconWrap: 'bg-[#E9D5FF]/50 text-[#2B2568]',
  },
  {
    id: 4,
    titleKey: 'featureCommunityTitle',
    summaryKey: 'featureCommunitySummary',
    icon: MessageSquare,
    iconWrap: 'bg-emerald-50 text-[#10B981]',
  },
  {
    id: 5,
    titleKey: 'featureFinanceTitle',
    summaryKey: 'featureFinanceSummary',
    icon: Receipt,
    iconWrap: 'bg-slate-100 text-slate-700',
  },
];

function BioPreview() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50 px-3 py-2">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
            Active Theme
          </p>
          <p className="text-sm font-extrabold text-slate-900 font-outfit">Nordic Minimal</p>
        </div>
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50 px-3 py-2">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-[#10B981]">
            Swish Status
          </p>
          <p className="text-sm font-extrabold text-emerald-800 font-outfit">Enabled · 10s Buy</p>
        </div>
      </div>
      <div className="mx-auto max-w-[220px] rounded-[1.75rem] bg-[#0F172A] p-3 shadow-xl">
        <div className="rounded-[1.35rem] bg-[#1a1848] overflow-hidden text-white">
          <div className="h-14 bg-gradient-to-r from-[#2B2568] via-[#2B2568] to-[#F472B6]" />
          <div className="px-3 pb-3 -mt-5 text-center">
            <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-white text-slate-900 font-extrabold flex items-center justify-center ring-2 ring-[#1a1848]">
              SB
            </div>
            <p className="text-xs font-extrabold">Sofia Bergström</p>
            <p className="text-[10px] text-slate-400 mt-0.5 mb-3 font-clikd-wordmark">
              clikd<span className="text-[#F472B6]">:</span>
            </p>
            <div className="space-y-1.5 text-left">
              <div className="rounded-xl bg-white/10 px-2.5 py-2 flex justify-between gap-2">
                <span className="text-[10px] font-bold truncate">Masterclass</span>
                <span className="text-[10px] font-extrabold shrink-0 font-mono">1,499 SEK</span>
              </div>
              <div className="rounded-xl bg-white/10 px-2.5 py-2 flex justify-between gap-2">
                <span className="text-[10px] font-bold truncate">Swish Starter Pack</span>
                <span className="text-[10px] font-extrabold text-[#10B981] shrink-0">FREE</span>
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
      <span className="inline-flex items-center rounded-full bg-[#FCE7F3] text-[#F472B6] border border-[#F472B6]/20 px-3 py-1 text-xs font-extrabold">
        Social Set · @charlie.agency
      </span>
      <div className="grid grid-cols-3 gap-2">
        {cols.map((col) => (
          <div
            key={col.title}
            className="rounded-2xl bg-slate-50 border border-slate-200/80 p-2.5 min-h-[160px]"
          >
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400 mb-2">
              {col.title}
            </p>
            <div className="space-y-1.5">
              {col.items.map((item) => (
                <div
                  key={item}
                  className="rounded-xl bg-white border border-slate-200/80 px-2 py-2 text-[11px] font-bold text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
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
            className="rounded-2xl border border-slate-200/80 bg-white px-3 py-3 text-center shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
          >
            <p className="text-lg font-extrabold text-slate-900 font-outfit tracking-tight">
              {stat.value}
            </p>
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4">
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400 mb-3">
          7-day growth
        </p>
        <div className="flex items-end gap-1.5 h-28">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-lg bg-gradient-to-t from-[#2B2568] to-[#F472B6]"
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
      <div className="rounded-2xl border border-[#E9D5FF] bg-[#E9D5FF]/30 px-4 py-4">
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-[#2B2568] mb-1">
          Member status
        </p>
        <p className="text-lg font-extrabold text-slate-900 font-outfit">Level 3 · VIP Member</p>
        <p className="text-sm font-bold text-[#2B2568] mt-1">1,240 XP earned</p>
      </div>
      <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400 mb-3">
          Leaderboard
        </p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-extrabold text-slate-900">Your rank</p>
            <p className="text-xs font-medium text-slate-500">This week · Community XP</p>
          </div>
          <span className="text-2xl font-extrabold text-[#F472B6] font-outfit">#4</span>
        </div>
      </div>
    </div>
  );
}

function AccountingPreview() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50 px-4 py-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-[#10B981] mb-1">
            Accounting integration
          </p>
          <p className="text-base font-extrabold text-slate-900 font-outfit">Fortnox Connected</p>
        </div>
        <Receipt size={22} className="text-[#10B981]" aria-hidden />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white px-3 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
            Course VAT
          </p>
          <p className="text-xl font-extrabold text-slate-900 mt-1 font-outfit">25%</p>
          <p className="text-[11px] font-medium text-slate-500">Receipt ready</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white px-3 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
            Book VAT
          </p>
          <p className="text-xl font-extrabold text-slate-900 mt-1 font-outfit">6%</p>
          <p className="text-[11px] font-medium text-slate-500">Receipt ready</p>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700">
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
  const { locale } = useLanguage();
  const [activeTab, setActiveTab] = useState<number>(1);
  const active = TABS.find((tab) => tab.id === activeTab) ?? TABS[0];

  return (
    <section
      id="features"
      className="relative py-16 sm:py-24 overflow-hidden bg-[#FAFAFA]"
      aria-labelledby="features-heading"
    >
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center mb-10 sm:mb-12">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-[#F472B6] mb-3">
            {t('featuresEyebrow', locale)}
          </p>
          <h2
            id="features-heading"
            className="font-outfit font-extrabold text-3xl sm:text-4xl text-slate-900 tracking-tight leading-tight"
          >
            {t('featuresHeadline', locale)}
          </h2>
          <p className="mt-3 text-slate-600 font-medium text-base sm:text-lg leading-relaxed font-display">
            {t('featuresSub', locale)}
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-5 lg:gap-6 items-start">
          <div className="lg:col-span-5 space-y-3">
            {TABS.map((tab) => {
              const isActive = tab.id === activeTab;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left flex items-start gap-3.5 min-h-[44px] rounded-2xl p-4 border transition-all duration-300 ${
                    isActive
                      ? 'bg-white border-[#F472B6] shadow-md shadow-[#F472B6]/10'
                      : 'bg-white border-slate-200/80 hover:border-slate-300/90 shadow-[0_1px_2px_rgba(15,23,42,0.03)]'
                  }`}
                >
                  <span
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tab.iconWrap}`}
                    aria-hidden
                  >
                    <Icon size={18} strokeWidth={2.25} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-outfit font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                      {t(tab.titleKey, locale)}
                    </span>
                    <span className="block text-sm font-medium text-slate-500 mt-0.5 leading-snug font-display">
                      {t(tab.summaryKey, locale)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-7">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)] relative overflow-hidden min-h-[520px] flex flex-col justify-between">
              <div className="relative">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse shrink-0"
                      aria-hidden
                    />
                    <h3 className="font-outfit font-extrabold text-base sm:text-lg text-slate-900 truncate tracking-tight">
                      {t(active.titleKey, locale)}
                    </h3>
                  </div>
                  <span className="bg-slate-50 text-slate-600 border border-slate-200/80 text-[10px] px-3 py-1 rounded-full font-mono font-bold shrink-0 uppercase tracking-[0.12em]">
                    {t('featuresLivePreview', locale)}
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
                <p className="text-sm font-medium text-slate-500 font-display">
                  {t(active.summaryKey, locale)}
                </p>
                <Link
                  href="/admin"
                  className="text-[#F472B6] font-bold hover:text-[#2B2568] text-sm inline-flex items-center min-h-[44px] transition-colors"
                >
                  {t('featuresTryAdmin', locale)}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

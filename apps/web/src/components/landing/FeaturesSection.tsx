'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart3,
  Bot,
  CalendarDays,
  Link2,
  Mail,
  MessageSquare,
  Receipt,
  Video,
} from 'lucide-react';
import { useLanguage } from '@/lib/locale-context';
import { t, type TranslationKey } from '@/lib/i18n';

const FEATURE_DEFS: {
  id: string;
  icon: typeof Link2;
  titleKey: TranslationKey;
  summaryKey: TranslationKey;
  accent: string;
}[] = [
  {
    id: 'bio',
    icon: Link2,
    titleKey: 'featureStoreTitle',
    summaryKey: 'featureStoreSummary',
    accent: 'from-indigo-500 to-purple-500',
  },
  {
    id: 'planner',
    icon: CalendarDays,
    titleKey: 'featurePlannerTitle',
    summaryKey: 'featurePlannerSummary',
    accent: 'from-pink-500 to-rose-500',
  },
  {
    id: 'analytics',
    icon: BarChart3,
    titleKey: 'featureAnalyticsTitle',
    summaryKey: 'featureAnalyticsSummary',
    accent: 'from-violet-500 to-indigo-500',
  },
  {
    id: 'community',
    icon: MessageSquare,
    titleKey: 'featureCommunityTitle',
    summaryKey: 'featureCommunitySummary',
    accent: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'events',
    icon: Video,
    titleKey: 'featureEventsTitle',
    summaryKey: 'featureEventsSummary',
    accent: 'from-sky-500 to-blue-500',
  },
  {
    id: 'email',
    icon: Mail,
    titleKey: 'featureEmailTitle',
    summaryKey: 'featureEmailSummary',
    accent: 'from-amber-500 to-orange-500',
  },
  {
    id: 'ai',
    icon: Bot,
    titleKey: 'featureAiTitle',
    summaryKey: 'featureAiSummary',
    accent: 'from-fuchsia-500 to-pink-500',
  },
  {
    id: 'finance',
    icon: Receipt,
    titleKey: 'featureFinanceTitle',
    summaryKey: 'featureFinanceSummary',
    accent: 'from-slate-600 to-slate-800',
  },
];

export function FeaturesSection() {
  const { locale } = useLanguage();
  const [activeId, setActiveId] = useState(FEATURE_DEFS[0].id);
  const active = FEATURE_DEFS.find((f) => f.id === activeId) ?? FEATURE_DEFS[0];
  const ActiveIcon = active.icon;

  return (
    <section
      id="features"
      className="relative py-20 sm:py-28 overflow-hidden bg-gradient-to-b from-slate-50 via-indigo-50/20 to-slate-50"
    >
      <div
        className="absolute -top-16 -right-20 w-[28rem] h-[28rem] rounded-full bg-indigo-400/10 blur-3xl pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute bottom-0 -left-16 w-80 h-80 rounded-full bg-pink-400/10 blur-3xl pointer-events-none"
        aria-hidden
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center mb-10 sm:mb-12">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-indigo-600 mb-3">
            {t('featuresEyebrow', locale)}
          </p>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 tracking-tight">
            {t('featuresHeadline', locale)}
          </h2>
          <p className="mt-4 text-slate-600 font-medium text-base sm:text-lg leading-relaxed">
            {t('featuresSub', locale)}
          </p>
        </div>

        <div className="max-w-5xl mx-auto bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-3xl shadow-xl overflow-hidden">
          <div className="grid lg:grid-cols-[0.95fr_1.05fr] items-stretch">
            {/* Feature list */}
            <nav
              aria-label="Platform features"
              className="p-2 sm:p-3 space-y-1 max-h-[28rem] overflow-y-auto border-b lg:border-b-0 lg:border-r border-slate-200/80"
            >
              {FEATURE_DEFS.map((feature) => {
                const Icon = feature.icon;
                const isActive = feature.id === activeId;
                return (
                  <button
                    key={feature.id}
                    type="button"
                    onClick={() => setActiveId(feature.id)}
                    className={`w-full text-left flex items-start gap-3.5 px-3.5 py-3.5 rounded-2xl transition-all min-h-[44px] ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isActive
                          ? `bg-gradient-to-br ${feature.accent} text-white`
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`font-display font-bold text-sm sm:text-base ${
                          isActive ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {t(feature.titleKey, locale)}
                      </p>
                      <p
                        className={`text-sm font-medium mt-0.5 leading-snug line-clamp-2 ${
                          isActive ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {t(feature.summaryKey, locale)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* Active feature detail */}
            <AnimatePresence mode="wait">
              <motion.div
                key={active.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="relative p-7 sm:p-9 lg:sticky lg:top-24 min-h-[280px] flex flex-col justify-center overflow-hidden"
              >
                <div
                  className={`absolute -top-16 -right-16 w-56 h-56 rounded-full bg-gradient-to-br ${active.accent} opacity-15 blur-3xl pointer-events-none`}
                  aria-hidden
                />
                <div className="relative">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 text-white shadow-lg bg-gradient-to-br ${active.accent}`}
                  >
                    <ActiveIcon size={24} />
                  </div>
                  <h3 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 mb-3">
                    {t(active.titleKey, locale)}
                  </h3>
                  <p className="text-slate-600 font-medium leading-relaxed text-base sm:text-lg">
                    {t(active.summaryKey, locale)}
                  </p>
                  <div className="mt-6 inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-full">
                    Built for Nordic creators
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

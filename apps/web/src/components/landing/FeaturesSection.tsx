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
  Tag,
} from 'lucide-react';
import { useLanguage } from '@/lib/locale-context';
import { t, type TranslationKey } from '@/lib/i18n';

const FEATURE_DEFS: {
  id: string;
  icon: typeof Link2;
  titleKey: TranslationKey;
  summaryKey: TranslationKey;
}[] = [
  {
    id: 'bio',
    icon: Link2,
    titleKey: 'featureStoreTitle',
    summaryKey: 'featureStoreSummary',
  },
  {
    id: 'planner',
    icon: CalendarDays,
    titleKey: 'featurePlannerTitle',
    summaryKey: 'featurePlannerSummary',
  },
  {
    id: 'analytics',
    icon: BarChart3,
    titleKey: 'featureAnalyticsTitle',
    summaryKey: 'featureAnalyticsSummary',
  },
  {
    id: 'tagging',
    icon: Tag,
    titleKey: 'featureTaggingTitle',
    summaryKey: 'featureTaggingSummary',
  },
  {
    id: 'community',
    icon: MessageSquare,
    titleKey: 'featureCommunityTitle',
    summaryKey: 'featureCommunitySummary',
  },
  {
    id: 'events',
    icon: CalendarDays,
    titleKey: 'featureEventsTitle',
    summaryKey: 'featureEventsSummary',
  },
  {
    id: 'email',
    icon: Mail,
    titleKey: 'featureEmailTitle',
    summaryKey: 'featureEmailSummary',
  },
  {
    id: 'ai',
    icon: Bot,
    titleKey: 'featureAiTitle',
    summaryKey: 'featureAiSummary',
  },
  {
    id: 'finance',
    icon: Receipt,
    titleKey: 'featureFinanceTitle',
    summaryKey: 'featureFinanceSummary',
  },
];

export function FeaturesSection() {
  const { locale } = useLanguage();
  const [activeId, setActiveId] = useState(FEATURE_DEFS[0].id);
  const active = FEATURE_DEFS.find((f) => f.id === activeId) ?? FEATURE_DEFS[0];
  const ActiveIcon = active.icon;

  return (
    <section className="relative py-20 sm:py-28 overflow-hidden">
      <div
        className="nc-blob w-[28rem] h-[28rem] -left-20 top-20 opacity-70"
        style={{ background: 'var(--nc-sky)' }}
      />
      <div
        className="nc-blob w-80 h-80 right-0 bottom-10 opacity-60"
        style={{ background: 'var(--nc-blush)' }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mb-12">
          <p
            className="text-xs font-extrabold uppercase tracking-[0.16em] mb-3"
            style={{ color: 'var(--nc-coral)' }}
          >
            {t('featuresEyebrow', locale)}
          </p>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[#2c3340] tracking-tight">
            {t('featuresHeadline', locale)}
          </h2>
          <p className="mt-4 text-[#5b6472] font-medium text-base sm:text-lg leading-relaxed">
            {t('featuresSub', locale)}
          </p>
        </div>

        <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-6 lg:gap-8 items-start">
          <div className="nc-glass rounded-[1.75rem] p-2 space-y-1 max-h-[28rem] overflow-y-auto">
            {FEATURE_DEFS.map((feature) => {
              const Icon = feature.icon;
              const isActive = feature.id === activeId;
              return (
                <button
                  key={feature.id}
                  type="button"
                  onClick={() => setActiveId(feature.id)}
                  className={`w-full text-left flex items-start gap-3.5 px-3.5 py-3.5 rounded-[1.25rem] transition-all min-h-14 ${
                    isActive
                      ? 'bg-white/90 text-[#2c3340] shadow-sm'
                      : 'text-[#5b6472] hover:bg-white/40'
                  }`}
                >
                  <div
                    className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      background: isActive ? 'var(--nc-coral-soft)' : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    <Icon
                      size={16}
                      style={{ color: isActive ? 'var(--nc-coral)' : '#94a0b0' }}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-bold text-sm sm:text-base text-[#2c3340]">
                      {t(feature.titleKey, locale)}
                    </p>
                    <p className="text-sm font-medium mt-0.5 leading-snug text-[#5b6472] line-clamp-2">
                      {t(feature.summaryKey, locale)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="nc-glass rounded-[1.75rem] p-7 sm:p-9 relative overflow-hidden lg:sticky lg:top-24"
            >
              <div
                className="nc-blob w-48 h-48 -top-10 -right-10 opacity-80"
                style={{ background: 'var(--nc-coral-soft)' }}
              />
              <div className="relative">
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-12 h-12 rounded-[1.1rem] flex items-center justify-center"
                    style={{ background: 'var(--nc-coral-soft)' }}
                  >
                    <ActiveIcon size={22} style={{ color: 'var(--nc-coral)' }} />
                  </div>
                  <h3 className="font-display font-extrabold text-xl text-[#2c3340]">
                    {t(active.titleKey, locale)}
                  </h3>
                </div>
                <p className="text-[#5b6472] font-medium mb-2 leading-relaxed text-base">
                  {t(active.summaryKey, locale)}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

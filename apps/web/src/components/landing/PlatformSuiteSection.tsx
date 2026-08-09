'use client';

import {
  BarChart3,
  CalendarDays,
  Inbox,
  Link2,
  Mail,
  Tag,
  Users,
  Image as ImageIcon,
} from 'lucide-react';
import { useLanguage } from '@/lib/locale-context';
import { t, type TranslationKey } from '@/lib/i18n';

const SUITE: {
  icon: typeof CalendarDays;
  titleKey: TranslationKey;
  summaryKey: TranslationKey;
}[] = [
  {
    icon: CalendarDays,
    titleKey: 'suitePlannerTitle',
    summaryKey: 'suitePlannerSummary',
  },
  {
    icon: Link2,
    titleKey: 'suiteBioTitle',
    summaryKey: 'suiteBioSummary',
  },
  {
    icon: BarChart3,
    titleKey: 'suiteAnalyticsTitle',
    summaryKey: 'suiteAnalyticsSummary',
  },
  {
    icon: Tag,
    titleKey: 'suiteTaggingTitle',
    summaryKey: 'suiteTaggingSummary',
  },
  {
    icon: ImageIcon,
    titleKey: 'suiteMediaTitle',
    summaryKey: 'suiteMediaSummary',
  },
  {
    icon: Inbox,
    titleKey: 'suiteInboxTitle',
    summaryKey: 'suiteInboxSummary',
  },
  {
    icon: Users,
    titleKey: 'suiteCommunityTitle',
    summaryKey: 'suiteCommunitySummary',
  },
  {
    icon: Mail,
    titleKey: 'suiteEmailTitle',
    summaryKey: 'suiteEmailSummary',
  },
];

/** Showcases the logged-in Creator Admin toolkit on the public landing page. */
export function PlatformSuiteSection() {
  const { locale } = useLanguage();

  return (
    <section className="relative py-20 sm:py-28 overflow-hidden">
      <div
        className="nc-blob w-96 h-96 -left-24 top-10 opacity-50"
        style={{ background: 'var(--nc-mint)' }}
      />
      <div
        className="nc-blob w-72 h-72 right-0 bottom-0 opacity-40"
        style={{ background: 'var(--nc-coral-soft)' }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mb-12">
          <p
            className="text-xs font-extrabold uppercase tracking-[0.16em] mb-3"
            style={{ color: 'var(--nc-coral)' }}
          >
            {t('suiteEyebrow', locale)}
          </p>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[#2c3340] tracking-tight leading-tight">
            {t('suiteHeadline', locale)}
          </h2>
          <p className="mt-4 text-[#5b6472] font-medium text-base sm:text-lg leading-relaxed">
            {t('suiteSub', locale)}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {SUITE.map(({ icon: Icon, titleKey, summaryKey }) => (
            <div
              key={titleKey}
              className="nc-glass rounded-[1.5rem] p-5 sm:p-6 min-h-[11rem] flex flex-col"
            >
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'var(--nc-coral-soft)' }}
              >
                <Icon size={18} style={{ color: 'var(--nc-coral)' }} />
              </div>
              <h3 className="font-display font-extrabold text-base text-[#2c3340] mb-1.5">
                {t(titleKey, locale)}
              </h3>
              <p className="text-sm font-medium text-[#5b6472] leading-relaxed flex-1">
                {t(summaryKey, locale)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

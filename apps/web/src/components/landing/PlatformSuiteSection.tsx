'use client';

import {
  CalendarDays,
  Image as ImageIcon,
  LineChart,
  Link2,
  Mail,
  MessageSquare,
  Tag,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '@/lib/locale-context';
import { t, type TranslationKey } from '@/lib/i18n';

const SUITE: {
  icon: LucideIcon;
  titleKey: TranslationKey;
  summaryKey: TranslationKey;
  iconWrap: string;
}[] = [
  {
    icon: CalendarDays,
    titleKey: 'suitePlannerTitle',
    summaryKey: 'suitePlannerSummary',
    iconWrap: 'bg-slate-100 text-slate-700',
  },
  {
    icon: Link2,
    titleKey: 'suiteBioTitle',
    summaryKey: 'suiteBioSummary',
    iconWrap: 'bg-[#FCE7F3] text-[#F472B6]',
  },
  {
    icon: LineChart,
    titleKey: 'suiteAnalyticsTitle',
    summaryKey: 'suiteAnalyticsSummary',
    iconWrap: 'bg-[#E9D5FF]/50 text-[#2B2568]',
  },
  {
    icon: Tag,
    titleKey: 'suiteTaggingTitle',
    summaryKey: 'suiteTaggingSummary',
    iconWrap: 'bg-emerald-50 text-[#10B981]',
  },
  {
    icon: ImageIcon,
    titleKey: 'suiteMediaTitle',
    summaryKey: 'suiteMediaSummary',
    iconWrap: 'bg-slate-100 text-slate-700',
  },
  {
    icon: MessageSquare,
    titleKey: 'suiteInboxTitle',
    summaryKey: 'suiteInboxSummary',
    iconWrap: 'bg-[#FCE7F3] text-[#F472B6]',
  },
  {
    icon: Users,
    titleKey: 'suiteCommunityTitle',
    summaryKey: 'suiteCommunitySummary',
    iconWrap: 'bg-[#E9D5FF]/50 text-[#2B2568]',
  },
  {
    icon: Mail,
    titleKey: 'suiteEmailTitle',
    summaryKey: 'suiteEmailSummary',
    iconWrap: 'bg-emerald-50 text-[#10B981]',
  },
];

/** Showcases the logged-in Creator Admin toolkit on the public landing page. */
export function PlatformSuiteSection() {
  const { locale } = useLanguage();

  return (
    <section
      id="creator-admin"
      className="relative py-16 sm:py-24 overflow-hidden bg-[#FAFAFA]"
      aria-labelledby="platform-suite-heading"
    >
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center mb-10 sm:mb-12">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-[#F472B6] mb-3">
            {t('suiteEyebrow', locale)}
          </p>
          <h2
            id="platform-suite-heading"
            className="font-outfit font-extrabold text-3xl sm:text-4xl text-slate-900 tracking-tight leading-tight"
          >
            {t('suiteHeadline', locale)}
          </h2>
          <p className="mt-3 text-slate-600 font-medium text-base sm:text-lg leading-relaxed font-display">
            {t('suiteSub', locale)}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {SUITE.map(({ icon: Icon, titleKey, summaryKey, iconWrap }, index) => (
            <motion.article
              key={titleKey}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: index * 0.04 }}
              className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:border-slate-300/90 hover:shadow-md transition-all duration-300 min-h-[11.5rem] flex flex-col"
            >
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-4 ${iconWrap}`}
              >
                <Icon size={20} strokeWidth={2.25} aria-hidden />
              </div>
              <h3 className="font-outfit font-extrabold text-base text-slate-900 mb-1.5 tracking-tight">
                {t(titleKey, locale)}
              </h3>
              <p className="text-sm font-medium text-slate-600 leading-relaxed flex-1 font-display">
                {t(summaryKey, locale)}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

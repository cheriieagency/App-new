'use client';

import {
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  Home,
  Layers,
  Mail,
  MessageSquare,
  Send,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { motion } from 'motion/react';
import { InstagramIcon, TikTokIcon } from '@/components/icons/SocialBrandIcons';
import { useLanguage } from '@/lib/locale-context';
import { t, type TranslationKey } from '@/lib/i18n';
import { ltCardBody, ltCardTitle, ltCardTitleLg } from '@/components/landing/landingType';

const BENTO =
  'bg-white rounded-3xl p-8 border border-zinc-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-[#E6E3DB] hover:-translate-y-[3px] hover:shadow-[0_16px_36px_-4px_rgba(43,37,104,0.08)] transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)]';

function FeatureCard({
  icon: Icon,
  iconWrap,
  titleKey,
  summaryKey,
  footerKey,
  footerClass,
  footerRightKey,
  showChevron = true,
  footerDot,
}: {
  icon: LucideIcon;
  iconWrap: string;
  titleKey: TranslationKey;
  summaryKey: TranslationKey;
  footerKey: TranslationKey;
  footerClass: string;
  footerRightKey?: TranslationKey;
  showChevron?: boolean;
  footerDot?: boolean;
}) {
  const { locale } = useLanguage();

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4 }}
      className={`${BENTO} flex flex-col justify-between space-y-6`}
    >
      <div className="space-y-4">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${iconWrap}`}
        >
          <Icon size={24} strokeWidth={2} aria-hidden />
        </div>
        <div>
          <h3 className={ltCardTitle}>{t(titleKey, locale)}</h3>
          <p className={`${ltCardBody} !text-slate-500`}>{t(summaryKey, locale)}</p>
        </div>
      </div>
      <div
        className={`pt-4 border-t border-zinc-100 flex items-center justify-between gap-2 text-xs font-bold ${footerClass}`}
      >
        <span className="inline-flex items-center gap-1.5">
          {footerDot ? (
            <span className="w-2 h-2 rounded-full bg-[#2C3B2E]" aria-hidden />
          ) : null}
          {t(footerKey, locale)}
        </span>
        {footerRightKey ? (
          <span className="text-zinc-400 font-mono font-medium">
            {t(footerRightKey, locale)}
          </span>
        ) : showChevron ? (
          <ChevronRight size={16} strokeWidth={2} aria-hidden />
        ) : null}
      </div>
    </motion.article>
  );
}

/** High-converting bento grid for the public Creator Admin suite. */
export function PlatformSuiteSection() {
  const { locale } = useLanguage();

  return (
    <section
      id="creator-admin"
      className="relative py-16 sm:py-24 overflow-hidden bg-[#F9F8F6]"
      aria-label={t('suiteHeadline', locale)}
    >
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.article
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4 }}
            className={`md:col-span-2 ${BENTO} sm:p-10 flex flex-col justify-between relative overflow-hidden`}
          >
            <div className="relative z-10 max-w-xl space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#2C2621] text-white flex items-center justify-center shadow-md">
                  <Send size={24} strokeWidth={2} aria-hidden />
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F0EFEA] text-[#2C2621] text-xs font-bold border border-[#2C3B2E]/20">
                  <span className="w-2 h-2 rounded-full bg-[#2C3B2E] animate-pulse" />
                  {t('suitePublishBadge', locale)}
                </div>
              </div>
              <div>
                <h3 className={ltCardTitleLg}>{t('suitePublishTitle', locale)}</h3>
                <p className={`${ltCardBody} !mt-2 sm:text-base !text-slate-500`}>
                  {t('suitePublishSummary', locale)}
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3 relative z-10 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 min-h-[36px] rounded-xl font-bold bg-[#2C2621] text-white">
                  <TikTokIcon size={16} className="text-white" />
                  {t('suiteTikTokDirect', locale)}
                </span>
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 min-h-[36px] rounded-xl font-bold bg-[#F0EFEA] text-[#2C2621] border border-[#2C3B2E]/20">
                  <InstagramIcon size={16} className="text-[#2C3B2E]" />
                  {t('suiteInstagramReel', locale)}
                </span>
              </div>
              <span className="text-[#2C3B2E] font-bold font-mono">
                {t('suiteDirectApiStatus', locale)}
              </span>
            </div>

            <div
              className="absolute -right-12 -bottom-12 w-64 h-64 bg-gradient-to-br from-[#F0EFEA]/80 via-[#E6E3DB]/40 to-transparent rounded-full blur-3xl pointer-events-none"
              aria-hidden
            />
          </motion.article>

          <FeatureCard
            icon={Mail}
            iconWrap="bg-[#F0EFEA] text-[#2C3B2E] border-[#2C3B2E]/15"
            titleKey="suiteEmailTitle"
            summaryKey="suiteEmailSummary"
            footerKey="suiteEmailFooterVerified"
            footerClass="text-[#2C2621]"
            footerRightKey="suiteEmailInboxRate"
            showChevron={false}
            footerDot
          />

          <FeatureCard
            icon={MessageSquare}
            iconWrap="bg-[#E6E3DB]/60 text-[#2C2621] border-[#E6E3DB]"
            titleKey="suiteInboxTitle"
            summaryKey="suiteInboxSummary"
            footerKey="suiteInboxTrigger"
            footerClass="text-[#2C2621]"
          />

          <FeatureCard
            icon={Home}
            iconWrap="bg-[#F0EFEA] text-[#2C3B2E] border-[#2C3B2E]/15"
            titleKey="suiteBioTitle"
            summaryKey="suiteBioSummary"
            footerKey="suiteBioCheckout"
            footerClass="text-[#2C3B2E]"
          />

          <FeatureCard
            icon={Users}
            iconWrap="bg-[#E6E3DB]/60 text-[#2C2621] border-[#E6E3DB]"
            titleKey="suiteCommunityTitle"
            summaryKey="suiteCommunitySummary"
            footerKey="suiteCommunityXp"
            footerClass="text-[#2C2621]"
          />

          <motion.article
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4 }}
            className={`${BENTO} flex flex-col justify-between space-y-6`}
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center border bg-[#2C2621] text-white border-[#2C2621]">
                  <Layers size={24} strokeWidth={2} aria-hidden />
                </div>
                <span className="inline-flex items-center h-7 px-2.5 rounded-full bg-[#E6E3DB]/70 text-[#2C2621] text-[10px] font-extrabold uppercase tracking-wider border border-[#E6E3DB]">
                  {t('suiteAdsNew', locale)}
                </span>
              </div>
              <div>
                <h3 className={ltCardTitle}>{t('suiteAdsTitle', locale)}</h3>
                <p className={`${ltCardBody} !text-slate-500`}>{t('suiteAdsSummary', locale)}</p>
              </div>
            </div>
            <div className="pt-4 border-t border-zinc-100 flex items-center justify-between gap-2 text-xs font-bold text-[#2C2621]">
              <span>{t('suiteAdsFooter', locale)}</span>
              <ChevronRight size={16} strokeWidth={2} aria-hidden />
            </div>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4 }}
            className={`md:col-span-2 ${BENTO} flex flex-col justify-between space-y-6`}
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center border bg-[#F0EFEA] text-[#2C3B2E] border-[#2C3B2E]/15">
                <BarChart3 size={24} strokeWidth={2} aria-hidden />
              </div>
              <div>
                <h3 className={ltCardTitleLg}>{t('suiteReportsTitle', locale)}</h3>
                <p className={`${ltCardBody} !mt-2 sm:text-base !text-slate-500 max-w-xl`}>
                  {t('suiteReportsSummary', locale)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center px-3 py-1.5 min-h-[36px] rounded-xl bg-zinc-100 text-zinc-800 text-xs font-bold">
                  {t('suiteReportsReach', locale)}
                </span>
                <span className="inline-flex items-center px-3 py-1.5 min-h-[36px] rounded-xl bg-zinc-100 text-zinc-800 text-xs font-bold">
                  {t('suiteReportsViews', locale)}
                </span>
                <span className="inline-flex items-center px-3 py-1.5 min-h-[36px] rounded-xl bg-[#E6E3DB]/70 text-[#2C2621] text-xs font-bold border border-[#E6E3DB]">
                  {t('suiteReportsFollowers', locale)}
                </span>
              </div>
            </div>
            <div className="pt-4 border-t border-zinc-100 flex items-center justify-between gap-2 text-xs font-bold text-[#2C3B2E]">
              <span>{t('suiteReportsFooter', locale)}</span>
              <ArrowUpRight size={16} strokeWidth={2} aria-hidden />
            </div>
          </motion.article>
        </div>
      </div>
    </section>
  );
}

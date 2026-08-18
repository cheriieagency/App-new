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

const BENTO =
  'bg-white rounded-3xl p-8 border border-zinc-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-zinc-300 hover:-translate-y-[3px] hover:shadow-[0_16px_36px_-4px_rgba(15,23,42,0.06)] transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)]';

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
          <h3 className="text-xl font-bold text-zinc-950 tracking-tight font-grotesk">
            {t(titleKey, locale)}
          </h3>
          <p className="text-zinc-500 text-sm mt-2 leading-relaxed font-display">
            {t(summaryKey, locale)}
          </p>
        </div>
      </div>
      <div
        className={`pt-4 border-t border-zinc-100 flex items-center justify-between gap-2 text-xs font-bold ${footerClass}`}
      >
        <span className="inline-flex items-center gap-1.5">
          {footerDot ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden />
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
      className="relative py-16 sm:py-24 overflow-hidden bg-[#FAFAFA]"
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
                <div className="w-12 h-12 rounded-2xl bg-zinc-950 text-white flex items-center justify-center shadow-md">
                  <Send size={24} strokeWidth={2} aria-hidden />
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/80">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {t('suitePublishBadge', locale)}
                </div>
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight font-grotesk">
                  {t('suitePublishTitle', locale)}
                </h3>
                <p className="text-zinc-500 text-sm sm:text-base mt-2 leading-relaxed font-display">
                  {t('suitePublishSummary', locale)}
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3 relative z-10 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 min-h-[36px] rounded-xl font-bold bg-zinc-950 text-white">
                  <TikTokIcon size={16} className="text-white" />
                  {t('suiteTikTokDirect', locale)}
                </span>
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 min-h-[36px] rounded-xl font-bold bg-zinc-100 text-zinc-800 border border-zinc-200/70">
                  <InstagramIcon size={16} className="text-[#F472B6]" />
                  {t('suiteInstagramReel', locale)}
                </span>
              </div>
              <span className="text-emerald-700 font-bold font-mono">
                {t('suiteDirectApiStatus', locale)}
              </span>
            </div>

            <div
              className="absolute -right-12 -bottom-12 w-64 h-64 bg-gradient-to-br from-pink-200/40 via-purple-100/20 to-transparent rounded-full blur-3xl pointer-events-none"
              aria-hidden
            />
          </motion.article>

          <FeatureCard
            icon={Mail}
            iconWrap="bg-emerald-50 text-emerald-600 border-emerald-100"
            titleKey="suiteEmailTitle"
            summaryKey="suiteEmailSummary"
            footerKey="suiteEmailFooterVerified"
            footerClass="text-emerald-700"
            footerRightKey="suiteEmailInboxRate"
            showChevron={false}
            footerDot
          />

          <FeatureCard
            icon={MessageSquare}
            iconWrap="bg-blue-50 text-blue-600 border-blue-100"
            titleKey="suiteInboxTitle"
            summaryKey="suiteInboxSummary"
            footerKey="suiteInboxTrigger"
            footerClass="text-blue-700"
          />

          <FeatureCard
            icon={Home}
            iconWrap="bg-pink-50 text-[#F472B6] border-pink-100"
            titleKey="suiteBioTitle"
            summaryKey="suiteBioSummary"
            footerKey="suiteBioCheckout"
            footerClass="text-pink-700"
          />

          <FeatureCard
            icon={Users}
            iconWrap="bg-purple-50 text-purple-600 border-purple-100"
            titleKey="suiteCommunityTitle"
            summaryKey="suiteCommunitySummary"
            footerKey="suiteCommunityXp"
            footerClass="text-purple-700"
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
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center border bg-sky-50 text-sky-600 border-sky-100">
                  <Layers size={24} strokeWidth={2} aria-hidden />
                </div>
                <span className="inline-flex items-center h-7 px-2.5 rounded-full bg-sky-50 text-sky-700 text-[10px] font-extrabold uppercase tracking-wider border border-sky-100">
                  {t('suiteAdsNew', locale)}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-zinc-950 tracking-tight font-grotesk">
                  {t('suiteAdsTitle', locale)}
                </h3>
                <p className="text-zinc-500 text-sm mt-2 leading-relaxed font-display">
                  {t('suiteAdsSummary', locale)}
                </p>
              </div>
            </div>
            <div className="pt-4 border-t border-zinc-100 flex items-center justify-between gap-2 text-xs font-bold text-sky-700">
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
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center border bg-amber-50 text-amber-600 border-amber-100">
                <BarChart3 size={24} strokeWidth={2} aria-hidden />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-zinc-950 tracking-tight font-grotesk">
                  {t('suiteReportsTitle', locale)}
                </h3>
                <p className="text-zinc-500 text-sm sm:text-base mt-2 leading-relaxed font-display max-w-xl">
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
                <span className="inline-flex items-center px-3 py-1.5 min-h-[36px] rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                  {t('suiteReportsFollowers', locale)}
                </span>
              </div>
            </div>
            <div className="pt-4 border-t border-zinc-100 flex items-center justify-between gap-2 text-xs font-bold text-amber-700">
              <span>{t('suiteReportsFooter', locale)}</span>
              <ArrowUpRight size={16} strokeWidth={2} aria-hidden />
            </div>
          </motion.article>
        </div>
      </div>
    </section>
  );
}

'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Check, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { getComparisonPrices } from '@/lib/i18n/display-currency';
import {
  ltCardBody,
  ltCardTitleLg,
  ltEyebrow,
  ltGradientPanel,
  ltHeaderWrap,
  ltSection,
  ltSectionSub,
} from '@/components/landing/landingType';

/** Why Choose Us — bento comparison: fragmented stack vs clikd: Creator Studio. */
export function ComparisonSection() {
  const { t, locale } = useLanguage();
  const prices = getComparisonPrices(locale);

  return (
    <section
      id="why-choose-us"
      className="relative py-16 sm:py-24 overflow-hidden bg-[#FAFAFA]"
      aria-labelledby="why-choose-heading"
    >
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className={ltHeaderWrap}>
          <p className={`${ltEyebrow} mb-3`}>{t('comparison.eyebrow')}</p>
          <h2 id="why-choose-heading" className={ltSection}>
            {t('comparison.headline')}
          </h2>
          <p className={ltSectionSub}>{t('comparison.sub')}</p>
        </div>

        <BentoComparison />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="mt-5 sm:mt-6 rounded-2xl border border-[#E9D5FF] bg-gradient-to-r from-[#FCE7F3] via-white to-[#E9D5FF]/60 p-5 text-center"
        >
          <p className="text-sm sm:text-base font-bold text-slate-800 font-display leading-snug">
            <span aria-hidden>💡 </span>
            {(() => {
              const amount = prices.yearlySavings;
              const text = t('comparison.saveBanner', { amount });
              const idx = text.indexOf(amount);
              if (idx < 0) return text;
              return (
                <>
                  {text.slice(0, idx)}
                  <span className="font-extrabold text-[#2B2568]">{amount}</span>
                  {text.slice(idx + amount.length)}
                </>
              );
            })()}
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function BentoComparison() {
  const { t, locale } = useLanguage();
  const prices = getComparisonPrices(locale);

  const fragmentedTools = [
    { title: t('comparison.toolBio'), sub: t('comparison.toolBioSub'), cost: prices.bio },
    {
      title: t('comparison.toolCommunity'),
      sub: t('comparison.toolCommunitySub'),
      cost: prices.community,
    },
    {
      title: t('comparison.toolPlanner'),
      sub: t('comparison.toolPlannerSub'),
      cost: prices.planner,
    },
    {
      title: t('comparison.toolEmail'),
      sub: t('comparison.toolEmailSub'),
      cost: prices.email,
    },
    {
      title: t('comparison.toolAds'),
      sub: t('comparison.toolAdsSub'),
      cost: prices.ads,
    },
  ];

  const winnerPillars = [
    { title: t('comparison.pillarCheckout'), body: t('comparison.pillarCheckoutBody') },
    { title: t('comparison.pillarPlanner'), body: t('comparison.pillarPlannerBody') },
    { title: t('comparison.pillarBio'), body: t('comparison.pillarBioBody') },
    { title: t('comparison.pillarCommunity'), body: t('comparison.pillarCommunityBody') },
    { title: t('comparison.pillarEmail'), body: t('comparison.pillarEmailBody') },
    { title: t('comparison.pillarAds'), body: t('comparison.pillarAdsBody') },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45 }}
      className="grid lg:grid-cols-12 gap-4 sm:gap-5 items-stretch"
    >
      <div className="lg:col-span-5 rounded-3xl border border-zinc-200/90 bg-white p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col">
        <div className="flex items-center justify-between gap-2 mb-4">
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200/70 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-rose-500">
            <X size={12} strokeWidth={3} aria-hidden />
            {t('comparison.fragmentedTitle')}
          </span>
          <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
            {t('comparison.appsCount')}
          </span>
        </div>

        <h3 className={ltCardTitleLg}>{t('comparison.stackHeadline')}</h3>
        <p className={`${ltCardBody} !text-zinc-500`}>{t('comparison.stackSub')}</p>

        <ul className="mt-5 space-y-2 flex-1">
          {fragmentedTools.map((tool) => (
            <li
              key={tool.title}
              className="flex items-center gap-2.5 rounded-xl bg-white border border-zinc-200/80 px-3 py-2.5 min-h-[52px]"
            >
              <span
                className="h-6 w-6 rounded-md bg-rose-50 text-rose-500 flex items-center justify-center flex-shrink-0"
                aria-hidden
              >
                <X size={12} strokeWidth={2.75} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] sm:text-[13px] font-extrabold text-zinc-800 leading-tight">
                  {tool.title}
                </p>
                <p className="text-[10px] sm:text-[11px] text-zinc-400 font-medium mt-0.5 truncate">
                  {tool.sub}
                </p>
              </div>
              <span className="text-[12px] font-mono font-extrabold text-rose-500 flex-shrink-0 tabular-nums">
                {tool.cost}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 pt-4 border-t border-zinc-100">
          <p className="text-base sm:text-lg font-extrabold uppercase tracking-tight text-rose-500 font-outfit">
            {t('comparison.totalCostLabel')} {prices.total}
          </p>
        </div>
      </div>

      <div
        className={`lg:col-span-7 rounded-3xl ${ltGradientPanel} p-5 sm:p-6 lg:p-7 flex flex-col`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#F472B6]/15 border border-[#F472B6]/30 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#F472B6]">
            <Check size={12} strokeWidth={3} aria-hidden />
            {t('comparison.winnerTitle')}
          </span>
          <span className="inline-flex items-center rounded-full bg-white/80 border border-[#E9D5FF] px-2.5 py-1 text-[10px] font-bold text-[#2B2568]">
            clikd<span className="text-[#F472B6]">:</span> Creator Studio
          </span>
        </div>

        <h3 className={ltCardTitleLg}>{t('comparison.winnerHeadline')}</h3>
        <p className={`${ltCardBody} !text-slate-600 sm:text-[15px] max-w-xl`}>
          {t('comparison.winnerSub')}
        </p>

        <div className="mt-5 grid sm:grid-cols-2 gap-2.5 flex-1">
          {winnerPillars.map((pillar) => (
            <div
              key={pillar.title}
              className="rounded-2xl bg-white/80 border border-[#E9D5FF]/80 p-3.5 sm:p-4 shadow-sm"
            >
              <div className="flex items-start gap-2">
                <span
                  className="mt-0.5 h-5 w-5 rounded-full bg-[#FCE7F3] text-[#F472B6] flex items-center justify-center flex-shrink-0 border border-[#F472B6]/20"
                  aria-hidden
                >
                  <Check size={11} strokeWidth={3} />
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] sm:text-[13px] font-extrabold text-[#F472B6] leading-snug">
                    {pillar.title}
                  </p>
                  <p className="mt-1 text-[11px] sm:text-xs text-slate-500 font-medium leading-relaxed font-display">
                    {pillar.body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-5 border-t border-[#E9D5FF] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400">
              {t('comparison.startingFrom')}
            </p>
            <p className="mt-1 text-2xl sm:text-3xl font-outfit font-extrabold text-slate-900 tabular-nums tracking-tight">
              {prices.clikd}{' '}
              <span className="text-lg text-slate-500">/ mo</span>{' '}
              {locale !== 'en' ? (
                <span className="text-base font-bold text-slate-400">
                  {t('comparison.usdApprox')}
                </span>
              ) : null}
            </p>
          </div>
          <Link
            href="/onboarding"
            className="inline-flex items-center justify-center min-h-[44px] px-6 py-3.5 rounded-2xl bg-[#F472B6] hover:bg-[#e0529c] text-white font-extrabold text-sm transition-colors shadow-lg shadow-[#F472B6]/25"
          >
            {t('comparison.cta')} →
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

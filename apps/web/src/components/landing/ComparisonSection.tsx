'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Check, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { getComparisonPrices } from '@/lib/i18n/display-currency';

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
        <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-10">
          <span className="inline-flex items-center rounded-full bg-purple-50 border border-purple-200/80 px-3.5 py-1.5">
            <span className="font-mono text-xs font-bold text-purple-900 tracking-wide">
              {t('comparison.eyebrow')}
            </span>
          </span>
          <h2
            id="why-choose-heading"
            className="mt-5 font-outfit font-bold text-4xl sm:text-5xl lg:text-[3.25rem] text-slate-900 tracking-tight leading-tight"
          >
            {t('comparison.headline')}
          </h2>
          <p className="mt-4 text-slate-600 font-medium text-base sm:text-lg leading-relaxed font-display max-w-2xl mx-auto">
            {t('comparison.sub')}
          </p>
        </div>

        <BentoComparison />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="mt-5 sm:mt-6 rounded-2xl border border-purple-100 bg-gradient-to-r from-purple-50 via-pink-50 to-indigo-50 p-5 text-center"
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

        <h3 className="font-grotesk font-extrabold text-xl sm:text-2xl text-zinc-950 tracking-tight">
          {t('comparison.stackHeadline')}
        </h3>
        <p className="mt-2 text-sm text-zinc-500 font-medium leading-relaxed font-display">
          {t('comparison.stackSub')}
        </p>

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
          <p className="text-base sm:text-lg font-extrabold uppercase tracking-tight text-rose-500 font-grotesk">
            {t('comparison.totalCostLabel')} {prices.total}
          </p>
        </div>
      </div>

      <div
        className="lg:col-span-7 rounded-3xl border border-zinc-800 p-5 sm:p-6 lg:p-7 flex flex-col text-white"
        style={{
          background: 'linear-gradient(155deg, #0a0a0b 0%, #18181b 42%, #1e1b4b 100%)',
          boxShadow: '0 20px 50px -12px rgba(15, 23, 42, 0.45)',
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#10B981]/15 border border-[#10B981]/30 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#10B981]">
            <Check size={12} strokeWidth={3} aria-hidden />
            {t('comparison.winnerTitle')}
          </span>
          <span className="inline-flex items-center rounded-full bg-white/10 border border-white/15 px-2.5 py-1 text-[10px] font-bold text-white/90">
            clikd<span className="text-[#F472B6]">:</span> Creator Studio
          </span>
        </div>

        <h3 className="font-grotesk font-extrabold text-2xl sm:text-3xl tracking-tight leading-tight">
          {t('comparison.winnerHeadline')}
        </h3>
        <p className="mt-2.5 text-sm sm:text-[15px] text-zinc-400 font-medium leading-relaxed font-display max-w-xl">
          {t('comparison.winnerSub')}
        </p>

        <div className="mt-5 grid sm:grid-cols-2 gap-2.5 flex-1">
          {winnerPillars.map((pillar) => (
            <div
              key={pillar.title}
              className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-3.5 sm:p-4"
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
                  <p className="mt-1 text-[11px] sm:text-xs text-zinc-400 font-medium leading-relaxed font-display">
                    {pillar.body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-5 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-white/45">
              {t('comparison.startingFrom')}
            </p>
            <p className="mt-1 text-2xl sm:text-3xl font-grotesk font-extrabold text-white tabular-nums tracking-tight">
              {prices.clikd}{' '}
              <span className="text-lg text-white/60">/ mo</span>{' '}
              {locale !== 'en' ? (
                <span className="text-base font-bold text-white/50">
                  {t('comparison.usdApprox')}
                </span>
              ) : null}
            </p>
          </div>
          <Link
            href="/onboarding"
            className="inline-flex items-center justify-center min-h-[44px] px-6 py-3.5 rounded-2xl bg-[#F472B6] hover:bg-[#e0529c] text-white font-extrabold text-sm transition-colors shadow-lg shadow-pink-500/20"
          >
            {t('comparison.cta')} →
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

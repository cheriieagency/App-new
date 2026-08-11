'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Check, Clock, Headphones, Lock, Percent, Wallet, Zap } from 'lucide-react';
import { useLanguage } from '@/lib/locale-context';
import { t, type TranslationKey } from '@/lib/i18n';

type BillingCycle = 'monthly' | 'yearly';

const VALUE_PILLS: { icon: typeof Clock; labelKey: TranslationKey }[] = [
  { icon: Clock, labelKey: 'pricingSaveHours' },
  { icon: Wallet, labelKey: 'pricingSaveMoney' },
  { icon: Percent, labelKey: 'pricingZeroFee' },
];

const TRUST_ROW: { icon: typeof Zap; labelKey: TranslationKey }[] = [
  { icon: Zap, labelKey: 'pricingTrustCancel' },
  { icon: Lock, labelKey: 'pricingTrustSecurity' },
  { icon: Headphones, labelKey: 'pricingTrustMigration' },
];

export function PricingSection() {
  const { locale } = useLanguage();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const yearly = billingCycle === 'yearly';

  // Yearly = ~17% off (pay ~10 months)
  const creatorPrice = yearly ? 165 : 199;
  const proPrice = yearly ? 582 : 699;

  return (
    <section
      id="pricing"
      className="relative py-16 sm:py-24 overflow-hidden bg-[#FAFAFA]"
      aria-labelledby="pricing-heading"
    >
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-8">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-[#F472B6] mb-3">
            {t('pricingEyebrow', locale)}
          </p>
          <h2
            id="pricing-heading"
            className="font-outfit font-extrabold text-3xl sm:text-4xl text-slate-900 tracking-tight leading-tight"
          >
            {t('pricingHeadline', locale)}{' '}
            <span className="text-[#F472B6]">{t('pricingHeadlineAccent', locale)}</span>
          </h2>
          <p className="mt-3 text-slate-600 font-medium text-base sm:text-lg leading-relaxed font-display">
            {t('pricingSub', locale)}
          </p>
        </div>

        {/* Value pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-10">
          {VALUE_PILLS.map(({ icon: Icon, labelKey }) => (
            <div
              key={labelKey}
              className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200/80 px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
            >
              <Icon size={14} className="text-[#F472B6] shrink-0" aria-hidden />
              <span className="font-display">{t(labelKey, locale)}</span>
            </div>
          ))}
        </div>

        {/* Billing switcher */}
        <div className="flex flex-col items-center gap-3 mb-10">
          <div className="inline-flex items-center p-1 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`h-11 min-h-[44px] px-5 rounded-xl text-sm font-extrabold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-[#1a1848] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('pricingMonthly', locale)}
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              className={`h-11 min-h-[44px] px-5 rounded-xl text-sm font-extrabold transition-all inline-flex items-center gap-2 ${
                billingCycle === 'yearly'
                  ? 'bg-[#1a1848] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('pricingYearly', locale)}
              <span className="inline-flex items-center rounded-full bg-[#10B981] text-white text-[10px] font-black uppercase tracking-wide px-2 py-0.5">
                {t('pricingSave17', locale)}
              </span>
            </button>
          </div>
        </div>

        {/* Pricing tiers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 mb-12">
          {/* Starter */}
          <motion.article
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4 }}
            className="relative bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 flex flex-col shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
          >
            <h3 className="font-outfit font-extrabold text-xl text-slate-900 tracking-tight">
              {t('planStarter', locale)}
            </h3>
            <p className="text-sm text-slate-600 font-medium mt-1.5 leading-relaxed mb-5 font-display">
              {t('planStarterSub', locale)}
            </p>
            <div className="mb-6">
              <div className="flex items-end gap-1.5">
                <span className="font-outfit font-extrabold text-4xl text-slate-900 tabular-nums tracking-tight">
                  0
                </span>
                <span className="text-sm font-bold text-slate-500 mb-1.5 font-mono">
                  {t('sekPerMo', locale)}
                </span>
              </div>
              <p className="text-[11px] font-bold text-[#10B981] mt-1">
                {t('planFreeForever', locale)}
              </p>
            </div>
            <ul className="space-y-2.5 mb-8 flex-1">
              <li className="flex items-start gap-2 text-sm font-extrabold text-slate-900 font-display">
                <Percent size={16} className="mt-0.5 flex-shrink-0 text-slate-500" />
                {t('planF0', locale)}
              </li>
              {(['planF1', 'planF2', 'planF3', 'planF4', 'planF5', 'planF6'] as const).map((key) => (
                <li
                  key={key}
                  className="flex items-start gap-2 text-sm font-medium text-slate-800 font-display"
                >
                  <Check size={16} className="mt-0.5 flex-shrink-0 text-slate-500" />
                  {t(key, locale)}
                </li>
              ))}
            </ul>
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3.5 rounded-xl border border-slate-200 transition-colors"
            >
              {t('planStarterCta', locale)}
            </Link>
          </motion.article>

          {/* Creator — featured */}
          <motion.article
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, delay: 0.06 }}
            className="relative bg-white border-2 border-[#F472B6] rounded-2xl p-6 sm:p-7 flex flex-col shadow-lg shadow-[#F472B6]/10"
          >
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-wide text-white px-3.5 py-1.5 rounded-full whitespace-nowrap bg-[#F472B6] shadow-md shadow-[#F472B6]/30">
              {t('mostPopular', locale)}
            </span>
            <h3 className="font-outfit font-extrabold text-xl text-slate-900 tracking-tight mt-1">
              {t('planCreator', locale)}
            </h3>
            <p className="text-sm text-slate-600 font-medium mt-1.5 leading-relaxed mb-5 font-display">
              {t('planCreatorSub', locale)}
            </p>
            <div className="mb-6">
              <div className="flex items-end gap-1.5">
                <span className="font-outfit font-extrabold text-4xl text-slate-900 tabular-nums tracking-tight">
                  {creatorPrice}
                </span>
                <span className="text-sm font-bold text-slate-500 mb-1.5 font-mono">
                  {t('sekPerMo', locale)}
                </span>
              </div>
              <p
                className={`text-[11px] font-bold mt-1 ${
                  yearly ? 'text-[#10B981]' : 'text-[#F472B6]'
                }`}
              >
                {yearly
                  ? t('planCreatorSubYearly', locale)
                  : t('planBilledMonthly', locale)}
              </p>
            </div>
            <ul className="space-y-2.5 mb-8 flex-1">
              {(
                [
                  { key: 'planC1' as const, bold: true, check: 'emerald' as const },
                  { key: 'planC2' as const, bold: false, check: 'pink' as const },
                  { key: 'planC3' as const, bold: false, check: 'pink' as const },
                  { key: 'planC4' as const, bold: false, check: 'pink' as const },
                  { key: 'planC5' as const, bold: false, check: 'pink' as const },
                  { key: 'planC6' as const, bold: false, check: 'pink' as const },
                  { key: 'planC7' as const, bold: false, check: 'pink' as const },
                ] as const
              ).map((f) => (
                <li
                  key={f.key}
                  className={`flex items-start gap-2 text-sm font-display ${
                    f.bold ? 'font-extrabold text-slate-900' : 'font-medium text-slate-800'
                  }`}
                >
                  <Check
                    size={16}
                    className={`mt-0.5 flex-shrink-0 ${
                      f.check === 'emerald' ? 'text-[#10B981]' : 'text-[#F472B6]'
                    }`}
                  />
                  {t(f.key, locale)}
                </li>
              ))}
            </ul>
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center gap-2 min-h-[44px] bg-[#F472B6] hover:bg-[#F472B6]/90 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-[#F472B6]/25 transition-all active:scale-[0.98]"
            >
              {t('planCreatorCta', locale)}
            </Link>
          </motion.article>

          {/* Pro */}
          <motion.article
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, delay: 0.12 }}
            className="relative bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 flex flex-col shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
          >
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-wide text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full whitespace-nowrap">
              {t('planProBadge', locale)}
            </span>
            <h3 className="font-outfit font-extrabold text-xl text-slate-900 tracking-tight mt-1">
              {t('planPro', locale)}
            </h3>
            <p className="text-sm text-slate-600 font-medium mt-1.5 leading-relaxed mb-5 font-display">
              {t('planProSub', locale)}
            </p>
            <div className="mb-6">
              <div className="flex items-end gap-1.5">
                <span className="font-outfit font-extrabold text-4xl text-slate-900 tabular-nums tracking-tight">
                  {proPrice}
                </span>
                <span className="text-sm font-bold text-slate-500 mb-1.5 font-mono">
                  {t('sekPerMo', locale)}
                </span>
              </div>
              <p
                className={`text-[11px] font-bold mt-1 ${
                  yearly ? 'text-[#10B981]' : 'text-[#F472B6]'
                }`}
              >
                {yearly ? t('planProSubYearly', locale) : t('planBilledMonthly', locale)}
              </p>
            </div>
            <ul className="space-y-2.5 mb-8 flex-1">
              {(
                [
                  { key: 'planP1' as const, highlight: true },
                  { key: 'planP2' as const, highlight: false },
                  { key: 'planP3' as const, highlight: false },
                  { key: 'planP4' as const, highlight: false },
                  { key: 'planP5' as const, highlight: false },
                  { key: 'planP6' as const, highlight: false },
                ] as const
              ).map((f) => (
                <li
                  key={f.key}
                  className={`flex items-start gap-2 text-sm font-display ${
                    f.highlight
                      ? 'font-extrabold text-[#10B981]'
                      : 'font-medium text-slate-800'
                  }`}
                >
                  <Check
                    size={16}
                    className={`mt-0.5 flex-shrink-0 ${
                      f.highlight ? 'text-[#10B981]' : 'text-sky-500'
                    }`}
                  />
                  {t(f.key, locale)}
                </li>
              ))}
            </ul>
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center min-h-[44px] bg-[#0F172A] hover:bg-[#1a1848] text-white font-bold py-3.5 rounded-xl transition-colors"
            >
              {t('planProCta', locale)}
            </Link>
          </motion.article>
        </div>

        {/* Trust footer */}
        <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 sm:gap-8 text-sm font-bold text-slate-600">
          {TRUST_ROW.map(({ icon: Icon, labelKey }) => (
            <p key={labelKey} className="inline-flex items-center gap-2 font-display">
              <Icon size={15} className="text-[#F472B6] shrink-0" aria-hidden />
              {t(labelKey, locale)}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

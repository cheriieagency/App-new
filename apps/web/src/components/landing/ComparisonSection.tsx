'use client';

import { motion } from 'motion/react';
import { Check, X } from 'lucide-react';
import { useLanguage } from '@/lib/locale-context';
import { t, type TranslationKey } from '@/lib/i18n';

const ROWS: {
  featureKey: TranslationKey;
  oldKey: TranslationKey;
  newKey: TranslationKey;
  oldAccent?: boolean;
  neuAccent?: boolean;
}[] = [
  {
    featureKey: 'metricMonthlyCost',
    oldKey: 'compareOldCost',
    newKey: 'compareNewCost',
    oldAccent: true,
    neuAccent: true,
  },
  {
    featureKey: 'metricPaymentOptions',
    oldKey: 'compareOldPay',
    newKey: 'compareNewPay',
  },
  {
    featureKey: 'metricNordicVat',
    oldKey: 'compareOldVat',
    newKey: 'compareNewVat',
  },
  {
    featureKey: 'metricCreatorTools',
    oldKey: 'compareOldTools',
    newKey: 'compareNewTools',
  },
];

/** Why Choose Us — fragmented stack vs clikd: comparison matrix. */
export function ComparisonSection() {
  const { locale } = useLanguage();

  return (
    <section
      id="why-choose-us"
      className="relative py-16 sm:py-24 overflow-hidden bg-[#FAFAFA]"
      aria-labelledby="why-choose-heading"
    >
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center mb-10 sm:mb-12">
          <p className="inline-flex items-center rounded-full bg-[#E9D5FF]/70 border border-[#E9D5FF] px-4 py-1.5 text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-[#2B2568] mb-4">
            {t('whyChooseUs', locale)}
          </p>
          <h2
            id="why-choose-heading"
            className="font-outfit font-extrabold text-3xl sm:text-4xl text-[#0F172A] tracking-tight leading-tight"
          >
            {t('whyChooseUsHeadline', locale)}
          </h2>
          <p className="mt-3 text-slate-500 font-medium text-base sm:text-lg leading-relaxed font-display">
            {t('whyChooseUsSub', locale)}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.45 }}
          className="max-w-4xl mx-auto bg-white border border-slate-200/80 rounded-[1.75rem] shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] overflow-hidden"
        >
          {/* Column headers */}
          <div className="grid grid-cols-[0.95fr_1.15fr_1.2fr] border-b border-slate-100">
            <div className="px-3 sm:px-5 py-5 sm:py-6 flex items-end">
              <p className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400">
                {t('featureLabel', locale)}
              </p>
            </div>
            <div className="px-3 sm:px-5 py-5 sm:py-6 border-l border-slate-100">
              <p className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400 mb-1">
                {t('fragmentedStack', locale)}
              </p>
              <p className="text-[11px] sm:text-sm font-medium text-slate-500 leading-snug font-display">
                {t('fragmentedStackSub', locale)}
              </p>
            </div>
            <div className="relative px-3 sm:px-5 pt-8 sm:pt-9 pb-5 sm:pb-6 bg-[#0F172A] text-white">
              <span className="absolute top-2.5 left-1/2 -translate-x-1/2 sm:left-auto sm:right-3 sm:translate-x-0 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/25 px-2.5 py-0.5 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide whitespace-nowrap">
                ✓ {t('allInOneWinner', locale)}
              </span>
              <p className="font-clikd-wordmark font-extrabold text-lg sm:text-xl tracking-tight leading-none mb-1.5">
                CLIKD<span className="text-[#F472B6]">:</span>
              </p>
              <p className="text-[11px] sm:text-sm font-medium text-slate-300 leading-snug font-display">
                {t('whyNewWayStack', locale)}
              </p>
            </div>
          </div>

          {/* Matrix rows */}
          <div>
            {ROWS.map((row, i) => (
              <div
                key={row.featureKey}
                className={`grid grid-cols-[0.95fr_1.15fr_1.2fr] ${
                  i < ROWS.length - 1 ? 'border-b border-slate-100' : ''
                }`}
              >
                <div className="px-3 sm:px-5 py-4 sm:py-5 flex items-center">
                  <p className="text-[12px] sm:text-sm font-extrabold text-slate-800 font-display">
                    {t(row.featureKey, locale)}
                  </p>
                </div>
                <div className="px-3 sm:px-5 py-4 sm:py-5 border-l border-slate-100 flex items-center gap-2.5">
                  <span
                    className="hidden sm:inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-50 text-rose-400 shrink-0"
                    aria-hidden
                  >
                    <X size={12} strokeWidth={2.5} />
                  </span>
                  <p
                    className={`text-[11px] sm:text-sm font-semibold leading-snug font-display ${
                      row.oldAccent ? 'text-rose-500' : 'text-slate-500'
                    }`}
                  >
                    {t(row.oldKey, locale)}
                  </p>
                </div>
                <div
                  className={`px-3 sm:px-5 py-4 sm:py-5 bg-[#0F172A] flex items-center gap-2.5 ${
                    i < ROWS.length - 1 ? 'border-b border-white/5' : ''
                  }`}
                >
                  <span
                    className="hidden sm:inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 shrink-0"
                    aria-hidden
                  >
                    <Check size={12} strokeWidth={2.75} />
                  </span>
                  <p
                    className={`text-[11px] sm:text-sm font-bold leading-snug font-display ${
                      row.neuAccent ? 'text-emerald-400' : 'text-white'
                    }`}
                  >
                    {t(row.newKey, locale)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Savings footer */}
          <div className="border-t border-slate-100 bg-gradient-to-r from-[#FCE7F3]/80 via-[#E9D5FF]/50 to-[#FCE7F3]/80 px-4 sm:px-6 py-4 sm:py-5 text-center">
            <p className="text-sm sm:text-base font-extrabold text-[#2B2568] font-display leading-snug">
              <span aria-hidden>💡 </span>
              {t('compareFooter', locale)}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

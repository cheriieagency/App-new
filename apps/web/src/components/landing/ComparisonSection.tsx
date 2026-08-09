'use client';

import { motion } from 'motion/react';
import { Check, X } from 'lucide-react';
import { useLanguage } from '@/lib/locale-context';
import { t } from '@/lib/i18n';

export function ComparisonSection() {
  const { locale } = useLanguage();

  const rows = [
    {
      metric: t('metricMonthlyCost', locale),
      old: '~$99–180 / mo',
      neu: 'From $0 / mo',
    },
    {
      metric: t('metricPaymentMethods', locale),
      old: 'Stripe only',
      neu: 'Swish · Vipps · Cards',
    },
    {
      metric: t('metricNordicVat', locale),
      old: 'Manual / messy',
      neu: 'Auto Fortnox & VAT',
    },
    {
      metric: t('metricSocialStack', locale),
      old: 'Later + Linktree + Skool',
      neu: t('metricSocialStackNew', locale),
    },
  ];

  return (
    <section className="relative py-20 sm:py-28 overflow-hidden bg-gradient-to-b from-slate-50 via-indigo-50/20 to-slate-50">
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center mb-10 sm:mb-12">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-indigo-600 mb-3">
            {t('whyChooseUs', locale)}
          </p>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 tracking-tight leading-tight">
            {t('whyChooseUsHeadline', locale)}
          </h2>
          <p className="mt-3 text-slate-600 font-medium text-base sm:text-lg leading-relaxed">
            One platform instead of Later + Linktree + Skool + Stripe.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.45 }}
          className="max-w-4xl mx-auto bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-3xl shadow-xl overflow-hidden"
        >
          {/* Column headers */}
          <div className="grid grid-cols-[1.1fr_1fr_1.15fr] border-b border-slate-200/80">
            <div className="px-3 sm:px-5 py-4 sm:py-5 flex items-end">
              <p className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Feature
              </p>
            </div>
            <div className="px-3 sm:px-5 py-4 sm:py-5 border-l border-slate-200/70">
              <p className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                US Tool Stack
              </p>
              <p className="text-[11px] sm:text-sm font-bold text-slate-600 leading-snug">
                {t('whyOldWayStack', locale)}
              </p>
            </div>
            <div className="relative px-3 sm:px-5 py-4 sm:py-5 bg-slate-900 text-white">
              <span className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 inline-flex items-center gap-1 rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide">
                ✓ All-in-One Winner
              </span>
              <p className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-300 mb-1 pr-16 sm:pr-24">
                Nordic Creator
              </p>
              <p className="text-[11px] sm:text-sm font-bold text-white leading-snug pr-2">
                {t('whyNewWayStack', locale)}
              </p>
            </div>
          </div>

          {/* Matrix rows */}
          <div>
            {rows.map((row, i) => (
              <div
                key={row.metric}
                className={`grid grid-cols-[1.1fr_1fr_1.15fr] ${
                  i < rows.length - 1 ? 'border-b border-slate-100' : ''
                }`}
              >
                <div className="px-3 sm:px-5 py-3.5 sm:py-4 flex items-center">
                  <p className="text-[11px] sm:text-sm font-bold text-slate-700">{row.metric}</p>
                </div>
                <div className="px-3 sm:px-5 py-3.5 sm:py-4 border-l border-slate-100 flex items-center gap-2">
                  <X size={14} className="text-rose-400 shrink-0 hidden sm:block" aria-hidden />
                  <p className="text-[11px] sm:text-sm font-semibold text-slate-500">{row.old}</p>
                </div>
                <div className="px-3 sm:px-5 py-3.5 sm:py-4 bg-slate-900/95 flex items-center gap-2">
                  <Check
                    size={14}
                    className="text-emerald-400 shrink-0 hidden sm:block"
                    aria-hidden
                  />
                  <p className="text-[11px] sm:text-sm font-bold text-white">{row.neu}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Savings banner */}
          <div className="border-t border-slate-200/80 bg-gradient-to-r from-indigo-50 via-purple-50/60 to-pink-50 px-4 sm:px-6 py-4 sm:py-5 text-center">
            <p className="text-sm sm:text-base font-extrabold text-slate-900">
              Save over $2,000 / year by consolidating your creator stack.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

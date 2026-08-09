'use client';

import { motion } from 'motion/react';
import { X, Check } from 'lucide-react';
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
    <section className="relative py-20 sm:py-28 overflow-hidden">
      <div
        className="nc-blob w-80 h-80 top-10 right-0 opacity-60"
        style={{ background: 'var(--nc-mint)' }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mb-12">
          <p
            className="text-xs font-extrabold uppercase tracking-[0.16em] mb-3"
            style={{ color: 'var(--nc-coral)' }}
          >
            {t('whyChooseUs', locale)}
          </p>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[#2c3340] tracking-tight leading-tight">
            {t('whyChooseUsHeadline', locale)}
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-4 sm:gap-5 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4 }}
            className="nc-glass rounded-[1.75rem] p-6 sm:p-7"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center">
                <X size={14} className="text-zinc-500" />
              </span>
              <h3 className="font-display font-extrabold text-lg text-[#2c3340]">
                {t('whyOldWay', locale)}
              </h3>
            </div>
            <p className="text-sm font-bold text-[#5b6472] mb-5">{t('whyOldWayStack', locale)}</p>
            <ul className="space-y-3">
              {rows.map((row) => (
                <li key={row.metric} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-[#94a0b0]">{row.metric}</span>
                  <span className="font-extrabold text-[#2c3340] text-right">{row.old}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, delay: 0.06 }}
            className="nc-glass rounded-[1.75rem] p-6 sm:p-7 border border-[color-mix(in_srgb,var(--nc-coral)_25%,transparent)]"
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--nc-coral-soft)' }}
              >
                <Check size={14} style={{ color: 'var(--nc-coral)' }} />
              </span>
              <h3 className="font-display font-extrabold text-lg text-[#2c3340]">
                {t('whyNewWay', locale)}
              </h3>
            </div>
            <p className="text-sm font-bold text-[#5b6472] mb-5">{t('whyNewWayStack', locale)}</p>
            <ul className="space-y-3">
              {rows.map((row) => (
                <li key={row.metric} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-[#94a0b0]">{row.metric}</span>
                  <span className="font-extrabold text-[#2c3340] text-right">{row.neu}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

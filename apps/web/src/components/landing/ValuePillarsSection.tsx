'use client';

import { CalendarDays, Check, Users, Zap, type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '@/lib/locale-context';
import { t, type TranslationKey } from '@/lib/i18n';

type PillarDef = {
  titleKey: TranslationKey;
  subKey: TranslationKey;
  pointKeys: [TranslationKey, TranslationKey, TranslationKey];
  icon: LucideIcon;
  popular?: boolean;
};

const PILLARS: PillarDef[] = [
  {
    titleKey: 'pillarPlanTitle',
    subKey: 'pillarPlanSub',
    pointKeys: ['pillarPlanP1', 'pillarPlanP2', 'pillarPlanP3'],
    icon: CalendarDays,
  },
  {
    titleKey: 'pillarSellTitle',
    subKey: 'pillarSellSub',
    pointKeys: ['pillarSellP1', 'pillarSellP2', 'pillarSellP3'],
    icon: Zap,
    popular: true,
  },
  {
    titleKey: 'pillarEngageTitle',
    subKey: 'pillarEngageSub',
    pointKeys: ['pillarEngageP1', 'pillarEngageP2', 'pillarEngageP3'],
    icon: Users,
  },
];

/** Three value pillars sitting directly under the hero. */
export function ValuePillarsSection() {
  const { locale } = useLanguage();

  return (
    <section
      id="value-pillars"
      className="relative py-16 sm:py-20 overflow-hidden bg-[#FAFAFA]"
      aria-labelledby="value-pillars-heading"
    >
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center mb-10 sm:mb-12">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#F472B6] mb-3">
            {t('pillarsEyebrow', locale)}
          </p>
          <h2
            id="value-pillars-heading"
            className="font-outfit font-extrabold text-3xl sm:text-4xl text-slate-900 tracking-tight leading-tight"
          >
            {t('pillarsHeadline', locale)}
          </h2>
          <p className="mt-3 text-slate-600 font-medium text-base sm:text-lg leading-relaxed font-display">
            {t('pillarsSub', locale)}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {PILLARS.map((pillar, index) => {
            const Icon = pillar.icon;
            const title = t(pillar.titleKey, locale);
            return (
              <motion.article
                key={pillar.titleKey}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                className={`relative flex flex-col rounded-3xl bg-white p-6 sm:p-7 shadow-sm ${
                  pillar.popular
                    ? 'border-2 border-[#F472B6] shadow-lg shadow-[#F472B6]/10'
                    : 'border border-slate-200/90'
                }`}
              >
                {pillar.popular ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center min-h-[28px] rounded-full bg-[#F472B6] px-3.5 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-md shadow-[#F472B6]/30 whitespace-nowrap">
                    {t('mostPopular', locale)}
                  </span>
                ) : null}

                <div
                  className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${
                    pillar.popular
                      ? 'bg-[#F472B6]/10 text-[#F472B6]'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <Icon size={22} strokeWidth={2.25} aria-hidden />
                </div>

                <h3 className="font-outfit font-extrabold text-xl tracking-tight text-slate-900 uppercase">
                  {title}
                </h3>
                <p className="mt-2 mb-5 text-sm font-medium leading-relaxed text-slate-600 font-display">
                  {t(pillar.subKey, locale)}
                </p>

                <ul className="mt-auto space-y-2.5">
                  {pillar.pointKeys.map((pointKey) => (
                    <li
                      key={pointKey}
                      className="flex items-start gap-2.5 text-sm font-medium text-slate-800 font-display"
                    >
                      <Check
                        size={16}
                        className={`mt-0.5 flex-shrink-0 ${
                          pillar.popular ? 'text-[#F472B6]' : 'text-slate-500'
                        }`}
                        aria-hidden
                      />
                      {t(pointKey, locale)}
                    </li>
                  ))}
                </ul>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

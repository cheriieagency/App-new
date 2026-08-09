'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useLanguage } from '@/lib/locale-context';
import { t, type TranslationKey } from '@/lib/i18n';

const FAQ_KEYS: { id: string; q: TranslationKey; a: TranslationKey }[] = [
  { id: 'swish', q: 'faqSwishQ', a: 'faqSwishA' },
  { id: 'vat', q: 'faqVatQ', a: 'faqVatA' },
  { id: 'bio', q: 'faqBioQ', a: 'faqBioA' },
  { id: 'tagging', q: 'faqTaggingQ', a: 'faqTaggingA' },
  { id: 'social', q: 'faqSocialQ', a: 'faqSocialA' },
  { id: 'migrate', q: 'faqImportQ', a: 'faqImportA' },
  { id: 'payouts', q: 'faqPayoutQ', a: 'faqPayoutA' },
  { id: 'trial', q: 'faqTrialQ', a: 'faqTrialA' },
];

export function FaqSection() {
  const { locale } = useLanguage();

  return (
    <section className="relative py-20 sm:py-28 overflow-hidden">
      <div
        className="nc-blob w-72 h-72 top-10 right-10 opacity-50"
        style={{ background: 'var(--nc-blush)' }}
      />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6">
        <div className="mb-10">
          <p
            className="text-xs font-extrabold uppercase tracking-[0.16em] mb-3"
            style={{ color: 'var(--nc-coral)' }}
          >
            {t('faqEyebrow', locale)}
          </p>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[#2c3340] tracking-tight">
            {t('faqHeadline', locale)}
          </h2>
          <p className="mt-3 text-[#5b6472] font-medium">{t('faqSub', locale)}</p>
        </div>

        <div className="nc-glass rounded-[1.75rem] px-4 sm:px-6">
          <Accordion type="single" collapsible>
            {FAQ_KEYS.map((item) => (
              <AccordionItem key={item.id} value={item.id} className="border-[#e8ecf2]/60">
                <AccordionTrigger className="min-h-14 text-left text-sm sm:text-base font-display font-bold text-[#2c3340] hover:no-underline py-5">
                  {t(item.q, locale)}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-[#5b6472] font-medium leading-relaxed pb-5">
                  {t(item.a, locale)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}

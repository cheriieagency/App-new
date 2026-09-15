'use client';

import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { useLanguage } from '@/lib/locale-context';
import { t, type TranslationKey } from '@/lib/i18n';
import {
  ltAccent,
  ltCardTitleLg,
  ltCta,
  ltEyebrow,
  ltHeaderWrap,
  ltSection,
  ltSectionSub,
} from '@/components/landing/landingType';

type FaqItemDef = {
  id: string;
  qKey: TranslationKey;
  aKey: TranslationKey;
};

/** FAQ set aligned with the current clikd: product surface. */
const FAQ_ITEMS: FaqItemDef[] = [
  { id: 'checkout', qKey: 'faqPaymentsQ', aKey: 'faqPaymentsA' },
  { id: 'trial', qKey: 'faqTrialQ', aKey: 'faqTrialA' },
  { id: 'planner', qKey: 'faqTaggingQ', aKey: 'faqTaggingA' },
  { id: 'analytics', qKey: 'faqAnalyticsQ', aKey: 'faqAnalyticsA' },
  { id: 'bio', qKey: 'faqBioQ', aKey: 'faqBioA' },
  { id: 'import', qKey: 'faqImportQ', aKey: 'faqImportA' },
  { id: 'social-sets', qKey: 'faqSocialQ', aKey: 'faqSocialA' },
  { id: 'vat', qKey: 'faqVatQ', aKey: 'faqVatA' },
  { id: 'payouts', qKey: 'faqPayoutQ', aKey: 'faqPayoutA' },
  { id: 'domain', qKey: 'faqDomainQ', aKey: 'faqDomainA' },
];

export function FaqSection() {
  const { locale } = useLanguage();
  const [openId, setOpenId] = useState<string | null>('checkout');

  return (
    <section
      id="faq"
      className="relative py-16 sm:py-24 overflow-hidden bg-[#F9F8F6]"
      aria-labelledby="faq-heading"
    >
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className={ltHeaderWrap}>
          <p className={`${ltEyebrow} mb-3`}>{t('faqEyebrow', locale)}</p>
          <h2 id="faq-heading" className={ltSection}>
            {t('faqHeadline', locale)}{' '}
            <span className={ltAccent}>{t('faqHeadlineAccent', locale)}</span>
          </h2>
          <p className={ltSectionSub}>{t('faqSub', locale)}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-10 items-start">
          <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(44,38,33,0.03)] border border-[#E6E3DB] px-6 py-10">
            <div className="flex items-center justify-start mb-6">
              <div className="flex -space-x-2">
                {['AK', 'SB', 'ML'].map((initials, idx) => (
                  <span
                    // eslint-disable-next-line react/no-array-index-key
                    key={`${initials}-${idx}`}
                    className="w-10 h-10 rounded-full overflow-hidden border border-white bg-[#E6E3DB] flex items-center justify-center text-[11px] font-medium text-[#2C3B2E]"
                    aria-hidden
                  >
                    {initials}
                  </span>
                ))}
              </div>
              <span className="ml-3 inline-flex items-center rounded-full bg-[#2C3B2E] text-[#F9F8F6] px-3 h-6 text-[10px] font-inter font-medium">
                + You
              </span>
            </div>

            <div className="text-left">
              <p className={ltCardTitleLg}>{t('faqStillQuestion', locale)}</p>
              <p className="text-sm font-inter font-normal text-[#8A857D] mt-2 leading-relaxed">
                {t('faqStillSub', locale)}
              </p>
            </div>

            <a
              href="mailto:support@clikd.app"
              className={`mt-6 inline-flex items-center justify-center min-h-[44px] bg-[#2C3B2E] hover:bg-[#243228] text-[#F9F8F6] ${ltCta} px-6 py-2 rounded-xl shadow-none transition-all active:scale-[0.98]`}
            >
              {t('faqContactSupport', locale)}
            </a>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item) => {
              const open = openId === item.id;
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl overflow-hidden border transition-all duration-200 ${
                    open
                      ? 'bg-gradient-to-br from-[#2C3B2E] via-[#354A38] to-[#1E2A20] border-transparent shadow-[0_18px_50px_rgba(44,59,46,0.28)]'
                      : 'bg-white border-[#E6E3DB] hover:border-[#D5D0C6] shadow-[0_1px_2px_rgba(44,38,33,0.03)]'
                  }`}
                >
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : item.id)}
                    className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-4 min-h-[56px]"
                  >
                    <span
                      className={`flex-1 text-left font-playfair font-medium text-base tracking-tight ${
                        open ? 'text-[#F9F8F6]' : 'text-[#2C2621]'
                      }`}
                    >
                      {t(item.qKey, locale)}
                    </span>
                    {open ? (
                      <Minus size={22} className="shrink-0 text-[#F9F8F6]/80" aria-hidden />
                    ) : (
                      <Plus size={22} className="shrink-0 text-[#2C2621]" aria-hidden />
                    )}
                  </button>

                  {open ? (
                    <div className="px-5 sm:px-6 pb-6 pt-0">
                      <p className="text-sm text-[#F9F8F6]/75 font-inter font-normal leading-relaxed">
                        {t(item.aKey, locale)}
                      </p>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

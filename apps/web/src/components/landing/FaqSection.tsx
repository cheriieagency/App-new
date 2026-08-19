'use client';

import { useState } from 'react';
import {
  Bolt,
  Briefcase,
  CalendarDays,
  Globe,
  Minus,
  Plus,
  Import,
  Receipt,
  Shield,
  Sparkles,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useLanguage } from '@/lib/locale-context';
import { t, type TranslationKey } from '@/lib/i18n';

type FaqCategory = 'all' | 'payments' | 'community' | 'vat' | 'workspace';

type FaqItemDef = {
  id: string;
  category: Exclude<FaqCategory, 'all'>;
  qKey: TranslationKey;
  aKey: TranslationKey;
  icon: LucideIcon;
  iconWrap: string;
};

const FAQ_ITEMS: FaqItemDef[] = [
  {
    id: 'checkout',
    category: 'payments',
    qKey: 'faqPaymentsQ',
    aKey: 'faqPaymentsA',
    icon: Bolt,
    iconWrap: 'bg-[#FCE7F3] text-[#F472B6]',
  },
  {
    id: 'vat',
    category: 'vat',
    qKey: 'faqVatQ',
    aKey: 'faqVatA',
    icon: Receipt,
    iconWrap: 'bg-emerald-50 text-[#10B981]',
  },
  {
    id: 'import',
    category: 'community',
    qKey: 'faqImportQ',
    aKey: 'faqImportA',
    icon: Import,
    iconWrap: 'bg-[#E9D5FF]/50 text-[#2B2568]',
  },
  {
    id: 'payouts',
    category: 'payments',
    qKey: 'faqPayoutQ',
    aKey: 'faqPayoutA',
    icon: Wallet,
    iconWrap: 'bg-slate-100 text-slate-700',
  },
  {
    id: 'social-sets',
    category: 'workspace',
    qKey: 'faqSocialQ',
    aKey: 'faqSocialA',
    icon: CalendarDays,
    iconWrap: 'bg-[#FCE7F3] text-[#F472B6]',
  },
  {
    id: 'domain',
    category: 'workspace',
    qKey: 'faqDomainQ',
    aKey: 'faqDomainA',
    icon: Globe,
    iconWrap: 'bg-[#E9D5FF]/50 text-[#2B2568]',
  },
  {
    id: 'business',
    category: 'vat',
    qKey: 'faqBusinessQ',
    aKey: 'faqBusinessA',
    icon: Briefcase,
    iconWrap: 'bg-slate-100 text-slate-700',
  },
  {
    id: 'trial',
    category: 'payments',
    qKey: 'faqTrialQ',
    aKey: 'faqTrialA',
    icon: Shield,
    iconWrap: 'bg-emerald-50 text-[#10B981]',
  },
];

export function FaqSection() {
  const { locale } = useLanguage();
  const [openId, setOpenId] = useState<string | null>('checkout');

  return (
    <section
      className="relative py-16 sm:py-24 overflow-hidden bg-[#FAFAFA]"
      aria-labelledby="faq-heading"
    >
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-10">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-[#F472B6] mb-3">
            {t('faqEyebrow', locale)}
          </p>
          <h2
            id="faq-heading"
            className="font-outfit font-bold text-4xl sm:text-5xl lg:text-[3.25rem] text-slate-900 tracking-tight leading-tight"
          >
            {t('faqHeadline', locale)}
          </h2>
          <p className="mt-3 text-slate-600 font-medium text-base sm:text-lg leading-relaxed font-display">
            {t('faqSub', locale)}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-10 items-start">
          {/* Left: "Still have questions?" card */}
          <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] border border-slate-200/70 px-6 py-10">
            <div className="flex items-center justify-start mb-6">
              <div className="flex -space-x-2">
                {['AK', 'SB', 'ML'].map((initials, idx) => (
                  <span
                    // eslint-disable-next-line react/no-array-index-key
                    key={`${initials}-${idx}`}
                    className="w-10 h-10 rounded-full overflow-hidden border border-white bg-[#E9D5FF] flex items-center justify-center text-[11px] font-extrabold text-[#2B2568]"
                    aria-hidden
                  >
                    {initials}
                  </span>
                ))}
              </div>
              <span className="ml-3 inline-flex items-center rounded-full bg-[#2B2568] text-white px-3 h-6 text-[10px] font-extrabold">
                + You
              </span>
            </div>

            <div className="text-left">
              <p className="font-outfit font-extrabold text-2xl text-slate-900 tracking-tight">
                {t('faqStillQuestion', locale)}
              </p>
              <p className="text-sm font-medium text-slate-600 mt-2 font-display">
                {t('faqStillSub', locale)}
              </p>
            </div>

            <a
              href="mailto:support@clikd.app"
              className="mt-6 inline-flex items-center justify-center min-h-[44px] bg-[#2B2568] hover:bg-[#1a1848] text-white font-bold text-xs sm:text-sm px-6 py-2 rounded-xl shadow-md shadow-[#2B2568]/20 transition-all active:scale-[0.98]"
            >
              {t('faqContactSupport', locale)}
            </a>
          </div>

          {/* Right: FAQ accordion list */}
          <div className="space-y-3">
            {FAQ_ITEMS.map((item) => {
              const open = openId === item.id;
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl overflow-hidden border transition-all duration-200 ${
                    open
                      ? 'bg-gradient-to-br from-[#E9D5FF] via-[#F5F3FF] to-[#FCE7F3] border-transparent shadow-[0_18px_60px_rgba(233,213,255,0.35)]'
                      : 'bg-white border-slate-200/80 hover:border-slate-300/90 shadow-[0_1px_2px_rgba(15,23,42,0.03)]'
                  }`}
                >
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : item.id)}
                    className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-4 min-h-[56px]"
                  >
                    <span
                      className={`flex-1 font-outfit font-extrabold text-sm sm:text-base tracking-tight ${
                        open ? 'text-slate-900' : 'text-slate-900'
                      }`}
                    >
                      {t(item.qKey, locale)}
                    </span>
                    {open ? (
                      <Minus size={22} className="shrink-0 text-[#2B2568]" aria-hidden />
                    ) : (
                      <Plus size={22} className="shrink-0 text-slate-900" aria-hidden />
                    )}
                  </button>

                  {open ? (
                    <div className="px-5 sm:px-6 pb-6 pt-0">
                      <p className="text-xs sm:text-[13px] text-slate-700/90 font-medium leading-relaxed font-display">
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

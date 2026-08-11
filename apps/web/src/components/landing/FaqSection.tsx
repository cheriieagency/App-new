'use client';

import { useMemo, useState } from 'react';
import {
  Bolt,
  Briefcase,
  CalendarDays,
  ChevronDown,
  Globe,
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

const FILTERS: { id: FaqCategory; labelKey: TranslationKey; icon: LucideIcon }[] = [
  { id: 'all', labelKey: 'faqFilterAll', icon: Sparkles },
  { id: 'payments', labelKey: 'faqFilterPayments', icon: Wallet },
  { id: 'community', labelKey: 'faqFilterCommunity', icon: Users },
  { id: 'vat', labelKey: 'faqFilterVat', icon: Receipt },
  { id: 'workspace', labelKey: 'faqFilterWorkspace', icon: Globe },
];

const FAQ_ITEMS: FaqItemDef[] = [
  {
    id: 'swish',
    category: 'payments',
    qKey: 'faqSwishQ',
    aKey: 'faqSwishA',
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
  const [filter, setFilter] = useState<FaqCategory>('all');
  const [openId, setOpenId] = useState<string | null>('swish');

  const visible = useMemo(
    () => (filter === 'all' ? FAQ_ITEMS : FAQ_ITEMS.filter((item) => item.category === filter)),
    [filter]
  );

  return (
    <section
      className="relative py-16 sm:py-24 overflow-hidden bg-[#FAFAFA]"
      aria-labelledby="faq-heading"
    >
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-10">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-[#F472B6] mb-3">
            {t('faqEyebrow', locale)}
          </p>
          <h2
            id="faq-heading"
            className="font-outfit font-extrabold text-3xl sm:text-4xl text-slate-900 tracking-tight leading-tight"
          >
            {t('faqHeadline', locale)}
          </h2>
          <p className="mt-3 text-slate-600 font-medium text-base sm:text-lg leading-relaxed font-display">
            {t('faqSub', locale)}
          </p>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-2 mb-8">
          {FILTERS.map((tab) => {
            const active = filter === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setFilter(tab.id);
                  setOpenId(null);
                }}
                className={
                  active
                    ? 'inline-flex items-center gap-1.5 bg-[#1a1848] text-white font-bold text-[10px] sm:text-xs px-3 py-2.5 rounded-xl shadow-sm min-h-[44px] whitespace-nowrap'
                    : 'inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[10px] sm:text-xs px-3 py-2.5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] min-h-[44px] whitespace-nowrap'
                }
              >
                <Icon
                  size={13}
                  className={active ? 'text-[#F472B6]' : 'text-slate-400'}
                  aria-hidden
                />
                {t(tab.labelKey, locale)}
              </button>
            );
          })}
        </div>

        <div className="space-y-3 mb-10">
          {visible.map((item) => {
            const Icon = item.icon;
            const open = openId === item.id;
            return (
              <div
                key={item.id}
                className={`bg-white border rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all duration-200 ${
                  open
                    ? 'border-[#F472B6]/50 shadow-md shadow-[#F472B6]/5'
                    : 'border-slate-200/80 hover:border-slate-300/90'
                }`}
              >
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : item.id)}
                  className="w-full flex items-center gap-3 px-4 sm:px-5 py-4 min-h-[56px] text-left"
                >
                  <span
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.iconWrap}`}
                  >
                    <Icon size={18} aria-hidden />
                  </span>
                  <span className="flex-1 font-outfit font-bold text-xs sm:text-sm text-slate-900 pr-2 tracking-tight">
                    {t(item.qKey, locale)}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 transition-transform duration-200 ${
                      open ? 'rotate-180 text-[#F472B6]' : 'text-slate-400'
                    }`}
                    aria-hidden
                  />
                </button>
                {open && (
                  <div className="px-4 sm:px-5 pb-5 pt-0">
                    <p className="pl-[3.25rem] text-xs sm:text-[13px] text-slate-600 font-medium leading-relaxed font-display">
                      {t(item.aKey, locale)}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col items-center text-center gap-4">
          <div>
            <p className="font-outfit font-extrabold text-lg text-slate-900 tracking-tight">
              {t('faqStillQuestion', locale)}
            </p>
            <p className="text-sm font-medium text-slate-600 mt-1 font-display">
              {t('faqStillSub', locale)}
            </p>
          </div>
          <a
            href="mailto:support@clikd.app"
            className="inline-flex items-center justify-center min-h-[44px] bg-[#F472B6] hover:bg-[#F472B6]/90 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md shadow-[#F472B6]/20 transition-all active:scale-[0.98]"
          >
            {t('faqContactSupport', locale)}
          </a>
        </div>
      </div>
    </section>
  );
}

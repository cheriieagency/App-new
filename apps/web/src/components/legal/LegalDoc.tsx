'use client';

import type { ReactNode } from 'react';
import { useLanguage } from '@/lib/locale-context';
import { t, type TranslationKey } from '@/lib/i18n';

type LegalTitleKey = Extract<
  TranslationKey,
  'legalIntegritet' | 'legalGdpr' | 'legalVillkor' | 'legalCookies'
>;

/** Shared typography for legal policy documents. */
export function LegalDoc({
  titleKey,
  updated,
  children,
}: {
  titleKey: LegalTitleKey;
  updated: string;
  children: ReactNode;
}) {
  const { locale } = useLanguage();

  return (
    <article>
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-[#F472B6] mb-3">
        {t('legalEyebrow', locale)}
      </p>
      <h1 className="font-outfit font-extrabold text-3xl sm:text-4xl text-slate-900 tracking-tight leading-tight mb-2">
        {t(titleKey, locale)}
      </h1>
      <p className="text-sm text-slate-500 font-medium mb-8 font-display">
        {t('lastUpdated', locale)} {updated}
      </p>
      <div className="space-y-6 text-sm sm:text-[15px] leading-relaxed text-slate-700 font-display [&_h2]:font-outfit [&_h2]:font-extrabold [&_h2]:text-lg [&_h2]:text-slate-900 [&_h2]:tracking-tight [&_h2]:mt-8 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-[#F472B6] [&_a]:font-bold hover:[&_a]:underline">
        {children}
      </div>
    </article>
  );
}

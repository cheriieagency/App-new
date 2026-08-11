'use client';

import type { ReactNode } from 'react';
import { useLanguage } from '@/lib/i18n';
import type { LegalSectionKey } from '@/lib/i18n/legal-sections';

export type LegalDocKind = 'privacy' | 'terms' | 'cookies' | 'gdpr';

const TITLE_KEY: Record<LegalDocKind, `legal.${'privacy' | 'terms' | 'cookies' | 'gdpr'}Title`> = {
  privacy: 'legal.privacyTitle',
  terms: 'legal.termsTitle',
  cookies: 'legal.cookiesTitle',
  gdpr: 'legal.gdprTitle',
};

const SUMMARY_KEY: Record<
  LegalDocKind,
  `legal.${'privacy' | 'terms' | 'cookies' | 'gdpr'}Summary`
> = {
  privacy: 'legal.privacySummary',
  terms: 'legal.termsSummary',
  cookies: 'legal.cookiesSummary',
  gdpr: 'legal.gdprSummary',
};

/** Shared typography for legal policy documents. */
export function LegalDoc({
  doc,
  updated,
  children,
}: {
  doc: LegalDocKind;
  updated: string;
  children: ReactNode;
}) {
  const { t } = useLanguage();

  return (
    <article>
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-[#F472B6] mb-3">
        {t('legal.eyebrow')}
      </p>
      <h1 className="font-outfit font-extrabold text-3xl sm:text-4xl text-slate-900 tracking-tight leading-tight mb-2">
        {t(TITLE_KEY[doc])}
      </h1>
      <p className="text-sm text-slate-500 font-medium mb-2 font-display">
        {t(SUMMARY_KEY[doc])}
      </p>
      <p className="text-sm text-slate-500 font-medium mb-8 font-display">
        {t('legal.lastUpdated')} {updated}
      </p>
      <div className="space-y-6 text-sm sm:text-[15px] leading-relaxed text-slate-700 font-display [&_h2]:font-outfit [&_h2]:font-extrabold [&_h2]:text-lg [&_h2]:text-slate-900 [&_h2]:tracking-tight [&_h2]:mt-8 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-[#F472B6] [&_a]:font-bold hover:[&_a]:underline">
        {children}
      </div>
    </article>
  );
}

/** Translated H2 for legal section headings. */
export function LegalH2({ section }: { section: LegalSectionKey }) {
  const { t } = useLanguage();
  return <h2>{t(`legal.${section}`)}</h2>;
}

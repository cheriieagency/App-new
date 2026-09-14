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

/** Shared typography for legal policy documents — editorial. */
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
      <p className="text-[10px] font-inter font-medium uppercase tracking-[0.16em] text-[#8A857D] mb-3">
        {t('legal.eyebrow')}
      </p>
      <h1 className="font-playfair font-medium text-3xl sm:text-4xl text-[#2C2621] tracking-[-0.02em] leading-tight mb-2">
        {t(TITLE_KEY[doc])}
      </h1>
      <p className="text-sm text-[#8A857D] font-medium mb-2 font-inter">
        {t(SUMMARY_KEY[doc])}
      </p>
      <p className="text-sm text-[#8A857D] font-medium mb-8 font-inter">
        {t('legal.lastUpdated')} {updated}
      </p>
      <div
        className="space-y-6 text-sm sm:text-[15px] leading-relaxed text-[#2C2621]/85 font-inter
          [&_h2]:font-playfair [&_h2]:font-medium [&_h2]:text-lg [&_h2]:text-[#2C2621] [&_h2]:tracking-tight [&_h2]:mt-8 [&_h2]:mb-2
          [&_h3]:font-playfair [&_h3]:font-medium [&_h3]:text-base [&_h3]:text-[#2C2621] [&_h3]:tracking-tight [&_h3]:mt-4 [&_h3]:mb-2
          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5
          [&_a]:text-[#2C3B2E] [&_a]:font-medium hover:[&_a]:underline
          [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-[#E6E3DB] [&_pre]:bg-[#F0EFEA] [&_pre]:px-4 [&_pre]:py-4
          [&_table]:w-full"
      >
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

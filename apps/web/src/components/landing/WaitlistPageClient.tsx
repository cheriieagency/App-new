'use client';

import Link from 'next/link';
import {
  BarChart3,
  CalendarDays,
  Home,
  Layers,
  Mail,
  MessageSquare,
  Send,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { WaitlistHeroSection } from '@/components/landing/WaitlistHeroSection';
import { useLanguage } from '@/lib/i18n';
import type { TranslationKey } from '@/lib/i18n';

/** Legal links only — Terms, GDPR, Privacy. */
const WAITLIST_LEGAL_LINKS: { labelKey: TranslationKey; href: string }[] = [
  { labelKey: 'legalVillkor', href: '/legal/villkor' },
  { labelKey: 'legalGdpr', href: '/legal/gdpr' },
  { labelKey: 'legalIntegritet', href: '/legal/integritet' },
];

/**
 * Full Clikd suite — every core function from the platform landing,
 * rendered as editorial feature cards on the waitlist page.
 */
const WAITLIST_FEATURES: {
  icon: LucideIcon;
  titleKey: TranslationKey;
  summaryKey: TranslationKey;
}[] = [
  { icon: Send, titleKey: 'suitePublishTitle', summaryKey: 'suitePublishSummary' },
  { icon: CalendarDays, titleKey: 'suitePlannerTitle', summaryKey: 'suitePlannerSummary' },
  { icon: Home, titleKey: 'suiteBioTitle', summaryKey: 'suiteBioSummary' },
  { icon: Mail, titleKey: 'suiteEmailTitle', summaryKey: 'suiteEmailSummary' },
  { icon: MessageSquare, titleKey: 'suiteInboxTitle', summaryKey: 'suiteInboxSummary' },
  { icon: Users, titleKey: 'suiteCommunityTitle', summaryKey: 'suiteCommunitySummary' },
  { icon: Layers, titleKey: 'suiteAdsTitle', summaryKey: 'suiteAdsSummary' },
  { icon: BarChart3, titleKey: 'suiteReportsTitle', summaryKey: 'suiteReportsSummary' },
];

/**
 * Editorial waitlist landing — currently shown on `/` until launch.
 * High-end magazine aesthetic: Playfair + Inter, alabaster paper, forest green CTAs.
 */
export function WaitlistPageClient() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <div className="editorial-landing min-h-screen overflow-x-hidden">
      {/* A. Header */}
      <header className="mx-auto max-w-6xl px-6 sm:px-10 pt-8 sm:pt-10">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="font-playfair text-3xl sm:text-4xl font-medium tracking-tight text-[#2C2621] leading-none min-h-[44px] inline-flex items-center"
            aria-label="Clikd home"
          >
            C.
          </Link>

          <a
            href="/admin"
            className="inline-flex items-center min-h-[44px] rounded-xl border border-[#E6E3DB] bg-transparent px-4 py-2 text-[12px] font-inter font-medium tracking-wide text-[#8A857D] hover:text-[#2C2621] hover:border-[#D5D0C6] transition-colors"
          >
            Developer Login
          </a>
        </div>
      </header>

      {/* B. Hero + waitlist */}
      <WaitlistHeroSection />

      {/* C. Full suite feature grid — all Clikd functions */}
      <section
        className="mx-auto max-w-5xl px-6 sm:px-10 pt-24 sm:pt-32 pb-28 sm:pb-36"
        aria-labelledby="waitlist-suite-heading"
      >
        <header className="max-w-2xl mx-auto text-center mb-14 sm:mb-16">
          <p className="font-inter text-[10px] font-medium tracking-[0.18em] uppercase text-[#8A857D]">
            The studio
          </p>
          <h2
            id="waitlist-suite-heading"
            className="mt-4 font-playfair text-3xl sm:text-4xl font-medium tracking-tight text-[#2C2621] leading-snug"
          >
            Everything in one calm workspace.
          </h2>
          <p className="mt-4 font-inter text-[15px] leading-relaxed text-[#8A857D]">
            Publishing, storefront, community, CRM, inbox, ads, and analytics — designed for
            fashion brands, lifestyle creators, and PR teams who prefer precision over clutter.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {WAITLIST_FEATURES.map(({ icon: Icon, titleKey, summaryKey }) => (
            <article key={titleKey} className="editorial-card p-8 sm:p-10">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#E6E3DB] text-[#2C3B2E]">
                <Icon size={18} strokeWidth={1.5} aria-hidden />
              </div>
              <h3 className="mt-8 font-playfair text-2xl sm:text-[1.65rem] font-medium tracking-tight text-[#2C2621] leading-snug">
                {t(titleKey)}
              </h3>
              <p className="mt-4 font-inter text-[15px] leading-relaxed text-[#8A857D]">
                {t(summaryKey)}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Footer — quiet, legal only */}
      <footer className="border-t border-[#E6E3DB]">
        <div className="mx-auto max-w-6xl px-6 sm:px-10 py-10 sm:py-12 flex flex-col sm:flex-row items-center justify-between gap-5">
          <p className="font-playfair text-sm text-[#8A857D]">
            © {year} Clikd<span className="text-[#2C3B2E]">.</span>
          </p>
          <nav
            aria-label="Legal"
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
          >
            {WAITLIST_LEGAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-inter text-[12px] font-medium tracking-wide text-[#8A857D] hover:text-[#2C2621] transition-colors min-h-11 inline-flex items-center"
              >
                {t(link.labelKey)}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}

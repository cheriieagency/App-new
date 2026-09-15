'use client';

/**
 * Pre-launch waitlist home — served on `/` until NEXT_PUBLIC_SHOW_FULL_LANDING=true.
 * Reuses landing product sections so visitors see the product without a full launch.
 */

import Link from 'next/link';
import { PlatformShowcaseSection } from '@/components/landing/PlatformShowcaseSection';
import { SocialPhonesFanSection } from '@/components/landing/SocialPhonesFanSection';
import { WaitlistHeroSection } from '@/components/landing/WaitlistHeroSection';
import { useLanguage } from '@/lib/i18n';
import type { TranslationKey } from '@/lib/i18n';

/** Legal links only — Terms, GDPR, Privacy. */
const WAITLIST_LEGAL_LINKS: { labelKey: TranslationKey; href: string }[] = [
  { labelKey: 'legalVillkor', href: '/legal/villkor' },
  { labelKey: 'legalGdpr', href: '/legal/gdpr' },
  { labelKey: 'legalIntegritet', href: '/legal/integritet' },
];

export function WaitlistPageClient() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <div className="editorial-landing min-h-screen overflow-x-hidden bg-[#F9F8F6] text-[#2C2621]">
      {/* Quiet waitlist chrome — not the full marketing header */}
      <header className="mx-auto max-w-6xl px-6 sm:px-10 pt-8 sm:pt-10">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="font-playfair italic font-medium text-[2.15rem] sm:text-[2.5rem] text-[#2C2621] leading-none tracking-tight min-h-[44px] inline-flex items-center"
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

      {/* VIP waitlist signup */}
      <WaitlistHeroSection />

      {/* Product preview sections (shared with full landing — HeroSection stays launch-only) */}
      <SocialPhonesFanSection />
      <PlatformShowcaseSection />

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

'use client';

import Link from 'next/link';
import { ClikdWordmark } from '@/components/brand/ClikdLogo';
import { useLanguage } from '@/lib/locale-context';
import { t, type TranslationKey } from '@/lib/i18n';

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

const PRODUCT_LINKS: { labelKey: TranslationKey; id?: string; href?: string }[] = [
  { labelKey: 'navFeatures', id: 'creator-admin' },
  { labelKey: 'navPlatform', id: 'the-platform' },
  { labelKey: 'navPricing', href: '/pricing' },
  { labelKey: 'navCommunities', id: 'communities' },
  { labelKey: 'navFaq', id: 'faq' },
  { labelKey: 'roiEyebrow', id: 'roi' },
];

const LEGAL_LINKS: { labelKey: TranslationKey; href: string }[] = [
  { labelKey: 'legalIntegritet', href: '/legal/integritet' },
  { labelKey: 'legalVillkor', href: '/legal/villkor' },
  { labelKey: 'legalGdpr', href: '/legal/gdpr' },
  { labelKey: 'legalCookies', href: '/legal/cookies' },
];

/** Informative landing footer with product, account, and legal links. */
export function LandingFooter() {
  const { locale } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[#E6E3DB] bg-[#F9F8F6] text-[#8A857D]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <ClikdWordmark markSize={28} className="gap-2 min-h-0 mb-4" />
            <p className="text-sm font-inter font-normal leading-relaxed text-[#8A857D] max-w-xs">
              {t('footerBlurb', locale)}
            </p>
            <p className="mt-4 text-xs font-inter text-[#8A857D]/80">{t('footerBuiltFor', locale)}</p>
          </div>

          {/* Menu */}
          <div>
            <p className="text-[10px] font-inter font-medium uppercase tracking-[0.16em] text-[#8A857D] mb-4">
              {t('footerProduct', locale)}
            </p>
            <ul className="space-y-2.5">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href ?? link.id}>
                  {link.href ? (
                    <Link
                      href={link.href}
                      className="text-sm font-inter font-medium text-[#2C2621] hover:text-[#2C3B2E] transition-colors min-h-11 inline-flex items-center"
                    >
                      {t(link.labelKey, locale)}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => scrollToId(link.id!)}
                      className="text-sm font-inter font-medium text-[#2C2621] hover:text-[#2C3B2E] transition-colors min-h-11 inline-flex items-center"
                    >
                      {t(link.labelKey, locale)}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <p className="text-[10px] font-inter font-medium uppercase tracking-[0.16em] text-[#8A857D] mb-4">
              {t('footerAccount', locale)}
            </p>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/account/signin"
                  className="text-sm font-inter font-medium text-[#2C2621] hover:text-[#2C3B2E] transition-colors min-h-11 inline-flex items-center"
                >
                  {t('signIn', locale)}
                </Link>
              </li>
              <li>
                <Link
                  href="/onboarding"
                  className="text-sm font-inter font-medium text-[#2C2621] hover:text-[#2C3B2E] transition-colors min-h-11 inline-flex items-center"
                >
                  {t('signUp', locale)}
                </Link>
              </li>
              <li>
                <a
                  href="mailto:support@clikd.app"
                  className="text-sm font-inter font-medium text-[#2C2621] hover:text-[#2C3B2E] transition-colors min-h-11 inline-flex items-center"
                >
                  {t('footerSupport', locale)}
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-[10px] font-inter font-medium uppercase tracking-[0.16em] text-[#8A857D] mb-4">
              {t('footerLegal', locale)}
            </p>
            <ul className="space-y-2.5">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm font-inter font-medium text-[#2C2621] hover:text-[#2C3B2E] transition-colors min-h-11 inline-flex items-center"
                  >
                    {t(link.labelKey, locale)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-[#E6E3DB] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs font-inter text-[#8A857D]">
            © {year}{' '}
            <span className="font-playfair italic text-[#2C2621]">
              C<span className="text-[#2C3B2E]">.</span>
            </span>{' '}
            — {t('footerRights', locale)}
          </p>
        </div>
      </div>
    </footer>
  );
}

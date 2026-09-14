'use client';

/**
 * First-visit cookie consent — editorial bottom sheet.
 * Essential-only keeps the product usable; Accept enables analytics cookies.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';
import type { LocaleCode } from '@/lib/i18n';
import {
  readCookieConsent,
  writeCookieConsent,
  type CookieConsentStatus,
} from '@/lib/cookie-consent';

type Copy = {
  title: string;
  body: string;
  accept: string;
  essential: string;
  policy: string;
};

const COPY: Record<LocaleCode, Copy> = {
  en: {
    title: 'Cookies & data',
    body: 'We use cookies to keep you signed in and understand how clikd: is used. You can accept all cookies or continue with essential ones only.',
    accept: 'Accept all',
    essential: 'Essential only',
    policy: 'Cookie policy',
  },
  sv: {
    title: 'Cookies & data',
    body: 'Vi använder cookies för att hålla dig inloggad och förstå hur clikd: används. Du kan godkänna alla cookies eller fortsätta med endast nödvändiga.',
    accept: 'Godkänn alla',
    essential: 'Endast nödvändiga',
    policy: 'Cookiepolicy',
  },
  no: {
    title: 'Informasjonskapsler & data',
    body: 'Vi bruker informasjonskapsler for å holde deg innlogget og forstå hvordan clikd: brukes. Du kan godta alle, eller fortsette med kun nødvendige.',
    accept: 'Godta alle',
    essential: 'Kun nødvendige',
    policy: 'Informasjonskapsler',
  },
  da: {
    title: 'Cookies & data',
    body: 'Vi bruger cookies for at holde dig logget ind og forstå, hvordan clikd: bruges. Du kan acceptere alle cookies eller fortsætte med kun nødvendige.',
    accept: 'Acceptér alle',
    essential: 'Kun nødvendige',
    policy: 'Cookiepolitik',
  },
  fi: {
    title: 'Evästeet & data',
    body: 'Käytämme evästeitä kirjautumisen ylläpitoon ja clikd:-palvelun käytön ymmärtämiseen. Voit hyväksyä kaikki evästeet tai jatkaa vain välttämättömillä.',
    accept: 'Hyväksy kaikki',
    essential: 'Vain välttämättömät',
    policy: 'Evästekäytäntö',
  },
};

export default function CookieConsentBanner() {
  const { language } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Defer until after hydration so SSR markup matches.
    const existing = readCookieConsent();
    if (!existing) setVisible(true);
  }, []);

  function choose(status: CookieConsentStatus) {
    writeCookieConsent(status);
    setVisible(false);
  }

  if (!visible) return null;

  const copy = COPY[language] ?? COPY.en;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-body"
      className="fixed inset-x-0 bottom-0 z-[100] p-4 sm:p-6 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-xl rounded-xl border border-[#E6E3DB] bg-[#FFFFFF] p-5 sm:p-6 shadow-none">
        <p
          id="cookie-consent-title"
          className="font-playfair font-medium text-lg text-[#2C2621] tracking-tight"
        >
          {copy.title}
        </p>
        <p
          id="cookie-consent-body"
          className="mt-2 text-sm text-[#8A857D] font-medium leading-relaxed font-inter"
        >
          {copy.body}{' '}
          <Link
            href="/legal/cookies"
            className="text-[#2C3B2E] underline-offset-2 hover:underline"
          >
            {copy.policy}
          </Link>
          .
        </p>

        <div className="mt-5 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
          <button
            type="button"
            onClick={() => choose('essential')}
            className="inline-flex items-center justify-center min-h-11 px-4 rounded-xl border border-[#E6E3DB] bg-[#FFFFFF] text-sm font-medium text-[#2C2621] hover:bg-[#F0EFEA] transition-colors"
          >
            {copy.essential}
          </button>
          <button
            type="button"
            onClick={() => choose('accepted')}
            className="inline-flex items-center justify-center min-h-11 px-4 rounded-xl bg-[#2C3B2E] text-sm font-medium text-[#F9F8F6] hover:bg-[#243228] transition-colors"
          >
            {copy.accept}
          </button>
        </div>
      </div>
    </div>
  );
}

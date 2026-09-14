'use client';

/** Renders Vercel Analytics only after the user accepts non-essential cookies. */

import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import {
  COOKIE_CONSENT_EVENT,
  hasAnalyticsConsent,
  readCookieConsent,
  type CookieConsentRecord,
} from '@/lib/cookie-consent';

export default function ConsentAwareAnalytics() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const apply = (record: CookieConsentRecord | null) => {
      setAllowed(hasAnalyticsConsent(record));
    };
    apply(readCookieConsent());

    const onConsent = (event: Event) => {
      const detail = (event as CustomEvent<CookieConsentRecord>).detail;
      apply(detail ?? readCookieConsent());
    };
    window.addEventListener(COOKIE_CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, onConsent);
  }, []);

  if (!allowed) return null;
  return <Analytics />;
}

/** Client-side cookie / analytics consent — persisted in localStorage. */

export const COOKIE_CONSENT_KEY = 'clikd_cookie_consent';
export const COOKIE_CONSENT_EVENT = 'clikd:cookie-consent';

export type CookieConsentStatus = 'accepted' | 'essential';

export type CookieConsentRecord = {
  status: CookieConsentStatus;
  /** ISO timestamp when the choice was saved. */
  at: string;
};

export function readCookieConsent(): CookieConsentRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookieConsentRecord>;
    if (parsed.status !== 'accepted' && parsed.status !== 'essential') return null;
    return {
      status: parsed.status,
      at: typeof parsed.at === 'string' ? parsed.at : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeCookieConsent(status: CookieConsentStatus): CookieConsentRecord {
  const record: CookieConsentRecord = {
    status,
    at: new Date().toISOString(),
  };
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(record));
  } catch {
    /* private mode / quota — still apply in-session */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(COOKIE_CONSENT_EVENT, { detail: record })
    );
  }
  return record;
}

export function hasAnalyticsConsent(record: CookieConsentRecord | null): boolean {
  return record?.status === 'accepted';
}

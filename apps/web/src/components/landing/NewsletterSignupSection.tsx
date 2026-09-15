'use client';

/**
 * Editorial newsletter signup — same control pattern as the waitlist hero form.
 */

import { useMemo, useState, type FormEvent } from 'react';
import { useLanguage } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { ltEyebrow, ltSection } from '@/components/landing/landingType';

function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function NewsletterSignupSection() {
  const { locale } = useLanguage();
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    const e = normalizeEmail(email);
    return isValidEmail(e) && !pending;
  }, [email, pending]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const normalized = normalizeEmail(email);
    if (!isValidEmail(normalized)) {
      setError(t('newsletterInvalidEmail', locale));
      return;
    }

    setPending(true);
    try {
      const r = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalized, source: 'landing' }),
      });

      const data: unknown = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg =
          typeof data === 'object' && data != null && 'error' in data
            ? String((data as { error?: unknown }).error)
            : t('newsletterError', locale);
        setError(msg === 'database_offline' ? t('newsletterOffline', locale) : msg);
        return;
      }

      setDone(true);
    } catch (err) {
      setError(t('newsletterNetworkError', locale));
      console.error('[newsletter] submit failed', err);
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      id="newsletter"
      className="relative py-12 sm:py-16 text-center overflow-hidden bg-[#F9F8F6]"
      aria-labelledby="newsletter-heading"
    >
      <div className="relative max-w-xl mx-auto px-4 sm:px-6">
        <p className={`${ltEyebrow} mb-3`}>{t('newsletterEyebrow', locale)}</p>
        <h2 id="newsletter-heading" className={`${ltSection} mb-8`}>
          {t('newsletterHeadlineLead', locale)}{' '}
          <em className="italic font-normal">{t('newsletterHeadlineEm', locale)}</em>
        </h2>

        {done ? (
          <div className="mx-auto max-w-lg rounded-xl border border-[#E6E3DB] bg-white px-5 py-6">
            <p className="font-inter text-[10px] font-medium uppercase tracking-[0.16em] text-[#2C3B2E]">
              {t('newsletterSuccessEyebrow', locale)}
            </p>
            <p className="mt-2 font-playfair text-xl text-[#2C2621] tracking-tight">
              {t('newsletterSuccessTitle', locale)}
            </p>
            <p className="mt-2 text-sm font-inter leading-relaxed text-[#8A857D]">
              {t('newsletterSuccessBody', locale)}
            </p>
            <button
              type="button"
              onClick={() => {
                setDone(false);
                setEmail('');
                setError(null);
              }}
              className="mt-5 w-full h-11 min-h-[44px] rounded-xl border border-[#E6E3DB] bg-[#F9F8F6] text-[13px] font-inter font-medium text-[#2C2621] hover:bg-white transition-colors"
            >
              {t('newsletterAnotherEmail', locale)}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mx-auto max-w-lg">
            <div className="flex flex-col sm:flex-row items-stretch gap-3 sm:gap-0 sm:border sm:border-[#E6E3DB] sm:bg-[#FFFFFF] sm:rounded-xl sm:p-1.5">
              <label className="sr-only" htmlFor="newsletter-email">
                {t('newsletterEmailLabel', locale)}
              </label>
              <input
                id="newsletter-email"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder={t('newsletterEmailPlaceholder', locale)}
                className="w-full sm:flex-1 h-12 min-h-[44px] rounded-xl sm:rounded-lg border border-[#E6E3DB] sm:border-0 bg-[#FFFFFF] sm:bg-transparent px-4 text-[15px] font-inter text-[#2C2621] placeholder:text-[#8A857D]/70 focus:outline-none focus:ring-1 focus:ring-[#2C3B2E]/25 sm:focus:ring-0"
              />
              <button
                type="submit"
                disabled={!canSubmit}
                className="h-12 min-h-[44px] shrink-0 rounded-xl sm:rounded-lg bg-[#2C3B2E] px-6 text-[13px] font-inter font-medium tracking-wide text-[#F9F8F6] transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pending ? t('newsletterSubmitting', locale) : t('newsletterCta', locale)}
              </button>
            </div>

            {error ? (
              <p className="mt-4 text-sm font-inter text-[#B85C38]">{error}</p>
            ) : (
              <p className="mt-4 text-[12px] font-inter tracking-wide text-[#8A857D]">
                {t('newsletterPrivacy', locale)}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}

/**
 * Ads money formatting — respects UI language for number format + display currency.
 * SEK account amounts convert via language map; other ISO currencies keep their code.
 */

import type { LocaleCode } from '@/lib/i18n/dictionaries';
import { localeTag, type Locale } from '@/lib/i18n';

const SEK_RATE: Record<LocaleCode, { currency: string; rate: number }> = {
  en: { currency: 'USD', rate: 1 / 10 },
  sv: { currency: 'SEK', rate: 1 },
  no: { currency: 'NOK', rate: 1.05 },
  da: { currency: 'DKK', rate: 0.7 },
  fi: { currency: 'EUR', rate: 1 / 11 },
};

function isSek(currency: string | null | undefined): boolean {
  return !currency || currency.toUpperCase() === 'SEK';
}

/** Resolve amount + ISO currency for the active language. */
export function adsMoneyParts(
  amount: number,
  accountCurrency: string | null | undefined,
  locale: LocaleCode | Locale
): { value: number; currency: string } {
  if (isSek(accountCurrency)) {
    const meta = SEK_RATE[locale as LocaleCode] ?? SEK_RATE.en;
    return {
      value: Math.round((Number(amount) || 0) * meta.rate * 100) / 100,
      currency: meta.currency,
    };
  }
  return {
    value: Number(amount) || 0,
    currency: String(accountCurrency).toUpperCase(),
  };
}

/** Format spend / budget / CPC for Ads Manager. */
export function formatAdsMoney(
  amount: number,
  accountCurrency: string | null | undefined,
  locale: LocaleCode | Locale,
  opts?: { maximumFractionDigits?: number }
): string {
  const { value, currency } = adsMoneyParts(amount, accountCurrency, locale);
  const digits = opts?.maximumFractionDigits ?? 2;
  try {
    return new Intl.NumberFormat(localeTag(locale as Locale), {
      style: 'currency',
      currency,
      maximumFractionDigits: digits,
      minimumFractionDigits: digits > 0 ? Math.min(2, digits) : 0,
    }).format(value);
  } catch {
    return `${value.toFixed(digits)} ${currency}`;
  }
}

/** Format whole counts (impressions, clicks) with locale grouping. */
export function formatAdsInt(
  value: number,
  locale: LocaleCode | Locale
): string {
  return new Intl.NumberFormat(localeTag(locale as Locale)).format(
    Math.round(value || 0)
  );
}

/** Currency code label for inputs (e.g. budget field suffix). */
export function adsCurrencyCode(
  accountCurrency: string | null | undefined,
  locale: LocaleCode | Locale
): string {
  return adsMoneyParts(0, accountCurrency, locale).currency;
}

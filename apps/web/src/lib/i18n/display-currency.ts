/**
 * Landing display currency by UI language.
 * EN → USD · SV → SEK · NO → NOK · DA → DKK · FI → EUR
 */

import type { LocaleCode } from '@/lib/i18n/dictionaries';

export type DisplayCurrency = 'USD' | 'SEK' | 'NOK' | 'DKK' | 'EUR';

/** Canonical comparison amounts in SEK (Nordic list price base). */
export const COMPARISON_AMOUNTS_SEK = {
  bio: 990,
  community: 990,
  planner: 250,
  total: 2230,
  clikd: 199,
  yearlySavings: 20_000,
} as const;

const NUMBER_LOCALES: Record<LocaleCode, string> = {
  en: 'en-US',
  sv: 'sv-SE',
  no: 'nb-NO',
  da: 'da-DK',
  fi: 'fi-FI',
};

/** Approx. SEK → local currency for marketing round-numbers. */
const FROM_SEK: Record<LocaleCode, { currency: DisplayCurrency; rate: number }> = {
  en: { currency: 'USD', rate: 1 / 10 }, // 990 → $99, 2230 → $223
  sv: { currency: 'SEK', rate: 1 },
  no: { currency: 'NOK', rate: 1.05 },
  da: { currency: 'DKK', rate: 0.7 },
  fi: { currency: 'EUR', rate: 1 / 11 },
};

/** Convert a SEK amount into the currency for the active language. */
export function toDisplayAmount(amountSek: number, locale: LocaleCode): {
  value: number;
  currency: DisplayCurrency;
} {
  const meta = FROM_SEK[locale] ?? FROM_SEK.en;
  return {
    value: Math.round(amountSek * meta.rate),
    currency: meta.currency,
  };
}

/** Format like `$99`, `199 SEK`, `18 €`. */
export function formatDisplayMoney(
  amountSek: number,
  locale: LocaleCode,
  opts?: { approx?: boolean; plus?: boolean }
): string {
  const { value, currency } = toDisplayAmount(amountSek, locale);
  const grouped = value.toLocaleString(NUMBER_LOCALES[locale] ?? 'en-US', {
    maximumFractionDigits: 0,
  });
  const plus = opts?.plus ? '+' : '';
  const approx = opts?.approx ? '~' : '';

  if (currency === 'USD') return `${approx}$${grouped}${plus}`;
  if (currency === 'EUR') return `${approx}${grouped}${plus} €`;
  return `${approx}${grouped}${plus} ${currency}`;
}

/** e.g. `~$223+ / mo` or `~2,230+ SEK / mo` */
export function formatPerMonth(
  amountSek: number,
  locale: LocaleCode,
  opts?: { approx?: boolean; plus?: boolean }
): string {
  return `${formatDisplayMoney(amountSek, locale, opts)} / mo`;
}

/** Localized comparison price pack for the Why Choose Us section. */
export function getComparisonPrices(locale: LocaleCode) {
  return {
    bio: formatPerMonth(COMPARISON_AMOUNTS_SEK.bio, locale, { approx: true }),
    community: formatPerMonth(COMPARISON_AMOUNTS_SEK.community, locale, {
      approx: true,
    }),
    planner: formatPerMonth(COMPARISON_AMOUNTS_SEK.planner, locale, { approx: true }),
    total: formatPerMonth(COMPARISON_AMOUNTS_SEK.total, locale, {
      approx: true,
      plus: true,
    }),
    clikd: formatDisplayMoney(COMPARISON_AMOUNTS_SEK.clikd, locale),
    yearlySavings: formatDisplayMoney(COMPARISON_AMOUNTS_SEK.yearlySavings, locale),
  };
}

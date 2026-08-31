/**
 * Platform subscription prices — SEK list prices + presentment currencies.
 */

import type { WorkspacePlan } from '@/lib/config/plans';

export type BillingCycle = 'monthly' | 'yearly';

/** Currencies offered at Stripe Checkout. */
export type CheckoutCurrency = 'sek' | 'nok' | 'dkk' | 'eur' | 'usd';

export const CHECKOUT_CURRENCIES: Array<{
  code: CheckoutCurrency;
  label: string;
  symbol: string;
}> = [
  { code: 'sek', label: 'Swedish krona (SEK)', symbol: 'kr' },
  { code: 'nok', label: 'Norwegian krone (NOK)', symbol: 'kr' },
  { code: 'dkk', label: 'Danish krone (DKK)', symbol: 'kr' },
  { code: 'eur', label: 'Euro (EUR)', symbol: '€' },
  { code: 'usd', label: 'US dollar (USD)', symbol: '$' },
];

/** List prices in SEK (matches landing PricingSection). */
export const PLATFORM_PLAN_PRICES_SEK: Record<
  Exclude<WorkspacePlan, 'starter'>,
  Record<BillingCycle, number>
> = {
  creator: { monthly: 199, yearly: 165 },
  pro: { monthly: 699, yearly: 582 },
};

/** @deprecated Prefer PLATFORM_PLAN_PRICES_SEK */
export const PLATFORM_PLAN_PRICES = PLATFORM_PLAN_PRICES_SEK;

/**
 * Approx. SEK → presentment rate for checkout.
 * Kept in sync with marketing display rates in display-currency.ts.
 */
const FROM_SEK: Record<CheckoutCurrency, number> = {
  sek: 1,
  nok: 1.05,
  dkk: 0.7,
  eur: 1 / 11,
  usd: 1 / 10,
};

export function normalizeBillingCycle(value: unknown): BillingCycle {
  return String(value || '').toLowerCase() === 'yearly' ? 'yearly' : 'monthly';
}

export function normalizeSignupPlan(value: unknown): WorkspacePlan {
  const p = String(value || '').toLowerCase();
  if (p === 'creator' || p === 'pro' || p === 'starter') return p;
  if (p === 'growth') return 'creator';
  if (p === 'scale') return 'pro';
  return 'starter';
}

export function normalizeCheckoutCurrency(value: unknown): CheckoutCurrency {
  const c = String(value || '').trim().toLowerCase();
  if (c === 'sek' || c === 'nok' || c === 'dkk' || c === 'eur' || c === 'usd') {
    return c;
  }
  return 'sek';
}

/** Convert SEK list price into the chosen checkout currency (whole major units). */
export function convertSekToCurrency(
  amountSek: number,
  currency: CheckoutCurrency
): number {
  const rate = FROM_SEK[currency] ?? 1;
  return Math.max(1, Math.round(amountSek * rate));
}

export function getPlanPriceInCurrency(input: {
  plan: Exclude<WorkspacePlan, 'starter'>;
  billing: BillingCycle;
  currency: CheckoutCurrency;
}): { amount: number; amountSek: number; currency: CheckoutCurrency } {
  const amountSek = PLATFORM_PLAN_PRICES_SEK[input.plan][input.billing];
  return {
    amountSek,
    amount: convertSekToCurrency(amountSek, input.currency),
    currency: input.currency,
  };
}

export function formatCheckoutPrice(
  amount: number,
  currency: CheckoutCurrency
): string {
  const meta = CHECKOUT_CURRENCIES.find((c) => c.code === currency);
  const symbol = meta?.symbol || currency.toUpperCase();
  if (currency === 'usd') return `$${amount}`;
  if (currency === 'eur') return `${amount} €`;
  return `${amount} ${symbol}`;
}

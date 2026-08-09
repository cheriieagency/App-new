'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Check, X } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useLanguage } from '@/lib/locale-context';
import { t } from '@/lib/i18n';

type Billing = 'monthly' | 'yearly';

const YEARLY_DISCOUNT = 0.17;

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    monthly: 0,
    blurb: 'Get started free and try the platform.',
    cta: 'Start free community',
    href: '/account/signup',
    featured: false,
    features: [
      '1 community',
      'Up to 25 members',
      'Basic feed & events',
      'Swish checkout (demo)',
      'Email support',
    ],
  },
  {
    id: 'creator',
    name: 'Creator',
    monthly: 199,
    blurb: 'Everything you need to sell and build community.',
    cta: 'Choose Creator',
    href: '/account/signup',
    featured: true,
    features: [
      'Unlimited members',
      'Store + 1-tap checkout',
      'Classroom & courses',
      'Events + live RSVP',
      'Bio Builder with UTM',
      'Email CRM & broadcasts',
      'Swish & Vipps',
      'AI Copilot',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthly: 499,
    blurb: 'For teams and creators scaling seriously.',
    cta: 'Choose Pro',
    href: '/account/signup',
    featured: false,
    features: [
      'Everything in Creator',
      'Multiple communities',
      'Priority support',
      'Advanced analytics',
      'Custom domains',
      'Team roles & mods',
      'Fortnox export',
      'White-label bio',
    ],
  },
] as const;

const COMPARISON_ROWS = [
  {
    label: 'Stan Store (approx.)',
    usa: '~290 SEK/mo',
    nordic: 'Included',
  },
  {
    label: 'Skool community',
    usa: '~1 050 SEK/mo',
    nordic: 'Included',
  },
  {
    label: 'Stripe / VAT hassle',
    usa: 'Extra time & fees',
    nordic: 'Swish + Swedish VAT',
  },
  {
    label: 'Course platform',
    usa: 'Separate tool',
    nordic: 'Classroom included',
  },
  {
    label: 'Typical total stack',
    usa: '~1 340+ SEK/mo',
    nordic: '199 SEK/mo',
  },
] as const;

const PRICING_FAQ = [
  {
    id: 'swish',
    question: 'Can I accept Swish payments?',
    answer:
      'Yes. Nordic Creator is built for Nordic buyers — Swish and Vipps sit in checkout. Members pay in seconds without leaving your store.',
  },
  {
    id: 'payouts',
    question: 'When do I get paid out?',
    answer:
      'Revenue lands on your creator account and pays out to your bank on the platform schedule. Track status, amounts, and history in Analytics.',
  },
  {
    id: 'trial',
    question: 'Is there a free trial?',
    answer:
      'Starter is free forever with core features. Creator and Pro can start anytime — upgrade when you are ready to sell. No long lock-in.',
  },
] as const;

function displayPrice(monthly: number, billing: Billing) {
  if (monthly === 0) return 0;
  if (billing === 'monthly') return monthly;
  return Math.round(monthly * (1 - YEARLY_DISCOUNT));
}

export function PricingSection() {
  const { locale } = useLanguage();
  const [billing, setBilling] = useState<Billing>('monthly');

  const savingsNote = useMemo(() => {
    const creatorYearly = Math.round(199 * 12 * (1 - YEARLY_DISCOUNT));
    const creatorMonthlyYear = 199 * 12;
    return `Save ${creatorMonthlyYear - creatorYearly} SEK/year on Creator`;
  }, []);

  return (
    <section id="pricing" className="relative py-20 sm:py-28 overflow-hidden">
      <div
        className="nc-blob w-96 h-96 top-20 left-0 opacity-50"
        style={{ background: 'var(--nc-sky)' }}
      />
      <div
        className="nc-blob w-80 h-80 bottom-10 right-0 opacity-45"
        style={{ background: 'var(--nc-blush)' }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center mb-10">
          <p
            className="text-xs font-extrabold uppercase tracking-[0.16em] mb-3"
            style={{ color: 'var(--nc-coral)' }}
          >
            {t('pricing', locale)}
          </p>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[#2c3340] tracking-tight leading-tight">
            One platform. One price. No US tool stack fees.
          </h2>
          <p className="mt-4 text-[#5b6472] font-medium text-base sm:text-lg leading-relaxed">
            Pick the plan that matches where you are — upgrade as you grow.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex flex-col items-center gap-3 mb-10">
          <div className="inline-flex items-center p-1 rounded-full bg-white/70 border border-white shadow-sm">
            {(
              [
                { key: 'monthly' as const, label: 'Monthly' },
                { key: 'yearly' as const, label: 'Yearly' },
              ] as const
            ).map(({ key, label }) => {
              const active = billing === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setBilling(key)}
                  className={`h-11 min-h-[44px] px-5 rounded-full text-sm font-extrabold transition-all ${
                    active
                      ? 'text-white shadow-sm'
                      : 'text-[#5b6472] hover:text-[#2c3340]'
                  }`}
                  style={active ? { background: 'var(--nc-coral)' } : undefined}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <p className="text-xs font-bold text-[#5b6472]">
            Yearly: save 17% · {savingsNote}
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 mb-16">
          {PLANS.map((plan, i) => {
            const price = displayPrice(plan.monthly, billing);
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className={`relative rounded-[1.75rem] p-6 sm:p-7 flex flex-col ${
                  plan.featured
                    ? 'bg-white border-2 shadow-lg'
                    : 'nc-glass border border-white/70'
                }`}
                style={
                  plan.featured
                    ? { borderColor: 'var(--nc-coral)' }
                    : undefined
                }
              >
                {plan.featured && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-wide text-white px-3 py-1.5 rounded-full whitespace-nowrap"
                    style={{ background: 'var(--nc-coral)' }}
                  >
                    ⚡ Most popular
                  </span>
                )}

                <div className="mb-5">
                  <h3 className="font-display font-extrabold text-xl text-[#2c3340]">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-[#5b6472] font-medium mt-1.5 leading-relaxed">
                    {plan.blurb}
                  </p>
                </div>

                <div className="mb-6">
                  <div className="flex items-end gap-1.5">
                    <span className="font-display font-extrabold text-4xl text-[#2c3340] tabular-nums tracking-tight">
                      {price}
                    </span>
                    <span className="text-sm font-bold text-[#5b6472] mb-1.5">
                      SEK/mo
                    </span>
                  </div>
                  {billing === 'yearly' && plan.monthly > 0 && (
                    <p className="text-[11px] font-bold text-[#94a0b0] mt-1">
                      Billed {Math.round(price * 12)} SEK/year · was {plan.monthly} SEK/mo
                    </p>
                  )}
                  {plan.monthly === 0 && (
                    <p className="text-[11px] font-bold text-[#94a0b0] mt-1">
                      Free forever
                    </p>
                  )}
                </div>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm font-medium text-[#2c3340]"
                    >
                      <Check
                        size={16}
                        className="mt-0.5 flex-shrink-0"
                        style={{ color: 'var(--nc-coral)' }}
                      />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`inline-flex items-center justify-center h-12 min-h-[48px] rounded-full text-sm font-extrabold transition-all active:scale-[0.98] ${
                    plan.featured
                      ? 'text-white'
                      : 'bg-white/80 border border-white text-[#2c3340] hover:bg-white'
                  }`}
                  style={
                    plan.featured
                      ? {
                          background: 'var(--nc-coral)',
                          boxShadow: '0 14px 32px -12px rgba(155,138,251,0.45)',
                        }
                      : undefined
                  }
                >
                  {plan.cta}
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Savings vs USA tools */}
        <div className="mb-16">
          <div className="max-w-2xl mb-6">
            <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-[#2c3340] tracking-tight">
              Save vs the US tool stack
            </h3>
            <p className="mt-2 text-[#5b6472] font-medium">
              Stan Store + Skool often costs more — and you still miss Swish and Swedish VAT.
            </p>
          </div>

          <div className="nc-glass rounded-[1.75rem] overflow-hidden">
            <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-2 px-4 sm:px-6 py-3 border-b border-white/60 text-[10px] sm:text-xs font-extrabold uppercase tracking-wide text-[#94a0b0]">
              <span>Tool</span>
              <span>US stack</span>
              <span style={{ color: 'var(--nc-coral)' }}>Nordic Creator</span>
            </div>
            {COMPARISON_ROWS.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[1.2fr_1fr_1fr] gap-2 px-4 sm:px-6 py-3.5 border-b border-white/40 last:border-0 items-center"
              >
                <span className="text-xs sm:text-sm font-bold text-[#2c3340]">
                  {row.label}
                </span>
                <span className="text-xs sm:text-sm font-medium text-[#5b6472] flex items-center gap-1.5">
                  <X size={12} className="text-zinc-300 flex-shrink-0 hidden sm:block" />
                  {row.usa}
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-[#2c3340] flex items-center gap-1.5">
                  <Check
                    size={12}
                    className="flex-shrink-0 hidden sm:block"
                    style={{ color: 'var(--nc-coral)' }}
                  />
                  {row.nordic}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs font-bold text-[#94a0b0]">
            Approximate US prices converted to SEK. FX rates vary.
          </p>
        </div>

        {/* Pricing FAQ */}
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 text-center">
            <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-[#2c3340] tracking-tight">
              Pricing & payment questions
            </h3>
            <p className="mt-2 text-[#5b6472] font-medium text-sm">
              Swish, payouts, and how to get started.
            </p>
          </div>
          <div className="nc-glass rounded-[1.75rem] px-4 sm:px-6">
            <Accordion type="single" collapsible>
              {PRICING_FAQ.map((item) => (
                <AccordionItem
                  key={item.id}
                  value={item.id}
                  className="border-[#e8ecf2]/60"
                >
                  <AccordionTrigger className="min-h-14 text-left text-sm sm:text-base font-display font-bold text-[#2c3340] hover:no-underline py-5">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-[#5b6472] font-medium leading-relaxed pb-5">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';

type BillingCycle = 'monthly' | 'yearly';

const VALUE_PILLS = [
  { emoji: '⏱️', label: 'Save 15+ hours/mo', hint: 'no app switching' },
  { emoji: '💰', label: 'Save 2,000+ SEK/mo', hint: 'single subscription' },
  { emoji: '⚡', label: '0% Platform Fee Option', hint: '' },
] as const;

const TRUST_ROW = [
  '🛡️ Cancel anytime with 1-click',
  '🔒 BankID & Bank-grade security',
  '🎧 Free migration support',
] as const;

export function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const yearly = billingCycle === 'yearly';

  const creatorPrice = yearly ? 165 : 199;
  const proPrice = yearly ? 415 : 499;

  const creatorSubtitle = yearly
    ? 'Billed annually (1,990 SEK/yr) — Save 17%'
    : 'Everything you need to sell and grow — cancel anytime.';
  const proSubtitle = yearly
    ? 'Billed annually (4,980 SEK/yr) — Save 17%'
    : 'For high-earning creators, educators, and multi-brand agencies.';

  return (
    <section
      id="pricing"
      className="relative py-20 sm:py-28 overflow-hidden bg-gradient-to-b from-slate-50 via-indigo-50/30 to-slate-100"
    >
      <div
        className="absolute -top-20 -left-16 w-96 h-96 rounded-full bg-indigo-400/10 blur-3xl pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute bottom-10 right-0 w-80 h-80 rounded-full bg-pink-400/10 blur-3xl pointer-events-none"
        aria-hidden
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-8">
          <p className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-indigo-600 mb-3">
            ⚡ Simple & Transparent Pricing
          </p>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 tracking-tight leading-tight">
            Everything in one place.{' '}
            <span className="bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent">
              Save hours & 80% on your stack.
            </span>
          </h2>
          <p className="mt-4 text-slate-600 font-medium text-base sm:text-lg leading-relaxed">
            Consolidate social planning, bio link storefront, community, courses, and email CRM into
            one unified dashboard — at a fraction of the cost.
          </p>
        </div>

        {/* Value pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-10">
          {VALUE_PILLS.map((pill) => (
            <div
              key={pill.label}
              className="inline-flex items-center gap-2 rounded-full bg-white/90 border border-slate-200/90 px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-800 shadow-sm"
            >
              <span aria-hidden>{pill.emoji}</span>
              <span>
                {pill.label}
                {pill.hint ? (
                  <span className="font-medium text-slate-500"> ({pill.hint})</span>
                ) : null}
              </span>
            </div>
          ))}
        </div>

        {/* Billing switcher */}
        <div className="flex flex-col items-center gap-3 mb-10">
          <div className="inline-flex items-center p-1 rounded-2xl bg-white/90 border border-slate-200/90 shadow-sm backdrop-blur-md">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`h-11 min-h-[44px] px-5 rounded-xl text-sm font-extrabold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              className={`h-11 min-h-[44px] px-5 rounded-xl text-sm font-extrabold transition-all inline-flex items-center gap-2 ${
                billingCycle === 'yearly'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Yearly
              <span className="inline-flex items-center rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wide px-2 py-0.5">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing tiers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 mb-12">
          {/* Starter */}
          <motion.article
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4 }}
            className="relative bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-3xl p-6 sm:p-7 flex flex-col shadow-sm"
          >
            <h3 className="font-display font-extrabold text-xl text-slate-900">Starter</h3>
            <p className="text-sm text-slate-600 font-medium mt-1.5 leading-relaxed mb-5">
              Perfect for launching your first digital product or bio link.
            </p>
            <div className="mb-6">
              <div className="flex items-end gap-1.5">
                <span className="font-display font-extrabold text-4xl text-slate-900 tabular-nums tracking-tight">
                  0
                </span>
                <span className="text-sm font-bold text-slate-500 mb-1.5">SEK / mo</span>
              </div>
              <p className="text-[11px] font-bold text-slate-400 mt-1">Free forever</p>
            </div>
            <ul className="space-y-2.5 mb-8 flex-1">
              {[
                '1 Social Set & Bio Link Storefront',
                '1 Free Community (Up to 25 members)',
                'Swish & Vipps 1-Tap Checkout',
                'Basic Analytics & Email CRM',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm font-medium text-slate-800">
                  <Check size={16} className="mt-0.5 flex-shrink-0 text-indigo-500" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/account/signup"
              className="inline-flex items-center justify-center min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3.5 rounded-xl border border-slate-200 transition-colors"
            >
              Start Free Forever
            </Link>
          </motion.article>

          {/* Creator — featured */}
          <motion.article
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, delay: 0.06 }}
            className="relative bg-white/95 backdrop-blur-md border-2 border-indigo-400 rounded-3xl p-6 sm:p-7 flex flex-col shadow-xl shadow-indigo-500/10"
          >
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-wide text-white px-3 py-1.5 rounded-full whitespace-nowrap bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 shadow-md">
              ⚡ Most Popular
            </span>
            <h3 className="font-display font-extrabold text-xl text-slate-900 mt-1">Creator</h3>
            <p className="text-sm text-slate-600 font-medium mt-1.5 leading-relaxed mb-5">
              {creatorSubtitle}
            </p>
            <div className="mb-6">
              <div className="flex items-end gap-1.5">
                <span className="font-display font-extrabold text-4xl text-slate-900 tabular-nums tracking-tight">
                  {creatorPrice}
                </span>
                <span className="text-sm font-bold text-slate-500 mb-1.5">SEK / mo</span>
              </div>
              {yearly && (
                <p className="text-[11px] font-bold text-emerald-600 mt-1">
                  Billed annually (1,990 SEK/yr) — Save 17%
                </p>
              )}
            </div>
            <ul className="space-y-2.5 mb-8 flex-1">
              {[
                { text: 'Unlimited Community Members', bold: true },
                { text: 'Full Social Content Planner & Kanban', bold: false },
                { text: 'Bio Link Storefront & 1-Tap Swish', bold: false },
                { text: 'Classroom Courses & Video Hosting', bold: false },
                { text: 'Email CRM & Broadcasts (2,500 contacts)', bold: false },
                { text: 'Automated Fortnox & VAT (6%/25%)', bold: false },
              ].map((f) => (
                <li
                  key={f.text}
                  className={`flex items-start gap-2 text-sm ${
                    f.bold ? 'font-extrabold text-slate-900' : 'font-medium text-slate-800'
                  }`}
                >
                  <Check size={16} className="mt-0.5 flex-shrink-0 text-emerald-500" />
                  {f.text}
                </li>
              ))}
            </ul>
            <Link
              href="/account/signup"
              className="inline-flex items-center justify-center gap-2 min-h-[44px] bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:opacity-95 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-pink-500/25 transition-all"
            >
              Start 14-Day Free Trial →
            </Link>
          </motion.article>

          {/* Pro */}
          <motion.article
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, delay: 0.12 }}
            className="relative bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-3xl p-6 sm:p-7 flex flex-col shadow-sm"
          >
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-wide text-emerald-800 bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-full whitespace-nowrap">
              0% Platform Fee
            </span>
            <h3 className="font-display font-extrabold text-xl text-slate-900 mt-1">Pro / Agency</h3>
            <p className="text-sm text-slate-600 font-medium mt-1.5 leading-relaxed mb-5">
              {proSubtitle}
            </p>
            <div className="mb-6">
              <div className="flex items-end gap-1.5">
                <span className="font-display font-extrabold text-4xl text-slate-900 tabular-nums tracking-tight">
                  {proPrice}
                </span>
                <span className="text-sm font-bold text-slate-500 mb-1.5">SEK / mo</span>
              </div>
              {yearly && (
                <p className="text-[11px] font-bold text-emerald-600 mt-1">
                  Billed annually (4,980 SEK/yr) — Save 17%
                </p>
              )}
            </div>
            <ul className="space-y-2.5 mb-8 flex-1">
              {[
                '0% Platform Fee (Keep 100% of revenue)',
                'Multiple Communities & Workspaces',
                'Custom Domain Linking (yourname.se)',
                'AI Content & Member Copilot Suite',
                'Priority 1:1 Onboarding & Support',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm font-medium text-slate-800">
                  <Check size={16} className="mt-0.5 flex-shrink-0 text-indigo-500" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/account/signup"
              className="inline-flex items-center justify-center min-h-[44px] bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-colors"
            >
              Choose Pro Plan
            </Link>
          </motion.article>
        </div>

        {/* Trust footer */}
        <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 sm:gap-6 text-sm font-bold text-slate-600">
          {TRUST_ROW.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      </div>
    </section>
  );
}

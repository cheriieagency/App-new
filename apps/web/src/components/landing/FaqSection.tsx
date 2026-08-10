'use client';

import { useMemo, useState } from 'react';
import {
  Bolt,
  Briefcase,
  CalendarDays,
  ChevronDown,
  Globe,
  Import,
  Receipt,
  Shield,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

type FaqCategory = 'all' | 'payments' | 'community' | 'vat' | 'workspace';

type FaqItem = {
  id: string;
  category: Exclude<FaqCategory, 'all'>;
  question: string;
  answer: string;
  icon: LucideIcon;
  badge: string;
};

const FILTERS: { id: FaqCategory; label: string }[] = [
  { id: 'all', label: '✨ All Questions' },
  { id: 'payments', label: '💳 Payments & Swish' },
  { id: 'community', label: '👥 Community & Migration' },
  { id: 'vat', label: '🧾 VAT & Accounting' },
  { id: 'workspace', label: '📱 Workspace & Domain' },
];

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'swish',
    category: 'payments',
    question: 'How do 1-tap Swish & Vipps payments work?',
    answer:
      'Your members can buy digital products, masterclasses, or join memberships in under 10 seconds. When they click to purchase on mobile, the Swish or Vipps app opens automatically with the exact amount pre-filled. Once authenticated with Mobile BankID, the payment is confirmed instantly and access is granted.',
    icon: Bolt,
    badge: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  },
  {
    id: 'vat',
    category: 'vat',
    question: 'How is Nordic VAT (6% / 25%) and accounting handled?',
    answer:
      'The platform automatically applies correct Nordic VAT rates depending on the item type (25% for courses/services, 6% for e-books). Automated PDF receipts are generated and emailed to your customers instantly. Export complete accounting reports directly to software like Fortnox or Visma in 1 click.',
    icon: Receipt,
    badge: 'bg-amber-50 text-amber-600 border-amber-100',
  },
  {
    id: 'import',
    category: 'community',
    question: 'Can I import my existing members from Facebook or other platforms?',
    answer:
      'Yes! You can import member email lists via CSV upload at any time. We also provide free 1:1 migration support for creators switching over 100+ active members. Imported members receive automated welcome emails with instant 1-click magic access links.',
    icon: Import,
    badge: 'bg-purple-50 text-purple-600 border-purple-100',
  },
  {
    id: 'payouts',
    category: 'payments',
    question: 'When and how do I receive my earnings?',
    answer:
      'Earnings accumulate in your creator wallet balance in real time in SEK, NOK, or DKK. You can request manual payouts at any time or enable automated weekly bank transfers directly to your Nordic bank account via BankID authentication.',
    icon: Wallet,
    badge: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  },
  {
    id: 'social-sets',
    category: 'workspace',
    question: 'Can I manage multiple brand profiles or Social Sets?',
    answer:
      'Yes. You can create multiple Team Workspaces / Brand Profiles in your admin dashboard. Each workspace has its own Social Set profiles (Instagram, TikTok, LinkedIn, YouTube), content planner calendar, Kanban board, bio link storefront, and subscriber CRM.',
    icon: CalendarDays,
    badge: 'bg-pink-50 text-pink-600 border-pink-100',
  },
  {
    id: 'domain',
    category: 'workspace',
    question: 'Can I link my own custom domain (e.g., yourname.se)?',
    answer:
      'Absolutely! You can use our default short links or connect your own domain (e.g., hub.yourdomain.se) with automated SSL certificates included on Pro plans.',
    icon: Globe,
    badge: 'bg-cyan-50 text-cyan-600 border-cyan-100',
  },
  {
    id: 'business',
    category: 'vat',
    question: 'Do I need a registered business to start selling?',
    answer:
      'No! You can launch as an individual creator or sole proprietor using Mobile BankID verification. As your digital product sales grow, you can seamlessly update your business profile details, VAT ID, or Swedish AB company information in your account settings.',
    icon: Briefcase,
    badge: 'bg-sky-50 text-sky-600 border-sky-100',
  },
  {
    id: 'trial',
    category: 'payments',
    question: 'Is there a free trial or free forever plan?',
    answer:
      'Yes. We offer a Free Forever plan with 0 SEK monthly cost so you can build your bio storefront and community risk-free. For advanced features, you can start a 14-day free trial on the Creator or Pro plan. Cancel anytime with 1 click directly from your dashboard.',
    icon: Shield,
    badge: 'bg-rose-50 text-rose-600 border-rose-100',
  },
];

export function FaqSection() {
  const [filter, setFilter] = useState<FaqCategory>('all');
  const [openId, setOpenId] = useState<string | null>('swish');

  const visible = useMemo(
    () => (filter === 'all' ? FAQ_ITEMS : FAQ_ITEMS.filter((item) => item.category === filter)),
    [filter]
  );

  return (
    <section className="relative py-20 sm:py-28 overflow-hidden bg-gradient-to-b from-slate-50 via-indigo-50/20 to-slate-50">
      <div
        className="absolute top-10 right-0 w-80 h-80 rounded-full bg-indigo-400/10 blur-3xl pointer-events-none"
        aria-hidden
      />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-500/10 border border-indigo-500/20 px-4 py-1.5 rounded-full mb-4">
            ⚡ Help & Frequently Asked Questions
          </div>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 tracking-tight">
            Got Questions? We&apos;ve Got{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Answers
            </span>
          </h2>
          <p className="mt-3 text-slate-600 font-medium text-base sm:text-lg leading-relaxed">
            Everything you need to know about payments, Swish 1-tap checkout, Nordic VAT, community
            migration, and workspace tools.
          </p>
        </div>

        <div className="flex flex-nowrap justify-center items-center gap-1 mb-8 w-full">
          {FILTERS.map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setFilter(tab.id);
                  setOpenId(null);
                }}
                className={
                  active
                    ? 'bg-indigo-600 text-white font-bold text-[9px] sm:text-[10px] px-1.5 sm:px-2.5 py-2 rounded-lg sm:rounded-xl shadow-md min-h-[40px] sm:min-h-[44px] whitespace-nowrap'
                    : 'bg-white hover:bg-slate-100 text-slate-700 font-bold text-[9px] sm:text-[10px] px-1.5 sm:px-2.5 py-2 rounded-lg sm:rounded-xl border border-slate-200/90 shadow-sm min-h-[40px] sm:min-h-[44px] whitespace-nowrap'
                }
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-3 mb-10">
          {visible.map((item) => {
            const Icon = item.icon;
            const open = openId === item.id;
            return (
              <div
                key={item.id}
                className="bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm transition-all duration-200 hover:border-indigo-300"
              >
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : item.id)}
                  className="w-full flex items-center gap-3 px-4 sm:px-5 py-4 min-h-[56px] text-left"
                >
                  <span
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${item.badge}`}
                  >
                    <Icon size={18} aria-hidden />
                  </span>
                  <span className="flex-1 font-display font-bold text-xs sm:text-sm text-slate-900 pr-2">
                    {item.question}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 transition-transform duration-200 ${
                      open ? 'rotate-180 text-indigo-600' : 'text-slate-400'
                    }`}
                    aria-hidden
                  />
                </button>
                {open && (
                  <div className="px-4 sm:px-5 pb-5 pt-0">
                    <p className="pl-[3.25rem] text-xs sm:text-[13px] text-slate-600 font-medium leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col items-center text-center gap-4">
          <div>
            <p className="font-display font-extrabold text-lg text-slate-900">
              Still have a question?
            </p>
            <p className="text-sm font-medium text-slate-600 mt-1">
              Our Nordic creator support team is here to help you move over smoothly.
            </p>
          </div>
          <a
            href="mailto:support@nordiccreator.app"
            className="inline-flex items-center justify-center min-h-[44px] bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:opacity-95 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md shadow-pink-500/20 transition-all"
          >
            Contact Support Team
          </a>
        </div>
      </div>
    </section>
  );
}

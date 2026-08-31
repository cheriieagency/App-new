'use client';

import Link from 'next/link';
import {
  Mail,
  Users,
  CheckCircle2,
  Send,
  Inbox,
  Home,
  BarChart3,
  Megaphone,
  Music2,
  Camera,
} from 'lucide-react';
import { ClikdWordmark } from '@/components/brand/ClikdLogo';
import { WaitlistHeroSection } from '@/components/landing/WaitlistHeroSection';
import { useLanguage } from '@/lib/locale-context';
import { t, type TranslationKey } from '@/lib/i18n';

/** Legal links only — Terms, GDPR, Privacy (no cookies / product / account). */
const WAITLIST_LEGAL_LINKS: { labelKey: TranslationKey; href: string }[] = [
  { labelKey: 'legalVillkor', href: '/legal/villkor' },
  { labelKey: 'legalGdpr', href: '/legal/gdpr' },
  { labelKey: 'legalIntegritet', href: '/legal/integritet' },
];

/** Standalone waitlist page — currently shown on `/` until launch. */
export function WaitlistPageClient() {
  const { locale } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-[#FAFAFA] overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-5 sm:pt-8">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <ClikdWordmark className="text-lg sm:text-xl shrink-0" />

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="/admin"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 backdrop-blur px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-mono font-medium text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-colors min-h-[44px] whitespace-nowrap"
            >
              <span className="sm:hidden">Dev Login</span>
              <span className="hidden sm:inline">Developer Login</span>
            </a>
          </div>
        </div>
      </div>

      <WaitlistHeroSection />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24 text-center">
        <section className="mt-10 sm:mt-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 text-left">
            <div className="lg:col-span-2 bg-white/80 backdrop-blur border border-slate-200/80 rounded-3xl p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shrink-0">
                  <Send size={22} />
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#FCE7F3] text-[#2B2568] px-3 sm:px-4 py-2 text-[10px] sm:text-[11px] font-extrabold border border-[#F472B6]/20 w-fit">
                  Direct Publishing API
                </span>
              </div>
              <p className="mt-4 font-outfit font-black text-slate-900 text-[1.35rem] sm:text-[1.6rem] leading-tight tracking-tight">
                Automated Multi-Platform Auto-Posting
              </p>
              <p className="mt-2 text-sm sm:text-[15px] text-slate-600 font-display leading-relaxed">
                Schedule and publish videos directly to TikTok, Instagram Reels, and Facebook in
                seconds. Integrated OAuth scopes ensure zero manual draft approvals or push
                notification hassles.
              </p>
              <div className="mt-6 h-px bg-slate-200/70" />
              <div className="mt-5 flex flex-col gap-3 sm:gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-extrabold text-white min-h-[44px]">
                      <Music2 size={14} />
                      TikTok Direct Post Active
                    </span>
                    <span className="inline-flex items-center justify-center gap-2 rounded-full bg-[#FCE7F3] text-[#2B2568] px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-extrabold border border-[#F472B6]/20 min-h-[44px]">
                      <Camera size={14} />
                      Instagram Auto-Reel
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[#F472B6] font-extrabold text-xs sm:text-sm">
                    100% Direct API Status
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur border border-slate-200/80 rounded-3xl p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <div className="w-12 h-12 rounded-2xl bg-[#FCE7F3] flex items-center justify-center text-[#F472B6]">
                <Mail size={22} />
              </div>
              <p className="mt-4 font-outfit font-extrabold text-slate-900 tracking-tight">
                Email CRM & Broadcasts
              </p>
              <p className="mt-2 text-sm text-slate-600 font-display leading-relaxed">
                Subscriber directly, automated email broadcasts, tags, and engagement tracking built
                on custom Resend infrastructure.
              </p>
              <div className="mt-6 h-px bg-slate-200/70" />
              <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
                <div className="inline-flex items-center gap-2 text-[#2B2568] font-extrabold text-sm">
                  <CheckCircle2 size={16} /> Resend Verified
                </div>
                <p className="text-xs font-display text-slate-500">99.8% Inbox Guarantee</p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur border border-slate-200/80 rounded-3xl p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <div className="w-12 h-12 rounded-2xl bg-[#E9D5FF]/60 flex items-center justify-center text-[#2B2568]">
                <Inbox size={22} />
              </div>
              <p className="mt-4 font-outfit font-extrabold text-slate-900 tracking-tight">
                Automated DMs
              </p>
              <p className="mt-2 text-sm text-slate-600 font-display leading-relaxed">
                Manage DMs and comments across Instagram and TikTok profiles seamlessly from a
                single workspace.
              </p>
              <div className="mt-6 h-px bg-slate-200/70" />
              <div className="mt-5 flex items-center justify-between">
                <div className="text-sm font-extrabold text-slate-700 flex items-center gap-2">
                  Auto Comment-to-DM Trigger
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur border border-slate-200/80 rounded-3xl p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <div className="w-12 h-12 rounded-2xl bg-[#FCE7F3] flex items-center justify-center text-[#2B2568]">
                <Home size={22} />
              </div>
              <p className="mt-4 font-outfit font-extrabold text-slate-900 tracking-tight">
                Bio Link Storefront
              </p>
              <p className="mt-2 text-sm text-slate-600 font-display leading-relaxed">
                Custom themes, UTM tracking, digital products, and a tap mobile checkout flow.
              </p>
              <div className="mt-6 h-px bg-slate-200/70" />
              <div className="mt-5 flex items-center justify-between">
                <div className="text-sm font-extrabold text-[#F472B6] flex items-center gap-2">
                  1-Tap Swish &amp; Card Checkout
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur border border-slate-200/80 rounded-3xl p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <div className="w-12 h-12 rounded-2xl bg-[#E9D5FF]/60 flex items-center justify-center text-[#2B2568]">
                <Users size={22} />
              </div>
              <p className="mt-4 font-outfit font-extrabold text-slate-900 tracking-tight">
                Community &amp; Courses
              </p>
              <p className="mt-2 text-sm text-slate-600 font-display leading-relaxed">
                Member feeds, moderation tools, classroom courses, storefront, live events, and XP
                leaderboards.
              </p>
              <div className="mt-6 h-px bg-slate-200/70" />
              <div className="mt-5 flex items-center justify-between">
                <div className="text-sm font-extrabold text-[#2B2568] flex items-center gap-2">
                  Gamified Member Hub &amp; XP
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur border border-slate-200/80 rounded-3xl p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <div className="flex items-start justify-between gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#2B2568] flex items-center justify-center text-white">
                  <Megaphone size={22} />
                </div>
                <span className="inline-flex items-center rounded-full bg-[#E9D5FF]/70 text-[#2B2568] px-3 py-1 text-[11px] font-extrabold border border-[#E9D5FF]">
                  NEW
                </span>
              </div>
              <p className="mt-4 font-outfit font-extrabold text-slate-900 tracking-tight">
                Meta Ads Manager &amp; ROAS
              </p>
              <p className="mt-2 text-sm text-slate-600 font-display leading-relaxed">
                Launch Facebook &amp; Instagram ad campaigns directly from your studio with
                real-time ROAS tracking and conversion attribution.
              </p>
              <div className="mt-6 h-px bg-slate-200/70" />
              <div className="mt-5 flex items-center justify-between">
                <div className="text-sm font-extrabold text-slate-700 flex items-center gap-2">
                  Real-time Campaign ROAS
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white/80 backdrop-blur border border-slate-200/80 rounded-3xl p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <div className="w-12 h-12 rounded-2xl bg-[#FCE7F3] flex items-center justify-center text-[#F472B6]">
                <BarChart3 size={22} />
              </div>
              <p className="mt-4 font-outfit font-extrabold text-slate-900 tracking-tight">
                In-depth Analytics &amp; Revenue Reports
              </p>
              <p className="mt-2 text-sm text-slate-600 font-display leading-relaxed">
                Reach, video views, impressions, audience growth, Linkin.bio performance, and total
                Swish &amp; card sales reports unified in one view.
              </p>
              <div className="mt-5 flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-4 py-2 text-xs font-extrabold">
                  Reach: 94.2K
                </span>
                <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-4 py-2 text-xs font-extrabold">
                  Views: 186.4K
                </span>
                <span className="inline-flex items-center rounded-full bg-[#E9D5FF]/70 text-[#2B2568] px-4 py-2 text-xs font-extrabold">
                  +842 Followers
                </span>
              </div>
              <div className="mt-6 h-px bg-slate-200/70" />
              <div className="mt-5 flex items-center justify-between">
                <div className="text-sm font-extrabold text-slate-700 flex items-center gap-2">
                  Full Cross-Platform Reports
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="border-t border-slate-200/80 bg-white text-slate-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs font-medium text-slate-400">
            © {year} clikd<span className="text-[#F472B6]">:</span>
          </p>
          <nav
            aria-label="Legal"
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1"
          >
            {WAITLIST_LEGAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-bold text-slate-700 hover:text-[#F472B6] transition-colors min-h-11 inline-flex items-center"
              >
                {t(link.labelKey, locale)}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}

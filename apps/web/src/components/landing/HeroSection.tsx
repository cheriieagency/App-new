'use client';

import Link from 'next/link';
import {
  Battery,
  FileText,
  GraduationCap,
  Percent,
  Signal,
  Smartphone,
  Users,
  Wifi,
  Zap,
} from 'lucide-react';
import { motion } from 'motion/react';
import { ClikdMark } from '@/components/brand/ClikdLogo';
import { useLanguage } from '@/lib/locale-context';
import { t } from '@/lib/i18n';

const CREATOR_AVATARS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&fit=crop&q=80',
];

const AVATAR_IMG = '/images/sofia-bergstrom.png';

const FLOAT_CARDS = [
  {
    titleKey: 'trustPillSwish' as const,
    sub: '10s 1-Tap Buy ✓',
    subClass: 'text-[#10B981]',
    icon: Smartphone,
    iconWrap: 'bg-emerald-50 text-[#10B981]',
    className: 'absolute -left-10 lg:-left-14 top-10',
  },
  {
    titleKey: 'trustPillVat' as const,
    sub: 'Fortnox & Moms',
    subClass: 'text-slate-500',
    icon: FileText,
    iconWrap: 'bg-violet-50 text-violet-600',
    className: 'absolute -right-10 lg:-right-14 top-40',
  },
  {
    titleKey: 'trustPillAi' as const,
    sub: 'Innehåll & Svar',
    subClass: 'text-[#F472B6]',
    icon: Percent,
    iconWrap: 'bg-fuchsia-50 text-[#F472B6]',
    className: 'absolute -left-10 lg:-left-14 bottom-36',
  },
  {
    titleKey: 'trustPillSocial' as const,
    sub: '1 340 Medlemmar',
    subClass: 'text-indigo-600',
    icon: Users,
    iconWrap: 'bg-indigo-50 text-indigo-600',
    className: 'absolute -right-10 lg:-right-14 bottom-20',
  },
] as const;

function PhoneStorefront() {
  const { locale } = useLanguage();

  return (
    <div className="relative mx-auto w-full max-w-[300px] lg:max-w-[320px]">
      {/* Soft glow behind phone */}
      <div
        className="absolute inset-0 -z-10 scale-125 blur-3xl pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(244,114,182,0.18) 0%, rgba(43,37,104,0.1) 45%, transparent 70%)',
        }}
        aria-hidden
      />

      {FLOAT_CARDS.map((card, i) => {
        const Icon = card.icon;
        const title = t(card.titleKey, locale);
        return (
          <motion.div
            key={card.titleKey}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.35 + i * 0.08 }}
            className={`${card.className} bg-white/92 backdrop-blur-md border border-slate-200/90 rounded-2xl p-3 shadow-sm z-20 hidden sm:flex items-start gap-2.5 max-w-[172px]`}
          >
            <span
              className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${card.iconWrap}`}
            >
              <Icon size={15} strokeWidth={2.25} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold text-slate-900 leading-tight truncate">
                {title}
              </p>
              <p className={`text-[10px] font-semibold mt-0.5 ${card.subClass}`}>{card.sub}</p>
            </div>
          </motion.div>
        );
      })}

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.12 }}
        className="relative mx-auto w-full"
      >
        <div
          className="absolute -left-[3px] top-28 w-[3px] h-8 rounded-l-sm bg-slate-700"
          aria-hidden
        />
        <div
          className="absolute -left-[3px] top-40 w-[3px] h-12 rounded-l-sm bg-slate-700"
          aria-hidden
        />
        <div
          className="absolute -right-[3px] top-36 w-[3px] h-14 rounded-r-sm bg-slate-700"
          aria-hidden
        />

        <div className="relative rounded-[48px] bg-slate-900 p-3 shadow-2xl shadow-slate-900/40">
          <div className="relative rounded-[36px] overflow-hidden bg-white min-h-[620px] flex flex-col">
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-30 w-24 h-5 bg-black rounded-full" />

            {/* Status bar over gradient */}
            <div className="relative z-20 flex items-center justify-between px-5 pt-3.5 pb-1 text-[10px] font-bold text-white">
              <span>9:41</span>
              <div className="flex items-center gap-1">
                <Signal size={11} strokeWidth={2.5} aria-hidden />
                <Wifi size={11} strokeWidth={2.5} aria-hidden />
                <Battery size={12} strokeWidth={2.5} aria-hidden />
              </div>
            </div>

            {/* Midnight → deep purple banner */}
            <div className="absolute top-0 inset-x-0 h-36 bg-gradient-to-b from-[#2B2568] via-[#3b2f7a] to-[#1a1540]" />

            <div className="relative z-10 flex-1 px-3.5 pb-4 pt-2 flex flex-col">
              {/* Avatar + Clikd mark badge */}
              <div className="flex justify-center mt-10 mb-3">
                <div className="relative">
                  <img
                    src={AVATAR_IMG}
                    alt="Sofia Bergström"
                    className="w-[72px] h-[72px] rounded-full object-cover ring-[3px] ring-white shadow-lg"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5">
                    <ClikdMark size={22} className="rounded-lg shadow-md ring-2 ring-white" />
                  </div>
                </div>
              </div>

              <div className="text-center mb-3">
                <p className="font-clikd-wordmark font-extrabold text-slate-900 text-[15px] leading-none">
                  Sofia Bergström{' '}
                  <span className="text-[#F472B6]" aria-hidden>
                    ✓
                  </span>
                </p>
                <p className="text-[10px] text-slate-500 font-medium mt-1.5 leading-snug">
                  <span className="font-mono text-slate-600">clikd:</span>
                  {' · '}Digitala Kurser & Live
                </p>
              </div>

              <div className="flex justify-center gap-1.5 mb-3.5">
                {[
                  { value: '48.2K', label: t('followersLabel', locale) },
                  { value: '1,340', label: t('activeMembersLabel', locale) },
                  { value: '12', label: t('coursesLabel', locale) },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="flex-1 min-w-0 rounded-xl bg-slate-50 border border-slate-100 px-1.5 py-2 text-center"
                  >
                    <p className="text-[11px] font-extrabold text-slate-900 leading-none tabular-nums">
                      {stat.value}
                    </p>
                    <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-wide">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="w-full min-h-10 rounded-xl text-white text-[11px] font-extrabold flex items-center justify-center gap-1.5 mb-3.5 bg-[#2B2568]"
              >
                {t('viewCommunity', locale)} →
              </button>

              <div className="flex items-center justify-between mb-2 px-0.5">
                <p className="text-[9px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400">
                  {t('productsLabel', locale)}
                </p>
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#10B981] bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                  Swish ✓
                </span>
              </div>

              <div className="space-y-2 flex-1">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/90 px-2.5 py-2.5 flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#2B2568]/10 text-[#2B2568] flex items-center justify-center shrink-0">
                    <GraduationCap size={16} strokeWidth={2.25} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-900 truncate">
                      Masterclass: Nisch & Målgrupp
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">Kurs · 8 Moduler</p>
                  </div>
                  <span className="text-[10px] font-extrabold text-slate-900 shrink-0 font-mono tabular-nums">
                    1,499 SEK
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/90 px-2.5 py-2.5 flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#F472B6]/15 text-[#F472B6] flex items-center justify-center shrink-0">
                    <Zap size={15} strokeWidth={2.25} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-900 truncate">
                      Swish Starter Pack
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">Digital nedladdning</p>
                  </div>
                  <span className="text-[10px] font-extrabold text-[#10B981] shrink-0 font-mono">
                    {t('freeLabelShort', locale)}
                  </span>
                </div>
              </div>

              <p className="mt-3 text-center text-[9px] font-mono font-bold uppercase tracking-[0.16em] text-slate-300">
                Powered by clikd:
              </p>
            </div>

            <div className="pb-2 pt-0.5 flex justify-center" aria-hidden>
              <div className="w-28 h-1 rounded-full bg-slate-900/80" />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function HeroSection() {
  const { locale } = useLanguage();

  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-[#FAFAFA]">
      <div
        className="absolute -top-32 -left-24 w-[32rem] h-[32rem] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(244,114,182,0.14) 0%, transparent 68%)',
        }}
        aria-hidden
      />
      <div
        className="absolute top-10 right-0 w-[36rem] h-[36rem] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(43,37,104,0.09) 0%, transparent 68%)',
        }}
        aria-hidden
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-16 lg:pb-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="inline-flex items-center font-mono text-xs font-bold text-slate-700 bg-white border border-slate-200/80 px-3.5 py-1.5 rounded-full mb-5 shadow-sm"
            >
              {t('landingHeroBadge', locale)}
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="font-outfit font-extrabold tracking-tight mb-5 text-slate-900"
            >
              <span className="block text-3xl sm:text-4xl lg:text-5xl xl:text-[3.25rem] leading-[1.12]">
                {t('landingHeroLine1', locale)}
              </span>
              <span className="mt-2 block text-[1.2rem] sm:text-2xl lg:text-3xl leading-snug text-[#F472B6] sm:whitespace-nowrap">
                {t('landingHeroLine2', locale)}
              </span>
              <span className="mt-1.5 block text-[1.2rem] sm:text-2xl lg:text-3xl leading-snug text-slate-900">
                {t('landingHeroLine3', locale)}
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="font-sans text-base sm:text-lg text-slate-600 leading-relaxed max-w-lg mx-auto lg:mx-0 mb-8"
            >
              {t('landingHeroSub', locale)}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16 }}
              className="flex flex-col sm:flex-row items-center lg:items-stretch justify-center lg:justify-start gap-3 mb-8"
            >
              <Link
                href="/account/signup"
                className="w-full sm:w-auto bg-[#F472B6] hover:bg-[#e0529c] text-white font-black text-xs px-7 py-4 rounded-2xl shadow-sm shadow-pink-500/20 flex items-center justify-center gap-1.5 transition-colors min-h-[44px]"
              >
                {t('landingCtaStartFree', locale)}
              </Link>
              <button
                type="button"
                onClick={() =>
                  document.getElementById('communities')?.scrollIntoView({ behavior: 'smooth' })
                }
                className="w-full sm:w-auto bg-white border border-slate-200 text-slate-900 font-bold text-xs px-7 py-4 rounded-2xl hover:bg-slate-50 transition-colors min-h-[44px]"
              >
                {t('landingCtaExplore', locale)}
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.22 }}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3"
            >
              <div className="flex -space-x-2.5">
                {CREATOR_AVATARS.map((src, i) => (
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-sm"
                    style={{ zIndex: 4 - i }}
                  />
                ))}
              </div>
              <p className="text-sm font-semibold text-slate-600">
                <span className="text-amber-400 tracking-tight" aria-hidden>
                  ★★★★★
                </span>{' '}
                {t('trustPillSocial', locale)}
              </p>
            </motion.div>
          </div>

          <div className="relative flex justify-center lg:justify-end lg:pr-8 lg:pl-4">
            <PhoneStorefront />
          </div>
        </div>
      </div>
    </section>
  );
}

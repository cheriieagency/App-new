'use client';

import Link from 'next/link';
import { ArrowRight, BookOpen, Play, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '@/lib/locale-context';
import { t } from '@/lib/i18n';

function PhoneStorefront() {
  const { locale } = useLanguage();
  const products = [
    {
      title: 'Masterclass · Niche & Audience',
      meta: `Course · 8 ${t('coursesLabel', locale)}`,
      price: '1 499 SEK',
      tone: '#0d9488',
      icon: BookOpen,
    },
    {
      title: 'Swish & Sell Live',
      meta: 'Event · Aug 13',
      price: t('freeLabelShort', locale),
      tone: '#0284c7',
      icon: Play,
    },
    {
      title: 'Creator Mentorship',
      meta: '1:1 · Monthly',
      price: '2 990 SEK',
      tone: '#ea580c',
      icon: Sparkles,
    },
  ];

  return (
    <div className="relative mx-auto w-[280px] sm:w-[300px]">
      <div
        className="nc-blob w-64 h-64 -top-8 -right-6 opacity-80"
        style={{ background: 'var(--nc-blush)' }}
      />
      <div
        className="nc-blob w-48 h-48 bottom-0 -left-8 opacity-70"
        style={{ background: 'var(--nc-sky)' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.12 }}
        className="relative nc-glass rounded-[42px] p-3"
      >
        <div className="rounded-[32px] overflow-hidden bg-white/90">
          <div className="relative h-7 bg-white/90 flex items-end justify-center pb-1">
            <div className="w-20 h-4 rounded-full bg-[#e8ecf2]" />
          </div>

          <div className="px-4 pb-5 pt-2">
            <div className="flex flex-col items-center text-center mb-4">
              <div
                className="w-16 h-16 rounded-full mb-3 flex items-center justify-center text-white font-display font-extrabold text-xl"
                style={{
                  background: 'linear-gradient(145deg, #b8a9ff 0%, #9b8afb 100%)',
                  boxShadow: '0 10px 28px -10px rgba(155,138,251,0.55)',
                }}
              >
                SB
              </div>
              <p className="font-display font-extrabold text-[#2c3340] text-base leading-none">
                Sofia Bergström
              </p>
              <p className="text-[11px] text-[#5b6472] font-medium mt-1.5 leading-snug">
                Nordic Creator · Courses, community & live
              </p>
            </div>

            <div className="flex justify-center gap-4 mb-4 text-[10px] font-semibold text-[#5b6472]">
              <span>
                <strong className="block text-[#2c3340] text-sm font-extrabold">48.2K</strong>
                {t('followersLabel', locale)}
              </span>
              <span>
                <strong className="block text-[#2c3340] text-sm font-extrabold">1 340</strong>
                {t('members', locale).toLowerCase()}
              </span>
              <span>
                <strong className="block text-[#2c3340] text-sm font-extrabold">12</strong>
                {t('coursesLabel', locale)}
              </span>
            </div>

            <div
              className="w-full min-h-10 rounded-full text-white text-xs font-extrabold flex items-center justify-center mb-4"
              style={{ background: 'var(--nc-coral)' }}
            >
              {t('goToMemberPortal', locale)}
            </div>

            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#94a0b0] mb-2">
              {t('productsLabel', locale)}
            </p>
            <div className="space-y-2">
              {products.map((product, i) => {
                const Icon = product.icon;
                return (
                  <motion.div
                    key={product.title}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
                    className="flex items-center gap-2.5 rounded-2xl bg-[#f7f9fc] px-2.5 py-2"
                  >
                    <div
                      className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${product.tone}18` }}
                    >
                      <Icon size={14} style={{ color: product.tone }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-[#2c3340] truncate leading-tight">
                        {product.title}
                      </p>
                      <p className="text-[10px] text-[#94a0b0] font-medium">{product.meta}</p>
                    </div>
                    <span className="text-[10px] font-extrabold text-[#2c3340] shrink-0">
                      {product.price}
                    </span>
                  </motion.div>
                );
              })}
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
    <section className="relative min-h-[100svh] overflow-hidden pt-14">
      <div className="absolute inset-0 bg-[#f7f9fc]" />
      <div
        className="nc-blob w-[28rem] h-[28rem] -top-20 -left-16 opacity-90"
        style={{ background: 'var(--nc-blush)' }}
      />
      <div
        className="nc-blob w-[32rem] h-[32rem] top-24 -right-24 opacity-80"
        style={{ background: 'var(--nc-sky)' }}
      />
      <div
        className="nc-blob w-72 h-72 bottom-10 left-1/3 opacity-70"
        style={{ background: 'var(--nc-mint)' }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-20 lg:pb-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-10 items-center">
          <div className="text-center lg:text-left">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="font-display font-extrabold text-[#2c3340] text-2xl sm:text-3xl tracking-tight mb-4"
            >
              Nordic Creator
            </motion.p>

            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.04 }}
              className="inline-flex items-center min-h-9 px-3.5 rounded-full text-[11px] font-extrabold uppercase tracking-[0.12em] mb-5"
              style={{
                background: 'var(--nc-coral-soft)',
                color: 'var(--nc-coral)',
              }}
            >
              {t('landingHeroBadge', locale)}
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="font-display font-extrabold text-[#2c3340] text-[2rem] sm:text-5xl lg:text-[3.15rem] leading-[1.08] tracking-tight mb-5"
            >
              {t('landingHeroHeadline', locale)}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-base sm:text-lg text-[#5b6472] leading-relaxed max-w-md mx-auto lg:mx-0 mb-7"
            >
              {t('landingHeroSub', locale)}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.14 }}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-8"
            >
              {[
                t('trustPillSwish', locale),
                t('trustPillVat', locale),
                t('trustPillAi', locale),
                t('trustPillSocial', locale),
              ].map((pill) => (
                <span
                  key={pill}
                  className="inline-flex items-center min-h-9 px-3 rounded-full bg-white/80 border border-white text-[11px] font-bold text-[#2c3340]"
                >
                  {pill}
                </span>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16 }}
              className="flex flex-col sm:flex-row items-center lg:items-stretch justify-center lg:justify-start gap-3"
            >
              <Link
                href="/account/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-12 px-7 rounded-full font-extrabold text-sm text-white transition-all active:scale-[0.98]"
                style={{
                  background: 'var(--nc-coral)',
                  boxShadow: '0 14px 36px -12px rgba(155,138,251,0.55)',
                }}
              >
                {t('landingCtaStartFree', locale)} <ArrowRight size={15} />
              </Link>
              <button
                type="button"
                onClick={() =>
                  document.getElementById('communities')?.scrollIntoView({ behavior: 'smooth' })
                }
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-12 px-7 rounded-full nc-glass text-[#2c3340] font-bold text-sm hover:bg-white/70 transition-all active:scale-[0.98]"
              >
                {t('landingCtaExplore', locale)}
              </button>
            </motion.div>
          </div>

          <div className="relative flex justify-center lg:justify-end">
            <PhoneStorefront />
          </div>
        </div>
      </div>
    </section>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { t } from '@/lib/i18n';
import { useLanguage } from '@/lib/locale-context';
import { LoginModal } from '@/components/landing/LoginModal';
import LanguageSwitcher from '@/components/LanguageSwitcher';

type LandingHeaderProps = {
  isLoggedIn: boolean;
};

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export function LandingHeader({ isLoggedIn }: LandingHeaderProps) {
  const { locale } = useLanguage();
  const [loginOpen, setLoginOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          scrolled
            ? 'bg-white/80 backdrop-blur-xl border-b border-slate-200/70 shadow-sm'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Left — brand */}
          <Link href="/" className="flex items-center gap-2.5 min-h-11 shrink-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-md shadow-indigo-600/25 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600">
              <span className="text-white font-display font-extrabold text-xs">N</span>
            </div>
            <span className="font-display font-extrabold text-sm text-slate-900 hidden sm:block">
              Nordic Creator
            </span>
          </Link>

          {/* Middle — primary nav */}
          <nav
            className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2"
            aria-label="Primary"
          >
            <button
              type="button"
              onClick={() => scrollToId('features')}
              className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors min-h-11 px-3"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => scrollToId('pricing')}
              className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors min-h-11 px-3"
            >
              Pricing
            </button>
            <button
              type="button"
              onClick={() => scrollToId('communities')}
              className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors min-h-11 px-3"
            >
              Explore Communities
            </button>
          </nav>

          {/* Right — locale + auth */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <LanguageSwitcher className="[&>button]:bg-white [&>button]:border [&>button]:border-slate-200 [&>button]:shadow-sm" />

            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-1.5 min-h-11 transition-colors"
              >
                {t('dashboard', locale)} →
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setLoginOpen(true)}
                  className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors min-h-11 px-3"
                >
                  Sign in
                </button>
                <Link
                  href="/account/signup"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-1.5 min-h-11 transition-colors"
                >
                  Get started →
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
    </>
  );
}

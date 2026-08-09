'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { t } from '@/lib/i18n';
import { useLanguage } from '@/lib/locale-context';
import { LoginModal } from '@/components/landing/LoginModal';
import LanguageSwitcher from '@/components/LanguageSwitcher';

type LandingHeaderProps = {
  isLoggedIn: boolean;
};

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
          scrolled ? 'nc-glass border-b border-white/60' : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 min-h-11">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
              style={{ background: 'var(--nc-coral)' }}
            >
              <span className="text-white font-display font-extrabold text-xs">N</span>
            </div>
            <span className="font-display font-extrabold text-sm hidden sm:block text-[#2c3340]">
              Nordic Creator
            </span>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() =>
                document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })
              }
              className="text-sm font-bold text-[#5b6472] hover:text-[#2c3340] transition-colors hidden sm:block min-h-11 px-2"
            >
              {t('pricing', locale)}
            </button>
            <button
              type="button"
              onClick={() =>
                document.getElementById('communities')?.scrollIntoView({ behavior: 'smooth' })
              }
              className="text-sm font-bold text-[#5b6472] hover:text-[#2c3340] transition-colors hidden sm:block min-h-11 px-2"
            >
              {t('findCommunity', locale)}
            </button>

            <LanguageSwitcher className="[&>button]:bg-white/70 [&>button]:border [&>button]:border-white/80" />

            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 min-h-11 px-4 rounded-full text-sm font-extrabold text-white transition-all active:scale-95"
                style={{ background: 'var(--nc-coral)' }}
              >
                {t('dashboard', locale)} <ArrowRight size={13} />
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLoginOpen(true)}
                  className="text-sm font-bold text-[#5b6472] hover:text-[#2c3340] transition-colors min-h-11 px-3 rounded-full hover:bg-white/50"
                >
                  {t('signIn', locale)}
                </button>
                <Link
                  href="/account/signup"
                  className="flex items-center gap-1.5 min-h-11 px-4 rounded-full text-sm font-extrabold text-white transition-all active:scale-95"
                  style={{ background: 'var(--nc-coral)' }}
                >
                  {t('getStarted', locale)}
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
    </>
  );
}

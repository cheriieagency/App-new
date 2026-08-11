'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';
import { LoginModal } from '@/components/landing/LoginModal';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { ClikdMark } from '@/components/brand/ClikdLogo';
import { usePlatformRole } from '@/lib/use-platform-role';

type LandingHeaderProps = {
  isLoggedIn: boolean;
};

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export function LandingHeader({ isLoggedIn }: LandingHeaderProps) {
  const { t } = useLanguage();
  const [loginOpen, setLoginOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { home, isCreator } = usePlatformRole();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header
        className={`sticky top-0 z-50 h-20 border-b px-6 sm:px-12 flex items-center justify-between transition-all duration-300 ${
          scrolled
            ? 'bg-white/80 backdrop-blur-md border-slate-200/80 shadow-sm'
            : 'bg-white/80 backdrop-blur-md border-slate-200/80'
        }`}
      >
        <Link href="/" className="flex items-center gap-2.5 shrink-0 min-h-11">
          <ClikdMark size={36} className="rounded-xl" />
          <span className="font-clikd-wordmark font-extrabold text-xl text-slate-900 tracking-tight">
            clikd<span className="text-[#F472B6]">:</span>
          </span>
        </Link>

        <nav
          className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2"
          aria-label="Primary"
        >
          <button
            type="button"
            onClick={() => scrollToId('features')}
            className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors min-h-11 px-3"
          >
            {t('nav.features')}
          </button>
          <button
            type="button"
            onClick={() => scrollToId('pricing')}
            className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors min-h-11 px-3"
          >
            {t('nav.pricing')}
          </button>
          <button
            type="button"
            onClick={() => scrollToId('communities')}
            className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors min-h-11 px-3"
          >
            {t('nav.exploreCommunities')}
          </button>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <LanguageSwitcher className="[&>button]:bg-white [&>button]:border [&>button]:border-slate-200 [&>button]:shadow-sm [&>button]:rounded-xl [&>button]:min-h-11" />

          {isLoggedIn ? (
            <Link
              href={home}
              className="bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 min-h-11 transition-colors"
            >
              {isCreator ? t('creatorAdmin') : t('nav.dashboard')}
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setLoginOpen(true)}
                className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors min-h-11 px-3"
              >
                {t('nav.logIn')}
              </button>
              <Link
                href="/onboarding"
                className="bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 min-h-11 transition-colors"
              >
                {t('nav.getStartedFree')}
              </Link>
            </>
          )}
        </div>
      </header>

      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
    </>
  );
}

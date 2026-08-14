'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Crown, Users } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { LoginModal } from '@/components/landing/LoginModal';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { ClikdMark } from '@/components/brand/ClikdLogo';
import { usePlatformRole } from '@/lib/use-platform-role';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

type LandingHeaderProps = {
  isLoggedIn: boolean;
};

type LoginRole = 'member' | 'creator';

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export function LandingHeader({ isLoggedIn }: LandingHeaderProps) {
  const { t } = useLanguage();
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginRole, setLoginRole] = useState<LoginRole>('member');
  const [loginMenuOpen, setLoginMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { home, isCreator } = usePlatformRole();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const openLogin = (role: LoginRole) => {
    setLoginRole(role);
    setLoginMenuOpen(false);
    setLoginOpen(true);
  };

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
              <Popover open={loginMenuOpen} onOpenChange={setLoginMenuOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors min-h-11 px-3 inline-flex items-center gap-1"
                    aria-haspopup="menu"
                    aria-expanded={loginMenuOpen}
                  >
                    {t('nav.logIn')}
                    <ChevronDown
                      size={14}
                      className={`opacity-60 transition-transform ${
                        loginMenuOpen ? 'rotate-180' : ''
                      }`}
                      aria-hidden
                    />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  sideOffset={8}
                  className="w-56 rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-lg"
                >
                  <div className="flex flex-col gap-0.5" role="menu">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => openLogin('creator')}
                      className="min-h-11 w-full px-3 rounded-xl text-left text-sm font-bold text-slate-800 hover:bg-slate-50 inline-flex items-center gap-2.5 transition-colors"
                    >
                      <span className="w-8 h-8 rounded-lg bg-[#2B2568] text-white inline-flex items-center justify-center flex-shrink-0">
                        <Crown size={14} aria-hidden />
                      </span>
                      Admin Log in
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => openLogin('member')}
                      className="min-h-11 w-full px-3 rounded-xl text-left text-sm font-bold text-slate-800 hover:bg-slate-50 inline-flex items-center gap-2.5 transition-colors"
                    >
                      <span className="w-8 h-8 rounded-lg bg-[#F472B6] text-white inline-flex items-center justify-center flex-shrink-0">
                        <Users size={14} aria-hidden />
                      </span>
                      Community Log in
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
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

      <LoginModal
        key={loginRole}
        open={loginOpen}
        onOpenChange={setLoginOpen}
        initialRole={loginRole}
      />
    </>
  );
}

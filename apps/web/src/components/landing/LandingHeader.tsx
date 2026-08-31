'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Crown, Users } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { LoginModal } from '@/components/landing/LoginModal';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { ClikdMark } from '@/components/brand/ClikdLogo';
import { usePlatformRole } from '@/lib/use-platform-role';
import OptimizedImage from '@/components/ui/OptimizedImage';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

type LandingHeaderUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

type LandingHeaderProps = {
  isLoggedIn: boolean;
  user?: LandingHeaderUser | null;
};

type LoginRole = 'member' | 'creator';

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

function initialsFromUser(user?: LandingHeaderUser | null): string {
  const name = (user?.name || '').trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || '');
    return letters.join('') || 'C';
  }
  const email = (user?.email || '').trim();
  if (email) return email[0]?.toUpperCase() || 'C';
  return 'C';
}

function displayNameFromUser(user?: LandingHeaderUser | null): string {
  const name = (user?.name || '').trim();
  if (name) return name.split(/\s+/)[0] || name;
  const email = (user?.email || '').trim();
  if (email) return email.split('@')[0] || email;
  return '';
}

export function LandingHeader({ isLoggedIn, user = null }: LandingHeaderProps) {
  const { t } = useLanguage();
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginRole, setLoginRole] = useState<LoginRole>('member');
  const [loginMenuOpen, setLoginMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { home, isCreator } = usePlatformRole();

  const initials = useMemo(() => initialsFromUser(user), [user]);
  const firstName = useMemo(() => displayNameFromUser(user), [user]);

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
            onClick={() => scrollToId('creator-admin')}
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
            <div className="flex items-center gap-2 sm:gap-2.5">
              {/* Explicit signed-in status — distinct from the logged-out CTAs */}
              <span
                className="hidden sm:inline-flex items-center gap-1.5 h-9 min-h-[36px] px-3 rounded-xl bg-[#FCE7F3] text-[#2B2568] text-[11px] font-extrabold tracking-wide uppercase"
                aria-live="polite"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[#F472B6]"
                  aria-hidden
                />
                {t('nav.signedIn')}
              </span>
              <Link
                href={home}
                className="bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs pl-1.5 pr-3.5 py-1.5 rounded-xl flex items-center gap-2 min-h-11 transition-colors"
                aria-label={
                  firstName
                    ? `${t('nav.signedIn')}: ${firstName}. ${
                        isCreator
                          ? t('nav.openCreatorAdmin')
                          : t('nav.openMemberDashboard')
                      }`
                    : isCreator
                      ? t('nav.openCreatorAdmin')
                      : t('nav.openMemberDashboard')
                }
              >
                {user?.image ? (
                  <OptimizedImage
                    src={user.image}
                    alt=""
                    width={32}
                    height={32}
                    sizes="32px"
                    className="w-8 h-8 rounded-lg object-cover flex-shrink-0 ring-1 ring-white/20"
                  />
                ) : (
                  <span
                    className="w-8 h-8 rounded-lg bg-[#2B2568] text-white text-[11px] font-extrabold inline-flex items-center justify-center flex-shrink-0"
                    aria-hidden
                  >
                    {initials}
                  </span>
                )}
                <span className="flex flex-col items-start leading-tight text-left">
                  {firstName ? (
                    <span className="text-[10px] font-semibold text-white/70 truncate max-w-[100px] sm:max-w-[140px]">
                      {firstName}
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-[#F472B6] sm:hidden">
                      {t('nav.signedIn')}
                    </span>
                  )}
                  <span className="text-xs font-extrabold">
                    {isCreator
                      ? t('nav.openCreatorAdmin')
                      : t('nav.openMemberDashboard')}
                  </span>
                </span>
              </Link>
            </div>
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

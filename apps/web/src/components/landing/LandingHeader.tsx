'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, ChevronDown } from 'lucide-react';
import { LOCALES, t } from '@/lib/i18n';
import { useLocale } from '@/lib/locale-context';
import { LoginModal } from '@/components/landing/LoginModal';

type LandingHeaderProps = {
  isLoggedIn: boolean;
};

export function LandingHeader({ isLoggedIn }: LandingHeaderProps) {
  const { locale, setLocale } = useLocale();
  const [langOpen, setLangOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const currentLocale = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
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
              Priser
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

            <div ref={langRef} className="relative">
              <button
                type="button"
                onClick={() => setLangOpen((v) => !v)}
                className="flex items-center gap-1.5 min-h-11 px-3 rounded-full nc-glass text-xs font-bold text-[#5b6472] hover:bg-white/70 transition-all"
              >
                <span>{currentLocale.flag}</span>
                <span className="hidden sm:inline uppercase">{currentLocale.code}</span>
                <ChevronDown
                  size={11}
                  className={`opacity-60 transition-transform ${langOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {langOpen && (
                <div className="absolute right-0 top-full mt-1.5 nc-glass rounded-2xl overflow-hidden z-50 min-w-[160px]">
                  {LOCALES.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => {
                        setLocale(l.code);
                        setLangOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 min-h-11 text-sm font-bold transition-colors hover:bg-white/50 ${
                        locale === l.code ? 'text-[#2c3340] bg-white/40' : 'text-[#5b6472]'
                      }`}
                    >
                      <span className="text-base">{l.flag}</span>
                      <span className="flex-1 text-left">{l.label}</span>
                      {locale === l.code && <Check size={13} className="text-[#2c3340]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

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
                  Logga in
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

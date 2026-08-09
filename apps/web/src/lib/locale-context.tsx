'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type Locale, DEFAULT_LOCALE } from '@/lib/i18n';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Hydrate from localStorage after mount (EN is the platform default).
  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    const saved = localStorage.getItem('nc_locale') as Locale | null;
    const valid: Locale[] = ['en', 'sv', 'no', 'da', 'fi'];
    if (saved && valid.includes(saved)) setLocaleState(saved);
  }, []);

  // Keep <html lang> in sync so the whole document reflects the active locale.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('nc_locale', l);
    }
  };

  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

/** Alias used across landing / storefront for language switching. */
export const useLanguage = useLocale;

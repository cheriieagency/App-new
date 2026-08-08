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

  // Hydrate from localStorage after mount
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('nc_locale') as Locale | null;
      if (saved) setLocaleState(saved);
    }
  }, []);

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

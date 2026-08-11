'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DICTIONARIES,
  LOCALE_META,
  SUPPORTED_LOCALES,
  tNested,
  type LocaleCode,
  type NestedKey,
} from './dictionaries';
import {
  t as tFlat,
  tf as tfFlat,
  DEFAULT_LOCALE,
  type Locale,
  type TranslationKey,
} from './flat-core';

const STORAGE_KEY = 'clikd_lang';
const LEGACY_STORAGE_KEY = 'nc_locale';

type TranslateFn = {
  /** Nested key: t('nav.features') — preferred API. */
  (key: NestedKey, vars?: Record<string, string | number>): string;
  /** Flat legacy key: t('navFeatures') — still supported. */
  (key: TranslationKey | string, vars?: Record<string, string | number>): string;
};

interface LanguageContextValue {
  language: LocaleCode;
  /** Alias for older useLocale() consumers. */
  locale: LocaleCode;
  setLanguage: (lang: LocaleCode) => void;
  /** Alias for older setLocale() consumers. */
  setLocale: (lang: LocaleCode) => void;
  /** Type-safe helper — nested keys preferred; flat keys fall back to legacy dictionary. */
  t: TranslateFn;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function isLocale(value: string | null | undefined): value is LocaleCode {
  return !!value && (SUPPORTED_LOCALES as string[]).includes(value);
}

function readStoredLanguage(): LocaleCode {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  try {
    const next = localStorage.getItem(STORAGE_KEY);
    if (isLocale(next)) return next;
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (isLocale(legacy)) {
      localStorage.setItem(STORAGE_KEY, legacy);
      return legacy;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_LOCALE;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LocaleCode>(DEFAULT_LOCALE);

  // Hydrate from localStorage after mount (EN is the platform default).
  useEffect(() => {
    setLanguageState(readStoredLanguage());
  }, []);

  // Keep <html lang> in sync so the whole document reflects the active locale.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((lang: LocaleCode) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      // Keep legacy key in sync for older code paths.
      localStorage.setItem(LEGACY_STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
  }, []);

  const translate = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      // Nested dotted keys → nested dictionaries.
      if (key.includes('.')) {
        return tNested(key, language, vars);
      }
      // Flat legacy keys → existing platform dictionary (EN fallback built-in).
      if (vars) {
        return tfFlat(key as TranslationKey, language as Locale, vars);
      }
      return tFlat(key as TranslationKey, language as Locale);
    },
    [language]
  ) as TranslateFn;

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      locale: language,
      setLanguage,
      setLocale: setLanguage,
      t: translate,
    }),
    [language, setLanguage, translate]
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

/** Primary hook — language, setLanguage, and t('category.key'). */
export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Safe SSR / missing-provider fallback (English).
    const fallbackT = ((key: string, vars?: Record<string, string | number>) => {
      if (key.includes('.')) return tNested(key, DEFAULT_LOCALE, vars);
      if (vars) return tfFlat(key as TranslationKey, DEFAULT_LOCALE, vars);
      return tFlat(key as TranslationKey, DEFAULT_LOCALE);
    }) as TranslateFn;
    return {
      language: DEFAULT_LOCALE,
      locale: DEFAULT_LOCALE,
      setLanguage: () => {},
      setLocale: () => {},
      t: fallbackT,
    };
  }
  return ctx;
}

/** Backward-compatible alias used across admin / planner. */
export const useLocale = useLanguage;

export { LOCALE_META, SUPPORTED_LOCALES, DICTIONARIES };
export type { LocaleCode, NestedKey };

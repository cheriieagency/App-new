'use client';

/**
 * Compatibility shim — prefer `@/lib/i18n` LanguageProvider / useLanguage.
 * Keeps existing LocaleProvider imports working across the app.
 */

export {
  LanguageProvider as LocaleProvider,
  useLanguage,
  useLocale,
} from '@/lib/i18n/LanguageContext';

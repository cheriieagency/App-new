/**
 * clikd: i18n public API.
 * - Nested: useLanguage().t('nav.features')
 * - Flat (legacy): t('navFeatures', locale)
 */

export {
  DICTIONARIES,
  DICT_EN,
  DICT_SV,
  DICT_NO,
  DICT_DA,
  DICT_FI,
  LOCALE_META,
  SUPPORTED_LOCALES,
  tNested,
  type LocaleCode,
  type NestedDict,
  type NestedKey,
} from './dictionaries';

export {
  LanguageProvider,
  useLanguage,
  useLocale,
} from './LanguageContext';

export {
  t,
  tf,
  localeTag,
  LOCALES,
  DEFAULT_LOCALE,
  type Locale,
  type TranslationKey,
} from './flat-core';

import {
  applyBioPreset,
  BIO_FONTS,
  BIO_THEME_PRESETS,
  getBioFontFamily,
  getBioGoogleFontsHref,
  type BioTheme,
  type BioThemePreset,
} from '@/lib/bio-theme';

/** Luxury Design Studio presets (admin Bio Builder Design tab). */
export type LaterThemePreset = BioThemePreset;

export const LATER_BIO_FONTS = BIO_FONTS;

export const LATER_THEME_PRESETS: LaterThemePreset[] = BIO_THEME_PRESETS;

export function applyLaterPreset(presetId: string): BioTheme {
  return applyBioPreset(presetId);
}

export function getLaterFontFamily(fontId: string): string {
  return getBioFontFamily(fontId);
}

export function getLaterGoogleFontsHref(fontId: string): string | null {
  return getBioGoogleFontsHref(fontId);
}

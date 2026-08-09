import type { BioTheme } from '@/lib/bio-theme';

/** Later.com-inspired bio theme presets (admin Bio Builder Design tab). */
export type LaterThemePreset = BioTheme & {
  label: string;
  desc: string;
};

export const LATER_BIO_FONTS = [
  {
    id: 'courier',
    label: 'Courier Prime',
    family: '"Courier Prime", ui-monospace, monospace',
    google: 'Courier+Prime:wght@400;700',
  },
  {
    id: 'roboto',
    label: 'Roboto',
    family: '"Roboto", ui-sans-serif, sans-serif',
    google: 'Roboto:wght@400;500;700',
  },
  {
    id: 'jakarta',
    label: 'Plus Jakarta Sans',
    family: '"Plus Jakarta Sans", ui-sans-serif, sans-serif',
    google: 'Plus+Jakarta+Sans:wght@400;600;700;800',
  },
  {
    id: 'inter',
    label: 'Inter',
    family: '"Inter", ui-sans-serif, sans-serif',
    google: 'Inter:wght@400;500;600;700',
  },
] as const;

export const LATER_THEME_PRESETS: LaterThemePreset[] = [
  {
    presetId: 'custom',
    label: 'Custom',
    desc: 'Your manual colors',
    bg: '#FFFFFF',
    accent: '#080808',
    buttonBg: '#080808',
    buttonText: '#FFFFFF',
    buttonBorder: '#080808',
    nameColor: '#080808',
    mutedColor: '#6B7280',
    fontId: 'inter',
    buttonStyle: 'filled',
    buttonRadius: 'rounded',
    buttonShadow: 'soft',
  },
  {
    presetId: 'light',
    label: 'Light',
    desc: 'Clean white canvas',
    bg: '#FFFFFF',
    accent: '#111827',
    buttonBg: '#111827',
    buttonText: '#FFFFFF',
    buttonBorder: '#111827',
    nameColor: '#111827',
    mutedColor: '#6B7280',
    fontId: 'inter',
    buttonStyle: 'filled',
    buttonRadius: 'rounded',
    buttonShadow: 'none',
  },
  {
    presetId: 'dark',
    label: 'Dark',
    desc: 'Midnight slate',
    bg: '#0B0F14',
    accent: '#F8FAFC',
    buttonBg: '#1E293B',
    buttonText: '#F8FAFC',
    buttonBorder: '#334155',
    nameColor: '#F8FAFC',
    mutedColor: '#94A3B8',
    fontId: 'jakarta',
    buttonStyle: 'soft',
    buttonRadius: 'rounded',
    buttonShadow: 'none',
  },
  {
    presetId: 'sherbet',
    label: 'Sherbet',
    desc: 'Soft pastel pops',
    bg: '#FFF5F7',
    accent: '#F472B6',
    buttonBg: '#F9A8D4',
    buttonText: '#831843',
    buttonBorder: '#F9A8D4',
    nameColor: '#831843',
    mutedColor: '#9D174D',
    fontId: 'jakarta',
    buttonStyle: 'filled',
    buttonRadius: 'pill',
    buttonShadow: 'soft',
  },
  {
    presetId: 'papaya',
    label: 'Papaya',
    desc: 'Warm citrus glow',
    bg: '#FFF7ED',
    accent: '#EA580C',
    buttonBg: '#FB923C',
    buttonText: '#FFFFFF',
    buttonBorder: '#FB923C',
    nameColor: '#9A3412',
    mutedColor: '#C2410C',
    fontId: 'roboto',
    buttonStyle: 'filled',
    buttonRadius: 'rounded',
    buttonShadow: 'soft',
  },
  {
    presetId: 'matrix',
    label: 'Matrix',
    desc: 'Neon terminal',
    bg: '#020617',
    accent: '#22C55E',
    buttonBg: '#052e16',
    buttonText: '#4ADE80',
    buttonBorder: '#16A34A',
    nameColor: '#86EFAC',
    mutedColor: '#4ADE80',
    fontId: 'courier',
    buttonStyle: 'outline',
    buttonRadius: 'sharp',
    buttonShadow: 'none',
  },
  {
    presetId: 'celestial',
    label: 'Celestial',
    desc: 'Deep indigo night',
    bg: '#0F172A',
    accent: '#A78BFA',
    buttonBg: '#4C1D95',
    buttonText: '#F5F3FF',
    buttonBorder: '#7C3AED',
    nameColor: '#EDE9FE',
    mutedColor: '#C4B5FD',
    fontId: 'jakarta',
    buttonStyle: 'soft',
    buttonRadius: 'pill',
    buttonShadow: 'soft',
  },
  {
    presetId: 'dewdrop',
    label: 'Dewdrop',
    desc: 'Fresh mint air',
    bg: '#F0FDFA',
    accent: '#0F766E',
    buttonBg: '#14B8A6',
    buttonText: '#FFFFFF',
    buttonBorder: '#14B8A6',
    nameColor: '#134E4A',
    mutedColor: '#0F766E',
    fontId: 'inter',
    buttonStyle: 'filled',
    buttonRadius: 'rounded',
    buttonShadow: 'soft',
  },
];

export function applyLaterPreset(presetId: string): BioTheme {
  const found = LATER_THEME_PRESETS.find((p) => p.presetId === presetId);
  if (!found) return LATER_THEME_PRESETS[0];
  const { label: _l, desc: _d, ...theme } = found;
  return theme;
}

export function getLaterFontFamily(fontId: string): string {
  const font = LATER_BIO_FONTS.find((f) => f.id === fontId);
  return font?.family ?? LATER_BIO_FONTS[3].family;
}

export function getLaterGoogleFontsHref(fontId: string): string | null {
  const font = LATER_BIO_FONTS.find((f) => f.id === fontId);
  if (!font?.google) return null;
  return `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`;
}

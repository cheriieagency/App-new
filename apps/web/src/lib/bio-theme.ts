/** Bio page theme presets + custom style model for Bio Builder. */

export type BioButtonStyle = 'filled' | 'soft' | 'outline';
export type BioButtonRadius = 'sharp' | 'rounded' | 'pill';
export type BioButtonShadow = 'none' | 'soft' | 'strong';

export type BioTheme = {
  presetId: string;
  bg: string;
  accent: string;
  buttonBg: string;
  buttonText: string;
  buttonBorder: string;
  nameColor: string;
  mutedColor: string;
  fontId: string;
  buttonStyle: BioButtonStyle;
  buttonRadius: BioButtonRadius;
  buttonShadow: BioButtonShadow;
};

export const BIO_FONTS = [
  {
    id: 'system',
    label: 'System',
    family: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
    google: null as string | null,
  },
  {
    id: 'dm',
    label: 'DM Sans',
    family: '"DM Sans", ui-sans-serif, sans-serif',
    google: 'DM+Sans:wght@400;600;700;800',
  },
  {
    id: 'space',
    label: 'Space Grotesk',
    family: '"Space Grotesk", ui-sans-serif, sans-serif',
    google: 'Space+Grotesk:wght@400;600;700',
  },
  {
    id: 'syne',
    label: 'Syne',
    family: '"Syne", ui-sans-serif, sans-serif',
    google: 'Syne:wght@500;700;800',
  },
  {
    id: 'playfair',
    label: 'Playfair Display',
    family: '"Playfair Display", Georgia, serif',
    google: 'Playfair+Display:wght@500;700;800',
  },
  {
    id: 'libre',
    label: 'Libre Baskerville',
    family: '"Libre Baskerville", Georgia, serif',
    google: 'Libre+Baskerville:wght@400;700',
  },
  {
    id: 'jetbrains',
    label: 'JetBrains Mono',
    family: '"JetBrains Mono", ui-monospace, monospace',
    google: 'JetBrains+Mono:wght@400;600;700',
  },
] as const;

export const DEFAULT_BIO_THEME: BioTheme = {
  presetId: 'nordic',
  bg: '#FAFAFA',
  accent: '#111827',
  buttonBg: '#111827',
  buttonText: '#FFFFFF',
  buttonBorder: '#111827',
  nameColor: '#111827',
  mutedColor: '#71717A',
  fontId: 'dm',
  buttonStyle: 'filled',
  buttonRadius: 'rounded',
  buttonShadow: 'soft',
};

export const BIO_THEME_PRESETS: (BioTheme & { label: string; desc: string })[] = [
  {
    ...DEFAULT_BIO_THEME,
    presetId: 'nordic',
    label: 'Nordic Minimal',
    desc: 'Ren och minimalistisk',
  },
  {
    presetId: 'dark',
    label: 'Dark Slate',
    desc: 'Djupt och modern',
    bg: '#0F172A',
    accent: '#818CF8',
    buttonBg: '#1E293B',
    buttonText: '#F8FAFC',
    buttonBorder: '#334155',
    nameColor: '#F8FAFC',
    mutedColor: '#94A3B8',
    fontId: 'space',
    buttonStyle: 'soft',
    buttonRadius: 'rounded',
    buttonShadow: 'none',
  },
  {
    presetId: 'coral',
    label: 'Coral Pop',
    desc: 'Varm och energisk',
    bg: '#FFF7F5',
    accent: '#9b8afb',
    buttonBg: '#9b8afb',
    buttonText: '#FFFFFF',
    buttonBorder: '#9b8afb',
    nameColor: '#2c3340',
    mutedColor: '#8B7355',
    fontId: 'syne',
    buttonStyle: 'filled',
    buttonRadius: 'pill',
    buttonShadow: 'soft',
  },
  {
    presetId: 'forest',
    label: 'Forest Green',
    desc: 'Naturlig och lugn',
    bg: '#F0FDF4',
    accent: '#15803D',
    buttonBg: '#166534',
    buttonText: '#FFFFFF',
    buttonBorder: '#166534',
    nameColor: '#14532D',
    mutedColor: '#6B7280',
    fontId: 'dm',
    buttonStyle: 'filled',
    buttonRadius: 'rounded',
    buttonShadow: 'soft',
  },
  {
    presetId: 'editorial',
    label: 'Editorial',
    desc: 'Serif och tidskriftskänsla',
    bg: '#F7F4EF',
    accent: '#1C1917',
    buttonBg: '#1C1917',
    buttonText: '#FAFAF9',
    buttonBorder: '#1C1917',
    nameColor: '#1C1917',
    mutedColor: '#78716C',
    fontId: 'playfair',
    buttonStyle: 'outline',
    buttonRadius: 'sharp',
    buttonShadow: 'none',
  },
  {
    presetId: 'mono',
    label: 'Mono Tech',
    desc: 'Teknisk och tydlig',
    bg: '#F4F4F5',
    accent: '#18181B',
    buttonBg: '#18181B',
    buttonText: '#FAFAFA',
    buttonBorder: '#18181B',
    nameColor: '#18181B',
    mutedColor: '#71717A',
    fontId: 'jetbrains',
    buttonStyle: 'filled',
    buttonRadius: 'sharp',
    buttonShadow: 'none',
  },
];

export function getBioFontFamily(fontId: string): string {
  return BIO_FONTS.find((f) => f.id === fontId)?.family ?? BIO_FONTS[0].family;
}

export function getBioGoogleFontsHref(fontId: string): string | null {
  const font = BIO_FONTS.find((f) => f.id === fontId);
  if (!font?.google) return null;
  return `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`;
}

export function buttonRadiusPx(radius: BioButtonRadius): number {
  if (radius === 'sharp') return 8;
  if (radius === 'pill') return 999;
  return 14;
}

export function buttonShadowCss(shadow: BioButtonShadow): string {
  if (shadow === 'soft') return '0 4px 14px rgba(0,0,0,0.08)';
  if (shadow === 'strong') return '0 8px 24px rgba(0,0,0,0.16)';
  return 'none';
}

export function normalizeBioTheme(raw?: Partial<BioTheme> | null): BioTheme {
  const base = DEFAULT_BIO_THEME;
  if (!raw || typeof raw !== 'object') return { ...base };
  return {
    presetId: typeof raw.presetId === 'string' ? raw.presetId : 'custom',
    bg: typeof raw.bg === 'string' ? raw.bg : base.bg,
    accent: typeof raw.accent === 'string' ? raw.accent : base.accent,
    buttonBg: typeof raw.buttonBg === 'string' ? raw.buttonBg : base.buttonBg,
    buttonText: typeof raw.buttonText === 'string' ? raw.buttonText : base.buttonText,
    buttonBorder: typeof raw.buttonBorder === 'string' ? raw.buttonBorder : base.buttonBorder,
    nameColor: typeof raw.nameColor === 'string' ? raw.nameColor : base.nameColor,
    mutedColor: typeof raw.mutedColor === 'string' ? raw.mutedColor : base.mutedColor,
    fontId: typeof raw.fontId === 'string' ? raw.fontId : base.fontId,
    buttonStyle:
      raw.buttonStyle === 'soft' || raw.buttonStyle === 'outline' || raw.buttonStyle === 'filled'
        ? raw.buttonStyle
        : base.buttonStyle,
    buttonRadius:
      raw.buttonRadius === 'sharp' ||
      raw.buttonRadius === 'pill' ||
      raw.buttonRadius === 'rounded'
        ? raw.buttonRadius
        : base.buttonRadius,
    buttonShadow:
      raw.buttonShadow === 'soft' ||
      raw.buttonShadow === 'strong' ||
      raw.buttonShadow === 'none'
        ? raw.buttonShadow
        : base.buttonShadow,
  };
}

export function applyBioPreset(presetId: string): BioTheme {
  const preset = BIO_THEME_PRESETS.find((p) => p.presetId === presetId);
  if (!preset) return { ...DEFAULT_BIO_THEME, presetId: 'custom' };
  const { label: _l, desc: _d, ...theme } = preset;
  return { ...theme };
}

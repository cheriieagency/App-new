/** Bio page theme presets + luxury Design Studio model for Bio Builder. */

import type { CSSProperties } from 'react';

export type BioButtonStyle = 'filled' | 'soft' | 'outline';
export type BioButtonRadius = 'sharp' | 'rounded' | 'pill';
export type BioButtonShadow = 'none' | 'soft' | 'strong';
export type BioBgType = 'solid' | 'mesh' | 'image' | 'liquid';
export type BioAvatarShape = 'circle' | 'squircle';
export type BioSocialLayout = 'header' | 'dock';
export type BioBlockVariant = 'frosted' | 'solid' | 'luxe' | 'minimal';
export type BioHoverEffect = 'lift' | 'shimmer' | 'scale';

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
  /** Canvas background engine */
  bgType: BioBgType;
  bgImageUrl: string | null;
  /** Optional HD cover above avatar */
  coverEnabled: boolean;
  coverImageUrl: string | null;
  avatarShape: BioAvatarShape;
  verifiedBadge: boolean;
  socialLayout: BioSocialLayout;
  blockVariant: BioBlockVariant;
  hoverEffect: BioHoverEffect;
};

export const BIO_FONTS = [
  {
    id: 'jakarta',
    label: 'Plus Jakarta Sans',
    family: '"Plus Jakarta Sans", ui-sans-serif, sans-serif',
    google: 'Plus+Jakarta+Sans:wght@400;600;700;800',
  },
  {
    id: 'playfair',
    label: 'Playfair Display',
    family: '"Playfair Display", Georgia, serif',
    google: 'Playfair+Display:wght@500;700;800',
  },
  {
    id: 'space',
    label: 'Space Grotesk',
    family: '"Space Grotesk", ui-sans-serif, sans-serif',
    google: 'Space+Grotesk:wght@400;600;700',
  },
  {
    id: 'inter',
    label: 'Inter',
    family: '"Inter", ui-sans-serif, sans-serif',
    google: 'Inter:wght@400;500;600;700',
  },
] as const;

const LUXURY_DEFAULTS = {
  bgType: 'solid' as BioBgType,
  bgImageUrl: null as string | null,
  coverEnabled: false,
  coverImageUrl: null as string | null,
  avatarShape: 'circle' as BioAvatarShape,
  verifiedBadge: false,
  socialLayout: 'header' as BioSocialLayout,
  blockVariant: 'solid' as BioBlockVariant,
  hoverEffect: 'lift' as BioHoverEffect,
};

export const DEFAULT_BIO_THEME: BioTheme = {
  presetId: 'nordic-minimal',
  bg: '#FAFAFA',
  accent: '#0F172A',
  buttonBg: '#0F172A',
  buttonText: '#FFFFFF',
  buttonBorder: '#0F172A',
  nameColor: '#0F172A',
  mutedColor: '#64748B',
  fontId: 'jakarta',
  buttonStyle: 'filled',
  buttonRadius: 'rounded',
  buttonShadow: 'soft',
  ...LUXURY_DEFAULTS,
  blockVariant: 'solid',
};

export type BioThemePreset = BioTheme & {
  label: string;
  desc: string;
  /** Mini swatch for the preset picker */
  swatch: { from: string; via?: string; to: string };
};

export const BIO_THEME_PRESETS: BioThemePreset[] = [
  {
    presetId: 'midnight-glass',
    label: 'Midnight Glass',
    desc: 'Dark mesh + frosted glass',
    swatch: { from: '#0B0F17', via: '#1E1B4B', to: '#0F172A' },
    bg: '#0B0F17',
    accent: '#A5B4FC',
    buttonBg: 'rgba(255,255,255,0.10)',
    buttonText: '#FFFFFF',
    buttonBorder: 'rgba(255,255,255,0.20)',
    nameColor: '#F8FAFC',
    mutedColor: '#94A3B8',
    fontId: 'jakarta',
    buttonStyle: 'soft',
    buttonRadius: 'rounded',
    buttonShadow: 'soft',
    bgType: 'mesh',
    bgImageUrl: null,
    coverEnabled: true,
    coverImageUrl:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
    avatarShape: 'circle',
    verifiedBadge: true,
    socialLayout: 'header',
    blockVariant: 'frosted',
    hoverEffect: 'lift',
  },
  {
    presetId: 'champagne-luxe',
    label: 'Champagne Luxe',
    desc: 'Warm silk + gold accents',
    swatch: { from: '#FDFBF7', via: '#F5E6C8', to: '#E8D5A3' },
    bg: '#FDFBF7',
    accent: '#B8860B',
    buttonBg: '#FFFFFF',
    buttonText: '#1C1917',
    buttonBorder: '#E7E5E4',
    nameColor: '#1C1917',
    mutedColor: '#78716C',
    fontId: 'playfair',
    buttonStyle: 'filled',
    buttonRadius: 'rounded',
    buttonShadow: 'soft',
    bgType: 'solid',
    bgImageUrl: null,
    coverEnabled: false,
    coverImageUrl: null,
    avatarShape: 'squircle',
    verifiedBadge: true,
    socialLayout: 'header',
    blockVariant: 'luxe',
    hoverEffect: 'lift',
  },
  {
    presetId: 'aurora-glow',
    label: 'Aurora Glow',
    desc: 'Indigo / purple glow',
    swatch: { from: '#312E81', via: '#7C3AED', to: '#DB2777' },
    bg: '#1E1B4B',
    accent: '#C4B5FD',
    buttonBg: '#4C1D95',
    buttonText: '#F5F3FF',
    buttonBorder: '#7C3AED',
    nameColor: '#F5F3FF',
    mutedColor: '#C4B5FD',
    fontId: 'space',
    buttonStyle: 'filled',
    buttonRadius: 'pill',
    buttonShadow: 'strong',
    bgType: 'liquid',
    bgImageUrl: null,
    coverEnabled: true,
    coverImageUrl:
      'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=800&q=80',
    avatarShape: 'circle',
    verifiedBadge: true,
    socialLayout: 'dock',
    blockVariant: 'frosted',
    hoverEffect: 'shimmer',
  },
  {
    presetId: 'nordic-minimal',
    label: 'Nordic Minimal',
    desc: 'Clean white + crisp dark',
    swatch: { from: '#FAFAFA', via: '#E2E8F0', to: '#0F172A' },
    bg: '#FAFAFA',
    accent: '#0F172A',
    buttonBg: '#0F172A',
    buttonText: '#FFFFFF',
    buttonBorder: '#0F172A',
    nameColor: '#0F172A',
    mutedColor: '#64748B',
    fontId: 'inter',
    buttonStyle: 'filled',
    buttonRadius: 'rounded',
    buttonShadow: 'none',
    bgType: 'solid',
    bgImageUrl: null,
    coverEnabled: false,
    coverImageUrl: null,
    avatarShape: 'circle',
    verifiedBadge: false,
    socialLayout: 'header',
    blockVariant: 'solid',
    hoverEffect: 'scale',
  },
  {
    presetId: 'arctic-mist',
    label: 'Arctic Mist',
    desc: 'Icy slate + frosted winter air',
    swatch: { from: '#E8F1F8', via: '#A8C5D8', to: '#1E3A4C' },
    bg: '#E8F1F8',
    accent: '#0E7490',
    buttonBg: '#FFFFFF',
    buttonText: '#0F172A',
    buttonBorder: '#B6D0DE',
    nameColor: '#0F172A',
    mutedColor: '#475569',
    fontId: 'jakarta',
    buttonStyle: 'soft',
    buttonRadius: 'rounded',
    buttonShadow: 'soft',
    bgType: 'solid',
    bgImageUrl: null,
    coverEnabled: true,
    coverImageUrl:
      'https://images.unsplash.com/photo-1491002052546-bf14fd745f99?w=800&q=80',
    avatarShape: 'circle',
    verifiedBadge: true,
    socialLayout: 'header',
    blockVariant: 'luxe',
    hoverEffect: 'lift',
  },
  {
    presetId: 'emerald-vault',
    label: 'Emerald Vault',
    desc: 'Deep forest + jewel accents',
    swatch: { from: '#052E1F', via: '#065F46', to: '#D4AF37' },
    bg: '#052E1F',
    accent: '#6EE7B7',
    buttonBg: 'rgba(255,255,255,0.08)',
    buttonText: '#ECFDF5',
    buttonBorder: 'rgba(110,231,183,0.28)',
    nameColor: '#ECFDF5',
    mutedColor: '#A7F3D0',
    fontId: 'playfair',
    buttonStyle: 'soft',
    buttonRadius: 'rounded',
    buttonShadow: 'strong',
    bgType: 'mesh',
    bgImageUrl: null,
    coverEnabled: true,
    coverImageUrl:
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80',
    avatarShape: 'squircle',
    verifiedBadge: true,
    socialLayout: 'header',
    blockVariant: 'frosted',
    hoverEffect: 'lift',
  },
  {
    presetId: 'coral-pulse',
    label: 'Coral Pulse',
    desc: 'Warm rose energy for CTAs',
    swatch: { from: '#FFF1F2', via: '#FB7185', to: '#BE123C' },
    bg: '#FFF1F2',
    accent: '#E11D48',
    buttonBg: '#FFFFFF',
    buttonText: '#881337',
    buttonBorder: '#FECDD3',
    nameColor: '#881337',
    mutedColor: '#9F1239',
    fontId: 'jakarta',
    buttonStyle: 'filled',
    buttonRadius: 'pill',
    buttonShadow: 'soft',
    bgType: 'solid',
    bgImageUrl: null,
    coverEnabled: true,
    coverImageUrl:
      'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80',
    avatarShape: 'circle',
    verifiedBadge: true,
    socialLayout: 'header',
    blockVariant: 'luxe',
    hoverEffect: 'scale',
  },
  {
    presetId: 'noir-cinema',
    label: 'Noir Cinema',
    desc: 'Cinematic black + amber light',
    swatch: { from: '#09090B', via: '#27272A', to: '#F59E0B' },
    bg: '#09090B',
    accent: '#FBBF24',
    buttonBg: 'rgba(255,255,255,0.06)',
    buttonText: '#FAFAFA',
    buttonBorder: 'rgba(251,191,36,0.35)',
    nameColor: '#FAFAFA',
    mutedColor: '#A1A1AA',
    fontId: 'space',
    buttonStyle: 'outline',
    buttonRadius: 'sharp',
    buttonShadow: 'none',
    bgType: 'image',
    bgImageUrl:
      'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1200&q=80',
    coverEnabled: true,
    coverImageUrl:
      'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&q=80',
    avatarShape: 'circle',
    verifiedBadge: true,
    socialLayout: 'dock',
    blockVariant: 'minimal',
    hoverEffect: 'shimmer',
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
  if (radius === 'sharp') return 0; // rounded-none
  if (radius === 'pill') return 999; // rounded-full
  return 16; // rounded-2xl
}

export function buttonShadowCss(shadow: BioButtonShadow): string {
  if (shadow === 'soft') return '0 4px 14px rgba(0,0,0,0.08)';
  if (shadow === 'strong') return '0 8px 24px rgba(0,0,0,0.16)';
  return 'none';
}

export function hoverEffectClass(effect: BioHoverEffect): string {
  if (effect === 'scale') return 'transition-transform duration-200 hover:scale-[1.03]';
  if (effect === 'shimmer')
    return 'bio-block-shimmer transition-shadow duration-300 hover:shadow-lg';
  return 'transition-all duration-200 hover:-translate-y-1 hover:shadow-lg';
}

/** Frosted glass link cards — driven only by blockVariant, not canvas type. */
export function usesFrostedBlocks(theme: BioTheme): boolean {
  return theme.blockVariant === 'frosted';
}

/** True when canvas uses mesh / liquid dark treatments (preview chrome). */
export function usesGlassCanvas(theme: BioTheme): boolean {
  return theme.bgType === 'mesh' || theme.bgType === 'liquid';
}

/** Inline styles for bio link / store block surfaces from the active theme. */
export function bioBlockSurfaceStyle(theme: BioTheme): CSSProperties {
  const radius = buttonRadiusPx(theme.buttonRadius);
  const variant = theme.blockVariant || 'solid';

  if (variant === 'frosted') {
    return {
      background: theme.buttonBg || 'rgba(255,255,255,0.10)',
      color: theme.buttonText || '#FFFFFF',
      border: `1px solid ${theme.buttonBorder || 'rgba(255,255,255,0.20)'}`,
      borderRadius: radius,
      boxShadow: buttonShadowCss(theme.buttonShadow),
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    };
  }

  if (variant === 'luxe') {
    return {
      background: theme.buttonBg?.startsWith('#') ? theme.buttonBg : '#FFFFFF',
      color: theme.buttonText || '#1C1917',
      border: `1px solid ${theme.buttonBorder || '#E7E5E4'}`,
      borderRadius: radius,
      boxShadow: '0 1px 2px rgba(15,23,42,0.06)',
    };
  }

  if (variant === 'minimal') {
    return {
      background: 'transparent',
      color: theme.nameColor || theme.buttonText,
      border: `1.5px solid ${theme.buttonBorder || 'currentColor'}`,
      borderRadius: radius,
      boxShadow: 'none',
    };
  }

  // solid (+ outline/filled buttonStyle)
  if (theme.buttonStyle === 'outline') {
    return {
      background: 'transparent',
      color: theme.buttonText || theme.nameColor,
      border: `1.5px solid ${theme.buttonBorder || theme.buttonBg}`,
      borderRadius: radius,
      boxShadow: 'none',
    };
  }

  return {
    background: theme.buttonBg || theme.accent || '#0F172A',
    color: theme.buttonText || '#FFFFFF',
    border: '1px solid transparent',
    borderRadius: radius,
    boxShadow: buttonShadowCss(theme.buttonShadow),
  };
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
    bgType:
      raw.bgType === 'mesh' ||
      raw.bgType === 'image' ||
      raw.bgType === 'liquid' ||
      raw.bgType === 'solid'
        ? raw.bgType
        : base.bgType,
    bgImageUrl: typeof raw.bgImageUrl === 'string' ? raw.bgImageUrl : base.bgImageUrl,
    coverEnabled: typeof raw.coverEnabled === 'boolean' ? raw.coverEnabled : base.coverEnabled,
    coverImageUrl:
      typeof raw.coverImageUrl === 'string' ? raw.coverImageUrl : base.coverImageUrl,
    avatarShape: raw.avatarShape === 'squircle' ? 'squircle' : 'circle',
    verifiedBadge: Boolean(raw.verifiedBadge),
    socialLayout: raw.socialLayout === 'dock' ? 'dock' : 'header',
    blockVariant:
      raw.blockVariant === 'frosted' ||
      raw.blockVariant === 'luxe' ||
      raw.blockVariant === 'minimal' ||
      raw.blockVariant === 'solid'
        ? raw.blockVariant
        : base.blockVariant,
    hoverEffect:
      raw.hoverEffect === 'shimmer' ||
      raw.hoverEffect === 'scale' ||
      raw.hoverEffect === 'lift'
        ? raw.hoverEffect
        : base.hoverEffect,
  };
}

export function applyBioPreset(presetId: string): BioTheme {
  const preset = BIO_THEME_PRESETS.find((p) => p.presetId === presetId);
  if (!preset) return { ...DEFAULT_BIO_THEME, presetId: 'custom' };
  const { label: _l, desc: _d, swatch: _s, ...theme } = preset;
  return { ...theme };
}

/** Canvas background CSS for phone preview / live page. */
export function bioCanvasStyle(theme: BioTheme): CSSProperties {
  if (theme.bgType === 'image' && theme.bgImageUrl) {
    return {
      backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.45), rgba(15,23,42,0.55)), url(${theme.bgImageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  if (theme.bgType === 'mesh') {
    return {
      backgroundColor: theme.bg || '#0B0F17',
      backgroundImage: `
        radial-gradient(at 18% 18%, ${theme.accent}66 0px, transparent 48%),
        radial-gradient(at 82% 12%, #6366f166 0px, transparent 42%),
        radial-gradient(at 48% 78%, #7c3aed55 0px, transparent 46%),
        radial-gradient(at 70% 55%, #0ea5e933 0px, transparent 40%)
      `,
    };
  }
  if (theme.bgType === 'liquid') {
    return {
      backgroundColor: theme.bg,
      backgroundImage: `
        radial-gradient(ellipse 80% 50% at 20% 40%, ${theme.accent}66, transparent),
        radial-gradient(ellipse 60% 40% at 80% 60%, #db277766, transparent),
        radial-gradient(ellipse 50% 30% at 50% 90%, #6366f155, transparent)
      `,
      backgroundSize: '200% 200%',
      animation: 'bio-liquid 12s ease-in-out infinite',
    };
  }
  return { backgroundColor: theme.bg };
}

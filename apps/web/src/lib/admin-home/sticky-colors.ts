/**
 * Admin Home sticky-note color presets — editorial pastels.
 */

export const STICKY_COLOR_IDS = [
  'sand',
  'sage',
  'cream',
  'clay',
  'mist',
  'blush',
  'olive',
  'stone',
] as const;

export type StickyColorId = (typeof STICKY_COLOR_IDS)[number];

export const DEFAULT_STICKY_COLOR: StickyColorId = 'cream';

export type StickyColorTheme = {
  id: StickyColorId;
  /** Soft post-it fill */
  bg: string;
  /** Border matching the fill */
  border: string;
  /** Soft hover wash for todo rows */
  rowHover: string;
  /** Checkbox idle border */
  checkBorder: string;
  /** Date chip border */
  chipBorder: string;
};

export const STICKY_COLOR_THEMES: Record<StickyColorId, StickyColorTheme> = {
  sand: {
    id: 'sand',
    bg: '#F5F2EB',
    border: '#E6E3DB',
    rowHover: 'rgba(230, 227, 219, 0.55)',
    checkBorder: '#D5D0C6',
    chipBorder: '#E6E3DB',
  },
  sage: {
    id: 'sage',
    bg: '#EEF1EC',
    border: '#D5DDD4',
    rowHover: 'rgba(213, 221, 212, 0.55)',
    checkBorder: '#B7C4B5',
    chipBorder: '#D5DDD4',
  },
  cream: {
    id: 'cream',
    bg: '#FAF7F0',
    border: '#E6E3DB',
    rowHover: 'rgba(230, 227, 219, 0.6)',
    checkBorder: '#D5D0C6',
    chipBorder: '#E6E3DB',
  },
  clay: {
    id: 'clay',
    bg: '#F7EEE8',
    border: '#E8D5C8',
    rowHover: 'rgba(232, 213, 200, 0.55)',
    checkBorder: '#D4B5A0',
    chipBorder: '#E8D5C8',
  },
  mist: {
    id: 'mist',
    bg: '#F3F2EF',
    border: '#E6E3DB',
    rowHover: 'rgba(240, 239, 234, 0.8)',
    checkBorder: '#D5D0C6',
    chipBorder: '#E6E3DB',
  },
  blush: {
    id: 'blush',
    bg: '#F8F1EE',
    border: '#E8D6CF',
    rowHover: 'rgba(232, 214, 207, 0.55)',
    checkBorder: '#D4B8AE',
    chipBorder: '#E8D6CF',
  },
  olive: {
    id: 'olive',
    bg: '#F1F3EE',
    border: '#D8DED3',
    rowHover: 'rgba(216, 222, 211, 0.55)',
    checkBorder: '#B8C4B0',
    chipBorder: '#D8DED3',
  },
  stone: {
    id: 'stone',
    bg: '#F4F3F0',
    border: '#E6E3DB',
    rowHover: 'rgba(240, 239, 234, 0.9)',
    checkBorder: '#D5D0C6',
    chipBorder: '#E6E3DB',
  },
};

/** Legacy ids mapped into the editorial palette. */
const LEGACY_STICKY_MAP: Record<string, StickyColorId> = {
  lilac: 'mist',
  pink: 'blush',
  mint: 'sage',
  sky: 'mist',
  butter: 'cream',
  peach: 'clay',
  rose: 'blush',
  slate: 'stone',
};

export function isStickyColorId(value: string): value is StickyColorId {
  return (STICKY_COLOR_IDS as readonly string[]).includes(value);
}

export function normalizeStickyColor(
  raw: unknown,
  fallback: StickyColorId = DEFAULT_STICKY_COLOR
): StickyColorId {
  const key = typeof raw === 'string' ? raw.trim() : '';
  if (isStickyColorId(key)) return key;
  if (key in LEGACY_STICKY_MAP) return LEGACY_STICKY_MAP[key];
  return fallback;
}

export function stickyTheme(
  id: StickyColorId | string | null | undefined
): StickyColorTheme {
  return STICKY_COLOR_THEMES[normalizeStickyColor(id)];
}

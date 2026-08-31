/**
 * Admin Home sticky-note background color presets.
 */

export const STICKY_COLOR_IDS = [
  'lilac',
  'pink',
  'mint',
  'sky',
  'butter',
  'peach',
  'rose',
  'slate',
] as const;

export type StickyColorId = (typeof STICKY_COLOR_IDS)[number];

export const DEFAULT_STICKY_COLOR: StickyColorId = 'lilac';

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
  lilac: {
    id: 'lilac',
    bg: '#F8F4FF',
    border: '#EDE4FF',
    rowHover: 'rgba(239, 232, 255, 0.7)',
    checkBorder: '#D4C4F7',
    chipBorder: '#EDE4FF',
  },
  pink: {
    id: 'pink',
    bg: '#FDF2F8',
    border: '#FBCFE8',
    rowHover: 'rgba(252, 231, 243, 0.8)',
    checkBorder: '#F9A8D4',
    chipBorder: '#FBCFE8',
  },
  mint: {
    id: 'mint',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    rowHover: 'rgba(209, 250, 229, 0.7)',
    checkBorder: '#6EE7B7',
    chipBorder: '#A7F3D0',
  },
  sky: {
    id: 'sky',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    rowHover: 'rgba(219, 234, 254, 0.8)',
    checkBorder: '#93C5FD',
    chipBorder: '#BFDBFE',
  },
  butter: {
    id: 'butter',
    bg: '#FFFBEB',
    border: '#FDE68A',
    rowHover: 'rgba(254, 243, 199, 0.8)',
    checkBorder: '#FCD34D',
    chipBorder: '#FDE68A',
  },
  peach: {
    id: 'peach',
    bg: '#FFF7ED',
    border: '#FED7AA',
    rowHover: 'rgba(255, 237, 213, 0.85)',
    checkBorder: '#FDBA74',
    chipBorder: '#FED7AA',
  },
  rose: {
    id: 'rose',
    bg: '#FFF1F2',
    border: '#FECDD3',
    rowHover: 'rgba(255, 228, 230, 0.85)',
    checkBorder: '#FDA4AF',
    chipBorder: '#FECDD3',
  },
  slate: {
    id: 'slate',
    bg: '#F8FAFC',
    border: '#E2E8F0',
    rowHover: 'rgba(241, 245, 249, 0.9)',
    checkBorder: '#CBD5E1',
    chipBorder: '#E2E8F0',
  },
};

export function isStickyColorId(value: string): value is StickyColorId {
  return (STICKY_COLOR_IDS as readonly string[]).includes(value);
}

export function normalizeStickyColor(
  raw: unknown,
  fallback: StickyColorId = DEFAULT_STICKY_COLOR
): StickyColorId {
  const key = typeof raw === 'string' ? raw.trim() : '';
  return isStickyColorId(key) ? key : fallback;
}

export function stickyTheme(
  id: StickyColorId | string | null | undefined
): StickyColorTheme {
  return STICKY_COLOR_THEMES[normalizeStickyColor(id)];
}

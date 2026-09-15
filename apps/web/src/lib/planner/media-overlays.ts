/**
 * Text overlays for Post Studio media (carousel / image / video).
 * Positions are relative (0–1) to the media frame so they scale in Live Preview.
 */

export type MediaOverlayFontId =
  | 'classic'
  | 'modern'
  | 'typewriter'
  | 'elite'
  | 'strong'
  | 'impact'
  | 'neon'
  | 'cursive'
  | 'comic'
  | 'serif'
  | 'script'
  | 'display'
  | 'rounded'
  | 'bold'
  | 'clean'
  | 'narrow'
  | 'bubble'
  | 'sticker'
  | 'elegant'
  | 'handwritten'
  | 'mono';

export type MediaTextOverlay = {
  id: string;
  text: string;
  /** Horizontal center as 0–1 of media width. */
  x: number;
  /** Vertical center as 0–1 of media height. */
  y: number;
  /** Font size as % of media height (e.g. 6 = 6%). */
  fontSizePct: number;
  /** Text fill color (any CSS hex). */
  color: string;
  /** Instagram-style pill behind the text. */
  background: boolean;
  /** Pill / backdrop fill — independent from text color. */
  backgroundColor?: string;
  font: MediaOverlayFontId;
};

export const MEDIA_OVERLAY_FONTS: {
  id: MediaOverlayFontId;
  label: string;
  /** CSS font-family stack (Google Fonts loaded in layout). */
  family: string;
  previewClass: string;
}[] = [
  {
    id: 'classic',
    label: 'Classic',
    family: 'Inter, Roboto, system-ui, sans-serif',
    previewClass: "font-['Inter',Roboto,sans-serif]",
  },
  {
    id: 'modern',
    label: 'Modern',
    family: 'Roboto, Inter, system-ui, sans-serif',
    previewClass: "font-['Roboto',Inter,sans-serif]",
  },
  {
    id: 'clean',
    label: 'Clean',
    family: "Poppins, 'Plus Jakarta Sans', sans-serif",
    previewClass: "font-['Poppins','Plus_Jakarta_Sans',sans-serif]",
  },
  {
    id: 'rounded',
    label: 'Rounded',
    family: "'Plus Jakarta Sans', Poppins, sans-serif",
    previewClass: "font-['Plus_Jakarta_Sans',Poppins,sans-serif]",
  },
  {
    id: 'bold',
    label: 'Bold',
    family: "'Space Grotesk', Outfit, sans-serif",
    previewClass: "font-['Space_Grotesk',Outfit,sans-serif] font-semibold",
  },
  {
    id: 'display',
    label: 'Display',
    family: 'Outfit, Inter, sans-serif',
    previewClass: "font-['Outfit',Inter,sans-serif] font-semibold",
  },
  {
    id: 'strong',
    label: 'Strong',
    family: 'Anton, Oswald, Impact, sans-serif',
    previewClass: "font-['Anton',Oswald,sans-serif] uppercase tracking-wide",
  },
  {
    id: 'impact',
    label: 'Impact',
    family: 'Oswald, Anton, Impact, sans-serif',
    previewClass: "font-['Oswald',Anton,sans-serif] uppercase tracking-wide",
  },
  {
    id: 'narrow',
    label: 'Narrow',
    family: "'Barlow Condensed', Oswald, sans-serif",
    previewClass: "font-['Barlow_Condensed',Oswald,sans-serif] uppercase tracking-wider",
  },
  {
    id: 'typewriter',
    label: 'Typewriter',
    family: "'Courier Prime', 'Special Elite', ui-monospace, monospace",
    previewClass: "font-['Courier_Prime','Special_Elite',monospace]",
  },
  {
    id: 'elite',
    label: 'Elite',
    family: "'Special Elite', 'Courier Prime', monospace",
    previewClass: "font-['Special_Elite','Courier_Prime',monospace]",
  },
  {
    id: 'mono',
    label: 'Mono',
    family: "'Fira Code', ui-monospace, monospace",
    previewClass: "font-['Fira_Code',monospace]",
  },
  {
    id: 'serif',
    label: 'Serif',
    family: "'Playfair Display', Georgia, serif",
    previewClass: "font-['Playfair_Display',Georgia,serif]",
  },
  {
    id: 'elegant',
    label: 'Elegant',
    family: "'Libre Baskerville', Georgia, serif",
    previewClass: "font-['Libre_Baskerville',Georgia,serif]",
  },
  {
    id: 'neon',
    label: 'Neon',
    family: 'Caveat, Pacifico, cursive',
    previewClass: "font-['Caveat',Pacifico,cursive]",
  },
  {
    id: 'cursive',
    label: 'Cursive',
    family: 'Pacifico, Caveat, cursive',
    previewClass: "font-['Pacifico',Caveat,cursive]",
  },
  {
    id: 'script',
    label: 'Script',
    family: "'Great Vibes', 'Dancing Script', cursive",
    previewClass: "font-['Great_Vibes','Dancing_Script',cursive] text-xl",
  },
  {
    id: 'handwritten',
    label: 'Handwritten',
    family: "'Dancing Script', Caveat, cursive",
    previewClass: "font-['Dancing_Script',Caveat,cursive]",
  },
  {
    id: 'comic',
    label: 'Comic',
    family: "'Comic Neue', 'Comic Sans MS', cursive",
    previewClass: "font-['Comic_Neue',cursive]",
  },
  {
    id: 'bubble',
    label: 'Bubble',
    family: "Fredoka, 'Comic Neue', sans-serif",
    previewClass: "font-['Fredoka','Comic_Neue',sans-serif]",
  },
  {
    id: 'sticker',
    label: 'Sticker',
    family: "'Permanent Marker', Impact, sans-serif",
    previewClass: "font-['Permanent_Marker',Impact,sans-serif]",
  },
];

export const MEDIA_OVERLAY_COLORS = [
  '#FFFFFF',
  '#F9F8F6',
  '#2C2621',
  '#000000',
  '#E11D48',
  '#F472B6',
  '#2563EB',
  '#0EA5E9',
  '#16A34A',
  '#10B981',
  '#F59E0B',
  '#F97316',
  '#A855F7',
  '#7C3AED',
] as const;

/** Default pill backdrop when background is enabled. */
export const DEFAULT_OVERLAY_BG = 'rgba(44,38,33,0.72)';

export function overlayFontFamily(font: MediaOverlayFontId | string): string {
  return (
    MEDIA_OVERLAY_FONTS.find((f) => f.id === font)?.family ??
    MEDIA_OVERLAY_FONTS[0].family
  );
}

export function overlayFontClass(font: MediaOverlayFontId | string): string {
  return (
    MEDIA_OVERLAY_FONTS.find((f) => f.id === font)?.previewClass ??
    MEDIA_OVERLAY_FONTS[0].previewClass
  );
}

/** Resolve pill fill — prefers explicit backgroundColor; falls back for legacy overlays. */
export function overlayBackgroundFill(overlay: MediaTextOverlay): string {
  if (!overlay.background) return 'transparent';
  if (overlay.backgroundColor?.trim()) return overlay.backgroundColor;
  const text = (overlay.color || '#FFFFFF').toLowerCase();
  if (text === '#ffffff' || text === '#f9f8f6') return DEFAULT_OVERLAY_BG;
  return 'rgba(249,248,246,0.88)';
}

export function createTextOverlay(
  partial?: Partial<MediaTextOverlay>
): MediaTextOverlay {
  return {
    id: `ov-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    text: 'Your text',
    x: 0.5,
    y: 0.5,
    fontSizePct: 7,
    color: '#FFFFFF',
    background: true,
    backgroundColor: DEFAULT_OVERLAY_BG,
    font: 'classic',
    ...partial,
  };
}

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}

/** Normalize #rgb / #rrggbb / named values for `<input type="color">`. */
export function toColorInputValue(raw: string, fallback = '#ffffff'): string {
  const v = (raw || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    const r = v[1];
    const g = v[2];
    const b = v[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  // rgba(...) — approximate opaque hex for the wheel
  const m = v.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i
  );
  if (m) {
    const hex = (n: number) =>
      Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
    return `#${hex(+m[1])}${hex(+m[2])}${hex(+m[3])}`;
  }
  return fallback;
}

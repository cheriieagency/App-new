'use client';

import { useState, useEffect, useCallback, useRef, useId } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  BarChart3,
  Users,
  Calendar,
  ShoppingBag,
  Download,
  Plus,
  Settings,
  TrendingUp,
  Palette,
  CheckCircle2,
  LogOut,
  Sparkles,
  Copy,
  CheckCheck,
  X,
  Radio,
  Mic,
  Video,
  Activity,
  Send,
  GripVertical,
  Eye,
  EyeOff,
  Link as LinkIcon,
  Crown,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  Save,
  Trash2,
  Edit3,
  Check,
  Smartphone,
  Home,
  Camera,
  Globe as GlobeIcon,
  Bell,
  Search,
  Mail,
  MapPin,
  Monitor,
  Lock,
  UserCheck,
  ImageIcon,
  Loader2,
} from 'lucide-react';
import useHandleStreamResponse from '@/utils/useHandleStreamResponse';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import useUpload from '@/utils/useUpload';
import CommunityAdminPanel from '@/components/admin/CommunityAdminPanel';
import { getMockCommunityAdminPayload } from '@/lib/mock-community-admin';
import EmailAdminPanel from '@/components/admin/EmailAdminPanel';
import { MOCK_MANAGED_COMMUNITIES } from '@/lib/mock-community-admin';
import {
  appendUtmParams,
  buildTrackedShortUrl,
  registerDemoDestination,
  slugifyBioProduct,
  type UtmClickStat,
} from '@/lib/bio-utm';
import {
  applyBioPreset,
  BIO_FONTS,
  BIO_THEME_PRESETS,
  buttonRadiusPx,
  buttonShadowCss,
  DEFAULT_BIO_THEME,
  getBioFontFamily,
  getBioGoogleFontsHref,
  normalizeBioTheme,
  type BioTheme,
} from '@/lib/bio-theme';
import {
  SOCIAL_BRAND_ICONS,
  type SocialBrandId,
} from '@/components/icons/SocialBrandIcons';

type AdminTab =
  | 'analytics'
  | 'event'
  | 'community'
  | 'email'
  | 'broadcast'
  | 'biobuilder';

type BioCategory = 'links' | 'store';

function ThemeColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 min-w-0">
      <span className="text-[10px] font-extrabold uppercase tracking-wide text-zinc-400">
        {label}
      </span>
      <div className="flex items-center gap-2 h-11 min-h-[44px] rounded-xl border border-zinc-200 bg-zinc-50 px-2">
        <input
          type="color"
          value={/^#[0-9A-Fa-f]{6}$/.test(value) ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded-lg border-0 bg-transparent cursor-pointer flex-shrink-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 bg-transparent text-xs font-bold text-[#2c3340] focus:outline-none uppercase"
        />
      </div>
    </label>
  );
}

interface BioBlock {
  id: string;
  type:
    | 'lead_magnet'
    | 'course'
    | 'coaching'
    | 'community'
    | 'link'
    | 'divider'
    | 'store';
  /** Links = bio CTAs; Store = external products with trackable UTM links. */
  category: BioCategory;
  title: string;
  subtitle: string;
  emoji: string;
  /** Optional custom icon image; when set it overrides emoji in the preview. */
  icon_url?: string | null;
  color: string;
  visible: boolean;
  url?: string;
  /** External product URL (Store) before UTM wrapping. */
  destination_url?: string;
  /** Unique slug used in /r/{slug} tracking links. */
  utm_slug?: string;
  /** Optional list price in SEK (Links blocks). */
  price?: number | null;
  /** Optional reduced/sale price in SEK (Links blocks). */
  sale_price?: number | null;
}

function parsePriceInput(value: string): number | null {
  const cleaned = value.replace(/\s/g, '').replace(',', '.').replace(/[^\d.]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function formatSek(amount: number): string {
  return `${Math.round(amount)} SEK`;
}

function BlockPriceLabel({
  price,
  salePrice,
  className = '',
}: {
  price?: number | null;
  salePrice?: number | null;
  className?: string;
}) {
  const hasPrice = typeof price === 'number' && price >= 0;
  const hasSale =
    typeof salePrice === 'number' && salePrice >= 0 && hasPrice && salePrice < price!;
  if (!hasPrice && !hasSale) return null;
  if (hasSale) {
    return (
      <span className={`inline-flex items-baseline gap-1 ${className}`}>
        <span className="font-black">{formatSek(salePrice!)}</span>
        <span className="line-through opacity-50 font-semibold">{formatSek(price!)}</span>
      </span>
    );
  }
  if (hasPrice) {
    return <span className={`font-black ${className}`}>{formatSek(price!)}</span>;
  }
  return null;
}

const BIO_EMOJI_PICKER = [
  '📘',
  '🎓',
  '🤝',
  '🏠',
  '🔗',
  '🛒',
  '📦',
  '🎯',
  '✨',
  '🚀',
  '💡',
  '🔥',
  '💎',
  '🎙️',
  '🎬',
  '📱',
  '💻',
  '🛍️',
  '❤️',
  '⭐',
  '🌟',
  '🧩',
  '📌',
  '🎁',
  '🪙',
  '📈',
  '🧠',
  '🎨',
  '☕',
  '🌍',
];

interface SocialLink {
  platform: string;
  url: string;
}

const LINK_BLOCK_TYPES = [
  {
    type: 'lead_magnet' as const,
    label: 'Lead Magnet',
    emoji: '📘',
    color: '#3B82F6',
    defaultTitle: 'Gratis E-bok',
    defaultSubtitle: 'Ladda ned gratis',
    category: 'links' as const,
  },
  {
    type: 'course' as const,
    label: 'Kurs',
    emoji: '🎓',
    color: '#9b8afb',
    defaultTitle: 'Online Kurs',
    defaultSubtitle: '12 lektioner · Börja idag',
    category: 'links' as const,
  },
  {
    type: 'coaching' as const,
    label: 'Coaching',
    emoji: '🤝',
    color: '#10B981',
    defaultTitle: '1:1 Coaching',
    defaultSubtitle: 'Boka ett samtal',
    category: 'links' as const,
  },
  {
    type: 'community' as const,
    label: 'Community',
    emoji: '🏠',
    color: '#F59E0B',
    defaultTitle: 'Gå med i Community',
    defaultSubtitle: 'Gratis & öppet',
    category: 'links' as const,
  },
  {
    type: 'link' as const,
    label: 'Länk',
    emoji: '🔗',
    color: '#6B7280',
    defaultTitle: 'Extern länk',
    defaultSubtitle: 'Klicka för mer info',
    category: 'links' as const,
  },
  {
    type: 'divider' as const,
    label: 'Avdelare',
    emoji: '—',
    color: '#E5E7EB',
    defaultTitle: '',
    defaultSubtitle: '',
    category: 'links' as const,
  },
];

const STORE_BLOCK_TYPE = {
  type: 'store' as const,
  label: 'Store-produkt',
  emoji: '🛒',
  color: '#9b8afb',
  defaultTitle: 'Ny produkt',
  defaultSubtitle: 'Länk till extern butik',
  category: 'store' as const,
  defaultDestination: 'https://',
};

/** Normalize older saved blocks that lack category. */
function normalizeBioBlock(block: Partial<BioBlock> & { id: string }): BioBlock {
  const isStore = block.category === 'store' || block.type === 'store';
  const id = block.id;
  const title = block.title ?? '';
  const utm_slug =
    block.utm_slug || (isStore ? slugifyBioProduct(title || 'product', id) : undefined);
  // Store products no longer show price in the bio subtitle.
  const rawSubtitle = block.subtitle ?? '';
  const subtitle = isStore
    ? rawSubtitle
        .replace(/\s*\d+[\s.,]?\d*\s*SEK\s*[·•\-|]?\s*/gi, '')
        .replace(/^\s*[·•\-|]\s*/, '')
        .trim()
    : rawSubtitle;
  return {
    id,
    type: (block.type as BioBlock['type']) || (isStore ? 'store' : 'link'),
    category: isStore ? 'store' : 'links',
    title,
    subtitle: isStore ? (subtitle || 'Extern butik') : subtitle,
    emoji: block.emoji ?? (isStore ? '🛒' : '🔗'),
    icon_url: typeof block.icon_url === 'string' && block.icon_url ? block.icon_url : null,
    color: block.color ?? (isStore ? '#9b8afb' : '#6B7280'),
    visible: block.visible !== false,
    url: block.url,
    destination_url: block.destination_url ?? (isStore ? block.url : undefined),
    utm_slug,
    price: typeof block.price === 'number' && Number.isFinite(block.price) ? block.price : null,
    sale_price:
      typeof block.sale_price === 'number' && Number.isFinite(block.sale_price)
        ? block.sale_price
        : null,
  };
}

function BlockIconVisual({
  block,
  sizeClass = 'w-9 h-9',
  emojiClass = 'text-lg',
  radiusClass = 'rounded-xl',
}: {
  block: Pick<BioBlock, 'emoji' | 'icon_url' | 'color'>;
  sizeClass?: string;
  emojiClass?: string;
  radiusClass?: string;
}) {
  return (
    <div
      className={`${sizeClass} ${radiusClass} flex items-center justify-center ${emojiClass} flex-shrink-0 overflow-hidden`}
      style={{ background: `${block.color}18` }}
    >
      {block.icon_url ? (
        <img src={block.icon_url} alt="" className="w-full h-full object-cover" />
      ) : (
        <span>{block.emoji}</span>
      )}
    </div>
  );
}

const SOCIAL_PLATFORMS: {
  id: SocialBrandId;
  label: string;
  color: string;
  prefix: string;
}[] = [
  {
    id: 'instagram',
    label: 'Instagram',
    color: '#E1306C',
    prefix: 'https://instagram.com/',
  },
  { id: 'tiktok', label: 'TikTok', color: '#010101', prefix: 'https://tiktok.com/@' },
  {
    id: 'youtube',
    label: 'YouTube',
    color: '#FF0000',
    prefix: 'https://youtube.com/@',
  },
  { id: 'twitter', label: 'X', color: '#000000', prefix: 'https://x.com/' },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    color: '#0A66C2',
    prefix: 'https://linkedin.com/in/',
  },
  {
    id: 'spotify',
    label: 'Podcast / Spotify',
    color: '#1DB954',
    prefix: 'https://open.spotify.com/',
  },
  { id: 'custom', label: 'Anpassad URL', color: '#6B7280', prefix: '' },
];

function SocialPlatformIcon({
  id,
  size = 16,
  className,
}: {
  id: string;
  size?: number;
  className?: string;
}) {
  const Icon = SOCIAL_BRAND_ICONS[id as SocialBrandId] ?? SOCIAL_BRAND_ICONS.custom;
  return <Icon size={size} className={className} />;
}

// Deterministic ID generator to avoid Math.random() in render path
let _idCounter = 1000;
function nextId() {
  return String(++_idCounter);
}

// Chat simulation data — module-level to avoid useEffect dependency issues
const CHAT_NAMES = ['Emma L.', 'Lars B.', 'Astrid K.', 'Marcus J.', 'Sofia R.', 'Björn H.'];
const CHAT_MSGS = [
  '🔥 Fantastiskt!',
  'Tack för tipsen!',
  'Kan du repetera?',
  '💯 Toppen!',
  'Var köper jag kursen?',
  'Genialt! 🙌',
];

// ── Mobile preview ─────────────────────────────────────────────────────────────
function PreviewBlockRow({ block, theme }: { block: BioBlock; theme: BioTheme }) {
  if (block.type === 'divider') {
    return <div className="h-px mx-2" style={{ background: `${theme.mutedColor}33` }} />;
  }

  const radius = buttonRadiusPx(theme.buttonRadius);
  const shadow = buttonShadowCss(theme.buttonShadow);
  const filled = theme.buttonStyle === 'filled';
  const soft = theme.buttonStyle === 'soft';
  const bg = filled
    ? theme.buttonBg
    : soft
      ? `${theme.buttonBg}18`
      : 'transparent';
  const color = filled ? theme.buttonText : theme.buttonBg;
  const border =
    theme.buttonStyle === 'outline'
      ? `1.5px solid ${theme.buttonBorder}`
      : soft
        ? `1px solid ${theme.buttonBg}22`
        : '1px solid transparent';

  return (
    <div
      className="p-2.5 flex items-center gap-2"
      style={{
        background: bg,
        color,
        borderRadius: radius,
        boxShadow: shadow,
        border,
        fontFamily: getBioFontFamily(theme.fontId),
      }}
    >
      <div
        className="w-7 h-7 flex items-center justify-center text-xs flex-shrink-0 overflow-hidden"
        style={{
          borderRadius: Math.max(6, radius / 2),
          background: filled ? 'rgba(255,255,255,0.16)' : `${theme.buttonBg}22`,
        }}
      >
        {block.icon_url ? (
          <img src={block.icon_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span>{block.emoji}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-black truncate" style={{ color }}>
          {block.title}
        </p>
        <p className="text-[7px] truncate" style={{ color, opacity: 0.7 }}>
          {block.subtitle}
        </p>
      </div>
      {block.category !== 'store' && (block.price != null || block.sale_price != null) && (
        <div className="flex-shrink-0 text-right text-[7px]" style={{ color }}>
          <BlockPriceLabel price={block.price} salePrice={block.sale_price} />
        </div>
      )}
      {block.category === 'store' && (
        <span
          className="text-[6px] font-black uppercase tracking-wide px-1 py-0.5"
          style={{
            borderRadius: 6,
            background: filled ? 'rgba(255,255,255,0.18)' : `${theme.accent}18`,
            color: filled ? theme.buttonText : theme.accent,
          }}
        >
          UTM
        </span>
      )}
    </div>
  );
}

function MobilePreview({
  blocks,
  handle,
  displayName,
  bioText,
  avatarUrl,
  socialLinks,
  theme,
}: {
  blocks: BioBlock[];
  handle: string;
  displayName: string;
  bioText: string;
  avatarUrl: string;
  socialLinks: SocialLink[];
  theme: BioTheme;
}) {
  const [previewTab, setPreviewTab] = useState<BioCategory>('links');
  const visible = blocks.filter((b) => b.visible);
  const linkBlocks = visible.filter((b) => b.category !== 'store');
  const storeBlocks = visible.filter((b) => b.category === 'store');
  const activeBlocks = previewTab === 'store' ? storeBlocks : linkBlocks;
  const fontFamily = getBioFontFamily(theme.fontId);

  useEffect(() => {
    const href = getBioGoogleFontsHref(theme.fontId);
    if (!href || typeof document === 'undefined') return;
    const id = `bio-font-${theme.fontId}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }, [theme.fontId]);

  return (
    <div className="flex items-center justify-center py-2">
      <div style={{ width: 240 }}>
        <div className="rounded-[34px] p-2.5 shadow-2xl" style={{ background: theme.accent }}>
          <div className="bg-white rounded-[26px] overflow-hidden" style={{ height: 490 }}>
            <div
              className="h-7 flex items-center justify-between px-5"
              style={{ background: theme.accent }}
            >
              <span className="text-white text-[8px] font-bold">9:41</span>
              <div className="w-20 h-3.5 bg-zinc-700 rounded-full" />
              <div className="flex gap-0.5">
                <div className="w-2.5 h-2 bg-white/50 rounded-sm" />
                <div className="w-2 h-2 bg-white/50 rounded-full" />
              </div>
            </div>
            <div
              className="overflow-y-auto px-3 pt-4 pb-4 space-y-2"
              style={{ height: 463, background: theme.bg, fontFamily }}
            >
              <div className="text-center mb-2">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 overflow-hidden border-2 border-white shadow"
                  style={{
                    background: `linear-gradient(135deg, ${theme.accent}cc, ${theme.accent})`,
                  }}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Crown size={18} className="text-white" />
                  )}
                </div>
                <p className="text-[10px] font-black" style={{ color: theme.nameColor }}>
                  {displayName || 'Creator Name'}
                </p>
                <p className="text-[8px] font-medium" style={{ color: theme.mutedColor }}>
                  @{handle || 'creator'}
                </p>
                <p
                  className="text-[8px] mt-1 leading-relaxed px-2"
                  style={{ color: theme.mutedColor }}
                >
                  {bioText || 'Bio text here...'}
                </p>
                {socialLinks.length > 0 && (
                  <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
                    {socialLinks.slice(0, 5).map((sl, i) => {
                      const plat =
                        SOCIAL_PLATFORMS.find((p) => p.id === sl.platform) ?? SOCIAL_PLATFORMS[6];
                      return (
                        <div
                          key={i}
                          className="w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ background: `${plat.color}18`, color: plat.color }}
                        >
                          <SocialPlatformIcon id={plat.id} size={12} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Links | Store menu */}
              <div
                className="flex items-center gap-0.5 p-0.5 rounded-xl border"
                style={{
                  background: `${theme.nameColor}08`,
                  borderColor: `${theme.nameColor}10`,
                }}
              >
                {(
                  [
                    { key: 'links' as const, label: 'Links' },
                    { key: 'store' as const, label: 'Store' },
                  ] as const
                ).map(({ key, label }) => {
                  const active = previewTab === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPreviewTab(key)}
                      className="flex-1 h-7 min-h-[28px] rounded-[10px] text-[8px] font-black uppercase tracking-[0.12em] transition-all"
                      style={
                        active
                          ? { background: theme.accent, color: '#fff' }
                          : { color: theme.mutedColor }
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {activeBlocks.length === 0 ? (
                <p className="text-[7px] px-0.5 pt-1" style={{ color: theme.mutedColor }}>
                  {previewTab === 'store'
                    ? 'Inga store-produkter ännu'
                    : 'Inga länkar ännu'}
                </p>
              ) : (
                activeBlocks.map((block) => (
                  <PreviewBlockRow key={block.id} block={block} theme={theme} />
                ))
              )}
            </div>
          </div>
        </div>
        <p className="text-center text-[10px] font-bold text-zinc-400 mt-2">
          app.se/@{handle || 'creator'}
        </p>
      </div>
    </div>
  );
}

// ── Bio drag block ─────────────────────────────────────────────────────────────
function BioDragBlock({
  block,
  index,
  dragging,
  handle,
  onDragStart,
  onDragOver,
  onDrop,
  onUpdate,
  onDelete,
  onToggle,
}: {
  block: BioBlock;
  index: number;
  dragging: number | null;
  handle: string;
  onDragStart: (i: number) => void;
  onDragOver: (i: number) => void;
  onDrop: () => void;
  onUpdate: (i: number, b: Partial<BioBlock>) => void;
  onDelete: (i: number) => void;
  onToggle: (i: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [iconTab, setIconTab] = useState<'emoji' | 'upload'>('emoji');
  const [utmCopied, setUtmCopied] = useState(false);
  const [upload, { loading: uploadingIcon }] = useUpload();
  const iconFileRef = useRef<HTMLInputElement>(null);
  const isStore = block.category === 'store' || block.type === 'store';
  const slug = block.utm_slug || slugifyBioProduct(block.title || 'product', block.id);
  const trackedUrl = buildTrackedShortUrl(slug);
  const utmDestination = block.destination_url
    ? appendUtmParams(block.destination_url, { handle: handle || 'creator', slug })
    : '';

  const copyUtm = async () => {
    await navigator.clipboard.writeText(trackedUrl);
    if (block.destination_url) {
      registerDemoDestination(slug, {
        destination: block.destination_url,
        handle: handle || 'creator',
        title: block.title || 'Store product',
      });
    }
    setUtmCopied(true);
    setTimeout(() => setUtmCopied(false), 2000);
  };

  const handleIconUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const localUrl = URL.createObjectURL(file);
    onUpdate(index, { icon_url: localUrl });
    const result = await upload({ file });
    if (result.url) onUpdate(index, { icon_url: result.url });
  };

  if (block.type === 'divider') {
    return (
      <div
        draggable
        onDragStart={() => onDragStart(index)}
        onDragOver={(e) => {
          e.preventDefault();
          onDragOver(index);
        }}
        onDrop={onDrop}
        className={`flex items-center gap-3 px-3 py-2 rounded-xl border border-dashed border-zinc-200 group cursor-grab ${dragging === index ? 'opacity-40' : ''}`}
      >
        <GripVertical size={14} className="text-zinc-300" />
        <div className="flex-1 h-px bg-zinc-200" />
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
          Avdelare
        </span>
        <button
          onClick={() => onDelete(index)}
          className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center transition-opacity"
        >
          <X size={10} className="text-red-400" />
        </button>
      </div>
    );
  }
  return (
    <div
      draggable={!editing}
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(index);
      }}
      onDrop={onDrop}
      className={`group bg-white rounded-2xl border transition-all ${editing ? 'cursor-default' : 'cursor-grab'} ${dragging === index ? 'opacity-40 scale-95' : 'hover:border-zinc-200 hover:shadow-sm'} ${block.visible ? 'border-zinc-100' : 'border-dashed border-zinc-200 opacity-60'}`}
    >
      <div className="flex items-center gap-3 p-3">
        <GripVertical size={15} className="text-zinc-300 hover:text-zinc-500 flex-shrink-0" />
        <button
          type="button"
          onClick={() => {
            setEditing(true);
            setIconTab(block.icon_url ? 'upload' : 'emoji');
          }}
          className="relative flex-shrink-0 rounded-xl ring-offset-1 hover:ring-2 hover:ring-[var(--nc-coral)]/40 transition-shadow"
          title="Byt ikon"
        >
          <BlockIconVisual block={block} />
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white border border-zinc-200 flex items-center justify-center shadow-sm">
            <Camera size={9} className="text-zinc-500" />
          </span>
        </button>
        {editing ? (
          <div className="flex-1 space-y-1.5 min-w-0">
            <input
              value={block.title}
              onChange={(e) =>
                onUpdate(index, {
                  title: e.target.value,
                  ...(isStore
                    ? { utm_slug: slugifyBioProduct(e.target.value || 'product', block.id) }
                    : {}),
                })
              }
              className="w-full text-xs font-extrabold text-[#2c3340] bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-300"
            />
            {!isStore && (
              <input
                value={block.subtitle}
                onChange={(e) => onUpdate(index, { subtitle: e.target.value })}
                className="w-full text-[10px] text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-300"
              />
            )}
            {!isStore && (
              <div className="grid grid-cols-2 gap-1.5">
                <label className="min-w-0">
                  <span className="text-[9px] font-extrabold uppercase tracking-wide text-zinc-400 block mb-0.5">
                    Pris (SEK)
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="decimal"
                    value={block.price ?? ''}
                    onChange={(e) =>
                      onUpdate(index, { price: parsePriceInput(e.target.value) })
                    }
                    placeholder="t.ex. 499"
                    className="w-full text-[10px] text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[var(--nc-coral)]"
                  />
                </label>
                <label className="min-w-0">
                  <span className="text-[9px] font-extrabold uppercase tracking-wide text-zinc-400 block mb-0.5">
                    Reapris (SEK)
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="decimal"
                    value={block.sale_price ?? ''}
                    onChange={(e) =>
                      onUpdate(index, { sale_price: parsePriceInput(e.target.value) })
                    }
                    placeholder="t.ex. 299"
                    className="w-full text-[10px] text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[var(--nc-coral)]"
                  />
                </label>
              </div>
            )}
            {(block.type === 'link' || block.type === 'lead_magnet') && (
              <input
                value={block.url ?? ''}
                onChange={(e) => onUpdate(index, { url: e.target.value })}
                placeholder="https://..."
                className="w-full text-[10px] text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-300"
              />
            )}
            {isStore && (
              <>
                <input
                  value={block.destination_url ?? ''}
                  onChange={(e) =>
                    onUpdate(index, {
                      destination_url: e.target.value,
                      url: e.target.value,
                    })
                  }
                  placeholder="Produkt-URL (Shopify, Gumroad…)"
                  className="w-full text-[10px] text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1 focus:outline-none focus:border-[var(--nc-coral)]"
                />
                <p className="text-[9px] text-zinc-400 font-medium break-all">
                  UTM: {utmDestination || 'Lägg till en produkt-URL'}
                </p>
              </>
            )}
            <div className="flex gap-1.5 flex-wrap">
              {['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6B7280', '#9b8afb'].map(
                (c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onUpdate(index, { color: c })}
                    className={`w-4 h-4 rounded-full transition-transform hover:scale-110 ${block.color === c ? 'ring-2 ring-offset-1 ring-zinc-400 scale-110' : ''}`}
                    style={{ background: c }}
                  />
                )
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-extrabold text-[#2c3340] truncate">
                {block.title || '(Inget namn)'}
              </p>
              {isStore && (
                <span className="text-[8px] font-black uppercase tracking-wide text-[var(--nc-coral)] bg-[#f2eeff] px-1.5 py-0.5 rounded-full flex-shrink-0">
                  Store
                </span>
              )}
            </div>
            <p className="text-[10px] text-zinc-400 truncate">{block.subtitle}</p>
            {!isStore && (block.price != null || block.sale_price != null) && (
              <p className="text-[10px] text-[#2c3340] mt-0.5">
                <BlockPriceLabel price={block.price} salePrice={block.sale_price} />
              </p>
            )}
            {isStore && block.destination_url && (
              <p className="text-[9px] text-zinc-300 truncate font-mono mt-0.5">{trackedUrl}</p>
            )}
          </div>
        )}
        <div className="flex items-center gap-1 flex-shrink-0">
          {isStore && (
            <button
              type="button"
              onClick={() => void copyUtm()}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${utmCopied ? 'bg-green-100 text-green-600' : 'bg-[#f2eeff] text-[var(--nc-coral)] hover:bg-[#f2eeff]'}`}
              title="Kopiera UTM-länk"
            >
              {utmCopied ? <Check size={11} /> : <Copy size={11} />}
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${editing ? 'bg-indigo-100 text-[var(--nc-coral)]' : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'}`}
          >
            {editing ? <Check size={11} /> : <Edit3 size={11} />}
          </button>
          <button
            type="button"
            onClick={() => onToggle(index)}
            className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition-colors"
          >
            {block.visible ? (
              <ToggleRight size={13} className="text-green-500" />
            ) : (
              <ToggleLeft size={13} className="text-zinc-400" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onDelete(index)}
            className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 size={11} className="text-red-400" />
          </button>
        </div>
      </div>

      {editing && (
        <div className="px-3 pb-3 pt-0">
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                Ikon
              </p>
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white border border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIconTab('emoji')}
                  className={`h-8 min-h-[32px] px-2.5 rounded-md text-[10px] font-bold transition-colors ${
                    iconTab === 'emoji'
                      ? 'bg-[var(--nc-coral)] text-white'
                      : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  Emoji
                </button>
                <button
                  type="button"
                  onClick={() => setIconTab('upload')}
                  className={`h-8 min-h-[32px] px-2.5 rounded-md text-[10px] font-bold transition-colors ${
                    iconTab === 'upload'
                      ? 'bg-[var(--nc-coral)] text-white'
                      : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  Bild
                </button>
              </div>
            </div>

            {iconTab === 'emoji' ? (
              <div className="grid grid-cols-8 sm:grid-cols-10 gap-1">
                {BIO_EMOJI_PICKER.map((em) => {
                  const active = !block.icon_url && block.emoji === em;
                  return (
                    <button
                      key={em}
                      type="button"
                      onClick={() => onUpdate(index, { emoji: em, icon_url: null })}
                      className={`h-9 min-h-[36px] rounded-lg text-base flex items-center justify-center transition-colors ${
                        active
                          ? 'bg-white border border-[var(--nc-coral)] shadow-sm'
                          : 'bg-white/70 border border-transparent hover:border-zinc-200'
                      }`}
                    >
                      {em}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  ref={iconFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleIconUpload(f);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => iconFileRef.current?.click()}
                  disabled={uploadingIcon}
                  className="w-full h-20 min-h-[80px] rounded-xl border-2 border-dashed border-zinc-200 bg-white flex flex-col items-center justify-center gap-1.5 hover:border-[var(--nc-coral)] transition-colors"
                >
                  {uploadingIcon ? (
                    <Loader2
                      size={18}
                      className="text-zinc-400"
                      style={{ animation: 'spin 1s linear infinite' }}
                    />
                  ) : block.icon_url ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={block.icon_url}
                        alt=""
                        className="w-12 h-12 rounded-xl object-cover"
                      />
                      <span className="text-xs font-bold text-zinc-600">Byt bild</span>
                    </div>
                  ) : (
                    <>
                      <ImageIcon size={18} className="text-zinc-300" />
                      <span className="text-xs font-bold text-zinc-500">Ladda upp ikonbild</span>
                    </>
                  )}
                </button>
                {block.icon_url && (
                  <button
                    type="button"
                    onClick={() => onUpdate(index, { icon_url: null })}
                    className="text-[11px] font-bold text-zinc-400 hover:text-red-500 transition-colors"
                  >
                    Ta bort bild (använd emoji)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Avatar uploader ────────────────────────────────────────────────────────────
function AvatarUploader({
  avatarUrl,
  onUpdate,
}: {
  avatarUrl: string;
  onUpdate: (url: string) => void;
}) {
  const [upload, { loading: uploading }] = useUpload();
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(avatarUrl);
  useEffect(() => {
    setPreviewUrl(avatarUrl);
  }, [avatarUrl]);
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    const result = await upload({ file });
    if (result.url) {
      onUpdate(result.url);
      setPreviewUrl(result.url);
    } else if (result.error) {
      console.error('Upload error:', result.error);
      setPreviewUrl(avatarUrl);
    }
    e.target.value = '';
  };
  return (
    <div className="flex items-center gap-5">
      <div className="relative flex-shrink-0">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#b8a9ff] to-[#9b8afb] flex items-center justify-center overflow-hidden border-4 border-white shadow-lg ring-2 ring-zinc-100">
          {previewUrl ? (
            <img src={previewUrl} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <Crown size={28} className="text-white" />
          )}
        </div>
        {uploading && (
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
            <div
              className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
              style={{ animation: 'spin 1s linear infinite' }}
            />
          </div>
        )}
      </div>
      <div className="space-y-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 h-9 px-4 rounded-xl bg-[var(--nc-coral)] hover:opacity-90 text-white text-xs font-extrabold transition-all disabled:opacity-60 active:scale-95"
        >
          <Camera size={13} /> {previewUrl ? 'Byt foto' : 'Ladda upp foto'}
        </button>
        {previewUrl && (
          <button
            type="button"
            onClick={() => {
              setPreviewUrl('');
              onUpdate('');
            }}
            className="flex items-center gap-2 h-9 px-4 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 text-xs font-extrabold transition-all border border-red-100"
          >
            <X size={12} /> Ta bort
          </button>
        )}
        <p className="text-[10px] text-zinc-400 font-medium">JPG, PNG eller WebP · Max 5 MB</p>
      </div>
    </div>
  );
}

// ── Social links editor ────────────────────────────────────────────────────────
function SocialLinksEditor({
  links,
  onChange,
}: {
  links: SocialLink[];
  onChange: (links: SocialLink[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newPlatform, setNewPlatform] = useState('instagram');
  const [newUrl, setNewUrl] = useState('');
  const handleAdd = () => {
    if (!newUrl.trim()) return;
    const platform = SOCIAL_PLATFORMS.find((p) => p.id === newPlatform);
    let finalUrl = newUrl.trim();
    if (platform && platform.prefix && !finalUrl.startsWith('http'))
      finalUrl = platform.prefix + finalUrl.replace('@', '');
    onChange([...links, { platform: newPlatform, url: finalUrl }]);
    setNewUrl('');
    setAdding(false);
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
          <GlobeIcon size={12} /> Sociala Medier-länkar
        </h4>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 h-7 px-3 rounded-xl bg-blue-100 text-blue-600 text-[11px] font-black hover:bg-blue-200 transition-colors"
          >
            <Plus size={11} /> Lägg till länk
          </button>
        )}
      </div>
      <div className="space-y-2 mb-3">
        {links.length === 0 && !adding && (
          <div className="text-center py-5 text-zinc-300">
            <GlobeIcon size={20} className="mx-auto mb-1.5" />
            <p className="text-xs font-bold">Inga sociala medielänkar ännu</p>
            <p className="text-[10px]">Lägg till din första länk</p>
          </div>
        )}
        {links.map((link, i) => {
          const plat = SOCIAL_PLATFORMS.find((p) => p.id === link.platform) ?? SOCIAL_PLATFORMS[6];
          return (
            <div
              key={i}
              className="flex items-center gap-2 p-2 rounded-xl bg-zinc-50 border border-zinc-100 group"
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${plat.color}15`, color: plat.color }}
              >
                <SocialPlatformIcon id={plat.id} size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-0.5">
                  {plat.label}
                </p>
                <input
                  value={link.url}
                  onChange={(e) =>
                    onChange(links.map((l, idx) => (idx === i ? { ...l, url: e.target.value } : l)))
                  }
                  className="w-full text-xs text-zinc-700 bg-transparent focus:outline-none truncate"
                  placeholder="https://..."
                />
              </div>
              <button
                onClick={() => onChange(links.filter((_, idx) => idx !== i))}
                className="w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              >
                <X size={10} className="text-red-400" />
              </button>
            </div>
          );
        })}
      </div>
      {adding && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 space-y-3">
          <div>
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1.5">
              Välj plattform
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {SOCIAL_PLATFORMS.map((p) => {
                const active = newPlatform === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setNewPlatform(p.id)}
                    className={`flex flex-col items-center gap-1.5 p-2.5 min-h-[44px] rounded-xl border text-center transition-all ${
                      active
                        ? 'border-[var(--nc-coral)] bg-white shadow-sm'
                        : 'border-zinc-200 bg-white hover:border-zinc-300'
                    }`}
                  >
                    <span
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: `${p.color}14`, color: p.color }}
                    >
                      <SocialPlatformIcon id={p.id} size={16} />
                    </span>
                    <span className="text-[9px] font-bold text-zinc-600 leading-tight">
                      {p.label.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1.5">
              URL eller användarnamn
            </label>
            <input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder={
                SOCIAL_PLATFORMS.find((p) => p.id === newPlatform)?.prefix ?? 'https://...'
              }
              className="w-full h-9 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-medium focus:outline-none focus:border-indigo-300"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') setAdding(false);
              }}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!newUrl.trim()}
              className="flex-1 h-9 rounded-xl bg-[var(--nc-coral)] hover:opacity-90 text-white text-xs font-extrabold disabled:opacity-40 transition-all flex items-center justify-center gap-1.5"
            >
              <Plus size={12} /> Lägg till
            </button>
            <button
              onClick={() => {
                setAdding(false);
                setNewUrl('');
              }}
              className="h-9 px-4 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-500 hover:bg-zinc-50 transition-colors"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main admin page ────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { locale } = useLocale();
  const [activeTab, setActiveTab] = useState<AdminTab>('analytics');
  const [bioTheme, setBioTheme] = useState<BioTheme>(DEFAULT_BIO_THEME);
  const [saved, setSaved] = useState('');
  const [adminSearch, setAdminSearch] = useState('');
  const [adminCommunityId, setAdminCommunityId] = useState(
    MOCK_MANAGED_COMMUNITIES[0]?.id ?? 101
  );
  const [notifOpen, setNotifOpen] = useState(false);

  // Deep-link support: /admin?tab=email (and /admin/email redirect)
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get('tab');
    // Legacy ?tab=content maps to the renamed Event tab.
    const tab = (raw === 'content' ? 'event' : raw) as AdminTab | null;
    if (
      tab &&
      ['analytics', 'event', 'community', 'email', 'broadcast', 'biobuilder'].includes(tab)
    ) {
      setActiveTab(tab);
    }
  }, []);

  // Forms
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    start_time: '',
    stream_url: '',
    speaker_name: '',
    location_type: 'online' as 'online' | 'in_person',
    location_address: '',
    audience: 'community' as 'invite_only' | 'selected' | 'community',
    invited_member_ids: [] as string[],
    image_url: '',
  });
  const [eventUpload, { loading: eventUploading }] = useUpload();
  const eventCoverRef = useRef<HTMLInputElement>(null);

  // useId gives a stable unique ID that matches between server and client
  const uid = useId();

  // Broadcast — NO Math.random() in render path; all randomness is in useEffect
  const [liveTitle, setLiveTitle] = useState('');
  const [streamKey, setStreamKey] = useState('nc-live-xxxxxxxx');
  const [isLive, setIsLive] = useState(false);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [liveChat, setLiveChat] = useState<{ name: string; msg: string }[]>([]);
  const [chatMsg, setChatMsg] = useState('');
  const [keyCopied, setKeyCopied] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // Bio builder
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [blocks, setBlocks] = useState<BioBlock[]>([
    {
      id: '1',
      type: 'lead_magnet',
      category: 'links',
      title: 'Gratis E-bok',
      subtitle: 'Ladda ned gratis',
      emoji: '📘',
      color: '#3B82F6',
      visible: true,
    },
    {
      id: '2',
      type: 'course',
      category: 'links',
      title: 'Kurs: Nordic Creator',
      subtitle: 'Onlinekurs · 12 lektioner',
      emoji: '🎓',
      color: '#9b8afb',
      visible: true,
    },
    {
      id: '3',
      type: 'coaching',
      category: 'links',
      title: '1:1 Coaching',
      subtitle: 'Boka ett samtal',
      emoji: '🤝',
      color: '#10B981',
      visible: true,
    },
    {
      id: '4',
      type: 'community',
      category: 'links',
      title: 'Gå med i Community',
      subtitle: 'Gratis & öppet',
      emoji: '🏠',
      color: '#F59E0B',
      visible: true,
    },
    {
      id: 's1',
      type: 'store',
      category: 'store',
      title: 'Creator Starter Pack',
      subtitle: 'Extern butik',
      emoji: '🛒',
      color: '#9b8afb',
      visible: true,
      destination_url: 'https://example.com/starter-pack',
      utm_slug: 'starter-pack-s1',
    },
    {
      id: 's2',
      type: 'store',
      category: 'store',
      title: 'Live Studio Hook Pack',
      subtitle: 'Digital produkt',
      emoji: '📦',
      color: '#0f766e',
      visible: true,
      destination_url: 'https://example.com/hook-pack',
      utm_slug: 'hook-pack-s2',
    },
  ]);
  const [bioHandle, setBioHandle] = useState('');
  const [bioDisplayName, setBioDisplayName] = useState('');
  const [bioBioText, setBioBioText] = useState('');
  const [bioAvatarUrl, setBioAvatarUrl] = useState('');
  const [bioLinkCopied, setBioLinkCopied] = useState(false);
  const [bioSaved, setBioSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [addBlockOpen, setAddBlockOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Set stream key once on mount using stable uid (no Math.random / Date.now in render path)
  useEffect(() => {
    const safe = uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'nclivekey';
    setStreamKey(`nc-live-${safe}`);
  }, [uid]);

  // Keep demo UTM redirect registry in sync with Store products.
  useEffect(() => {
    for (const block of blocks) {
      if (block.category !== 'store' || !block.destination_url) continue;
      const slug = block.utm_slug || slugifyBioProduct(block.title || 'product', block.id);
      registerDemoDestination(slug, {
        destination: block.destination_url,
        handle: bioHandle || 'creator',
        title: block.title || 'Store product',
      });
    }
  }, [blocks, bioHandle]);

  // Broadcast simulation — cycle through predefined values (no Math.random)
  const chatTickRef = useRef(0);

  useEffect(() => {
    if (!isLive) return;
    const timer = setInterval(() => {
      setAttendeeCount((n) => n + 3);
      chatTickRef.current += 1;
      if (chatTickRef.current % 2 === 0) {
        const nameIdx = chatTickRef.current % CHAT_NAMES.length;
        const msgIdx = (chatTickRef.current + 1) % CHAT_MSGS.length;
        setLiveChat((prev) => [
          ...prev.slice(-30),
          { name: CHAT_NAMES[nameIdx], msg: CHAT_MSGS[msgIdx] },
        ]);
      }
    }, 1800);
    return () => clearInterval(timer);
  }, [isLive]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [liveChat]);

  // AI Copilot
  const [showCreatorAI, setShowCreatorAI] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiOutput, setAiOutput] = useState('');
  const [aiStreamingOutput, setAiStreamingOutput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCopied, setAiCopied] = useState(false);
  const handleFinishAI = useCallback((msg: string) => {
    setAiOutput(msg);
    setAiStreamingOutput('');
    setAiLoading(false);
  }, []);
  const handleAIStream = useHandleStreamResponse({
    onChunk: setAiStreamingOutput,
    onFinish: handleFinishAI,
  });

  // Bio block handlers
  const handleDragStart = (i: number) => setDragIndex(i);
  const handleDragOver = (i: number) => setDragOverIndex(i);
  const handleDrop = () => {
    if (dragIndex === null || dragOverIndex === null || dragIndex === dragOverIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const arr = [...blocks];
    const [m] = arr.splice(dragIndex, 1);
    arr.splice(dragOverIndex, 0, m);
    setBlocks(arr);
    setDragIndex(null);
    setDragOverIndex(null);
  };
  const updateBlock = (i: number, patch: Partial<BioBlock>) =>
    setBlocks((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  const toggleBlock = (i: number) =>
    setBlocks((prev) => prev.map((b, idx) => (idx === i ? { ...b, visible: !b.visible } : b)));
  const deleteBlock = (i: number) => setBlocks((prev) => prev.filter((_, idx) => idx !== i));
  const addLinkBlock = (type: BioBlock['type']) => {
    const def = LINK_BLOCK_TYPES.find((bt) => bt.type === type) ?? LINK_BLOCK_TYPES[0];
    setBlocks((prev) => [
      ...prev,
      {
        id: nextId(),
        type,
        category: 'links',
        title: def.defaultTitle,
        subtitle: def.defaultSubtitle,
        emoji: def.emoji,
        color: def.color,
        visible: true,
      },
    ]);
    setAddBlockOpen(false);
  };

  const addStoreProduct = () => {
    const id = nextId();
    const title = STORE_BLOCK_TYPE.defaultTitle;
    const slug = slugifyBioProduct(title, id);
    const destination = 'https://example.com/product';
    registerDemoDestination(slug, {
      destination,
      handle: bioHandle || 'creator',
      title,
    });
    setBlocks((prev) => [
      ...prev,
      {
        id,
        type: 'store',
        category: 'store',
        title,
        subtitle: STORE_BLOCK_TYPE.defaultSubtitle,
        emoji: STORE_BLOCK_TYPE.emoji,
        color: STORE_BLOCK_TYPE.color,
        visible: true,
        destination_url: destination,
        utm_slug: slug,
        url: destination,
      },
    ]);
  };

  // Queries
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const r = await fetch('/api/admin/stats');
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    enabled: !!session,
  });
  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const r = await fetch('/api/events');
      const data = await r.json();
      if (!r.ok || !Array.isArray(data)) return [];
      return data;
    },
    enabled: !!session,
  });
  const { data: bioData } = useQuery({
    queryKey: ['bio'],
    enabled: !!session && activeTab === 'biobuilder',
    queryFn: async () => {
      const r = await fetch('/api/admin/bio');
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
  });

  useEffect(() => {
    if (bioData) {
      if (bioData.blocks?.length) {
        setBlocks(
          bioData.blocks.map((b: Partial<BioBlock> & { id: string }) => normalizeBioBlock(b))
        );
      }
      if (bioData.handle) setBioHandle(bioData.handle);
      if (bioData.display_name) setBioDisplayName(bioData.display_name);
      if (bioData.bio_text) setBioBioText(bioData.bio_text);
      if (bioData.avatar_url) setBioAvatarUrl(bioData.avatar_url);
      if (bioData.social_links?.length) setSocialLinks(bioData.social_links);
      if (bioData.theme) setBioTheme(normalizeBioTheme(bioData.theme));
    }
  }, [bioData]);

  // Mutations
  const addEventMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...eventForm,
          stream_url: eventForm.location_type === 'online' ? eventForm.stream_url : '',
          location_address:
            eventForm.location_type === 'in_person' ? eventForm.location_address : '',
          invited_member_ids:
            eventForm.audience === 'selected' ? eventForm.invited_member_ids : [],
          image_url: eventForm.image_url || null,
        }),
      });
      if (!r.ok) throw new Error('Failed to create event');
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setEventForm({
        title: '',
        description: '',
        start_time: '',
        stream_url: '',
        speaker_name: '',
        location_type: 'online',
        location_address: '',
        audience: 'community',
        invited_member_ids: [],
        image_url: '',
      });
      setSaved('event');
      setTimeout(() => setSaved(''), 2200);
    },
  });

  const handleEventCover = async (file: File) => {
    const localUrl = URL.createObjectURL(file);
    setEventForm((p) => ({ ...p, image_url: localUrl }));
    const result = await eventUpload({ file });
    if (result.url) setEventForm((p) => ({ ...p, image_url: result.url! }));
    else if (result.error) {
      console.error('Upload error:', result.error);
      // Keep local preview so the form still works in demo mode.
    }
  };

  const toggleInvitedMember = (id: string) => {
    setEventForm((p) => {
      const has = p.invited_member_ids.includes(id);
      return {
        ...p,
        invited_member_ids: has
          ? p.invited_member_ids.filter((x) => x !== id)
          : [...p.invited_member_ids, id],
      };
    });
  };
  const saveBioMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/admin/bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blocks,
          handle: bioHandle,
          display_name: bioDisplayName,
          bio_text: bioBioText,
          avatar_url: bioAvatarUrl,
          social_links: socialLinks,
          theme: bioTheme,
        }),
      });
      return r.json();
    },
    onSuccess: () => {
      setBioSaved(true);
      setTimeout(() => setBioSaved(false), 2500);
    },
  });

  const patchBioTheme = <K extends keyof BioTheme>(key: K, value: BioTheme[K]) => {
    setBioTheme((prev) => ({ ...prev, [key]: value, presetId: 'custom' }));
  };

  const exportEmails = () => {
    if (typeof document === 'undefined') return;
    if (!stats?.emails?.length) return;
    const csv = ['Email,Name,Joined']
      .concat(stats.emails.map((e: any) => `${e.email},${e.name},${e.created_at}`))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nordic-creator-members.csv';
    a.click();
  };

  const runCreatorAI = async (action: string) => {
    setAiLoading(true);
    setAiOutput('');
    setAiStreamingOutput('');
    try {
      const res = await fetch('/api/ai/creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, topic: aiTopic }),
      });
      if (!res.ok) throw new Error('AI request failed');
      handleAIStream(res);
    } catch (err) {
      console.error(err);
      setAiLoading(false);
    }
  };

  const startBroadcast = useCallback(() => {
    setAttendeeCount(28);
    setLiveChat([]);
    chatTickRef.current = 0;
    setIsLive(true);
  }, []);

  if (isPending)
    return (
      <div className="min-h-screen flex items-center justify-center  text-zinc-400">
        {t('loading', locale)}
      </div>
    );
  if (!session) {
    router.push('/account/signin');
    return null;
  }

  const selectedAdminCommunity =
    MOCK_MANAGED_COMMUNITIES.find((c) => c.id === adminCommunityId) ??
    MOCK_MANAGED_COMMUNITIES[0];

  const now = Date.now();
  const plannedEvents = (Array.isArray(events) ? events : [])
    .filter((e: { start_time?: string }) => new Date(e.start_time ?? 0).getTime() >= now)
    .sort(
      (a: { start_time?: string }, b: { start_time?: string }) =>
        new Date(a.start_time ?? 0).getTime() - new Date(b.start_time ?? 0).getTime()
    );
  const previousEvents = (Array.isArray(events) ? events : [])
    .filter((e: { start_time?: string }) => new Date(e.start_time ?? 0).getTime() < now)
    .sort(
      (a: { start_time?: string }, b: { start_time?: string }) =>
        new Date(b.start_time ?? 0).getTime() - new Date(a.start_time ?? 0).getTime()
    );

  const formatEventWhen = (iso?: string) => {
    if (!iso) return '—';
    try {
      return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'sv-SE', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const TABS: { key: AdminTab; label: string; icon: React.ElementType }[] = [
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'event', label: 'Event', icon: Calendar },
    { key: 'community', label: t('community', locale), icon: Users },
    { key: 'email', label: 'E-post', icon: Mail },
    { key: 'broadcast', label: 'Sänd Live', icon: Radio },
    { key: 'biobuilder', label: 'Bio Builder', icon: Smartphone },
  ];

  return (
    <div className="nc-app nc-app-shell min-h-screen">
      {/* ── Skool-style top bar + sub-nav ── */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="h-14 sm:h-16 flex items-center gap-3 sm:gap-4">
            {/* Left: community logo + selector */}
            <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
              <div
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                style={{
                  background: selectedAdminCommunity?.cover_color || 'var(--nc-coral)',
                }}
              >
                {selectedAdminCommunity?.name?.[0] ?? 'N'}
              </div>
              <div className="relative min-w-0">
                <select
                  value={adminCommunityId}
                  onChange={(e) => setAdminCommunityId(Number(e.target.value))}
                  className="appearance-none h-11 min-h-[44px] max-w-[140px] sm:max-w-[200px] pl-2 pr-7 bg-transparent text-sm font-black text-[#2c3340] truncate focus:outline-none cursor-pointer"
                  aria-label="Välj community"
                >
                  {MOCK_MANAGED_COMMUNITIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-zinc-400"
                />
              </div>
            </div>

            {/* Center: global search */}
            <div className="flex-1 flex justify-center min-w-0">
              <div className="relative w-full max-w-md">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  placeholder="Sök medlemmar, innehåll, e-post..."
                  className="w-full h-11 min-h-[44px] rounded-full bg-zinc-100 border border-transparent focus:border-zinc-200 focus:bg-white pl-10 pr-4 text-sm font-medium text-[#2c3340] placeholder:text-zinc-400 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Right: notifications + AI + avatar */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowCreatorAI(true)}
                className="hidden sm:inline-flex items-center gap-1.5 h-11 min-h-[44px] px-3 rounded-full bg-[var(--nc-coral)] text-white text-xs font-extrabold hover:opacity-90"
              >
                <Sparkles size={13} /> AI
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotifOpen((v) => !v)}
                  className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-600 relative"
                  aria-label="Notiser"
                >
                  <Bell size={16} />
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[var(--nc-coral)]" />
                </button>
                {notifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-zinc-100 rounded-2xl shadow-xl z-40 overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-50">
                      <p className="text-xs font-black text-[#2c3340]">Notiser</p>
                    </div>
                    {[
                      '3 nya medlemmar i Creator Lab',
                      'E-boksköp: Creator Starter Pack',
                      'Broadcast öppningsrate 62%',
                    ].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setNotifOpen(false)}
                        className="w-full text-left px-4 py-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50 border-b border-zinc-50 last:border-0"
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-full bg-zinc-100 hover:bg-zinc-200 hidden sm:flex items-center justify-center text-zinc-600"
                title={t('dashboard', locale)}
              >
                <Home size={15} />
              </button>
              <button
                type="button"
                onClick={() =>
                  authClient.signOut({ fetchOptions: { onSuccess: () => router.push('/') } })
                }
                className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-full overflow-hidden border-2 border-white shadow-sm bg-[var(--nc-coral)] flex items-center justify-center text-white text-xs font-black"
                title={session.user.name}
              >
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (session.user.name?.[0] ?? 'U')
                )}
              </button>
            </div>
          </div>

          {/* Sub-menu tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none -mb-px">
            {TABS.map(({ key, label, icon: Icon }) => {
              const active = activeTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`relative flex items-center gap-1.5 h-11 min-h-[44px] px-3.5 sm:px-4 text-[11px] sm:text-xs font-extrabold whitespace-nowrap transition-colors flex-shrink-0 ${
                    active
                      ? 'text-[#2c3340]'
                      : 'text-zinc-400 hover:text-zinc-700'
                  }`}
                >
                  <Icon size={13} />
                  {label}
                  {key === 'broadcast' && isLive && (
                    <span
                      className="w-1.5 h-1.5 bg-red-500 rounded-full"
                      style={{ animation: 'livePulse 1s ease-in-out infinite' }}
                    />
                  )}
                  {active && (
                    <span className="absolute left-2 right-2 bottom-0 h-0.5 rounded-full bg-[#2c3340]" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-16">
        {/* ── ANALYTICS ── */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: t('totalRevenue', locale),
                  value: `${stats?.revenue ?? 0} SEK`,
                  icon: TrendingUp,
                  color: '#10B981',
                },
                {
                  label: t('activeMembers', locale),
                  value: stats?.members ?? 0,
                  icon: Users,
                  color: '#3B82F6',
                },
                {
                  label: t('eventRsvps', locale),
                  value: stats?.rsvps ?? 0,
                  icon: Calendar,
                  color: '#9b8afb',
                },
                {
                  label: 'Produkter',
                  value: stats?.products ?? 0,
                  icon: ShoppingBag,
                  color: '#F59E0B',
                },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.label}
                    className="nc-glass rounded-[1.5rem] p-5"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                        {s.label}
                      </p>
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ background: `${s.color}18` }}
                      >
                        <Icon size={14} style={{ color: s.color }} />
                      </div>
                    </div>
                    <p className="text-2xl font-black text-[#2c3340]">{s.value}</p>
                  </div>
                );
              })}
            </div>
            <div className="nc-glass rounded-[1.5rem] p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-sm font-black text-[#2c3340]">
                    {t('revenueOverview', locale)}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{t('last7days', locale)}</p>
                </div>
                <p className="text-xs text-green-500 font-black">{t('vsLastWeek', locale)}</p>
              </div>
              <div className="flex items-end gap-2 h-28">
                {[40, 65, 45, 80, 60, 90, 75].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-lg"
                      style={{
                        height: `${h}%`,
                        background: 'linear-gradient(180deg, #818CF8, #6366F1)',
                      }}
                    />
                    <span className="text-[9px] font-bold text-zinc-400">
                      {['M', 'T', 'O', 'T', 'F', 'L', 'S'][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bio Store UTM tracking */}
            <div className="nc-glass rounded-[1.5rem] overflow-hidden">
              <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-zinc-50">
                <div>
                  <h3 className="text-sm font-black text-[#2c3340] flex items-center gap-2">
                    <ShoppingBag size={14} className="text-[var(--nc-coral)]" />
                    Bio Store — UTM-klick
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {(stats?.utm_total_clicks as number | undefined) ?? 0} klick totalt · spårade
                    via unika UTM-länkar
                  </p>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wide text-[var(--nc-coral)] bg-[#f2eeff] px-2.5 py-1 rounded-full">
                  utm_medium=bio_store
                </span>
              </div>
              <div className="divide-y divide-zinc-50">
                {((stats?.utm_links as UtmClickStat[] | undefined) ?? []).length === 0 ? (
                  <div className="py-10 text-center text-sm text-zinc-400">
                    Lägg till store-produkter i Bio Builder för att se UTM-statistik.
                  </div>
                ) : (
                  ((stats?.utm_links as UtmClickStat[]) ?? []).map((row) => {
                    const maxClicks = Math.max(
                      1,
                      ...(((stats?.utm_links as UtmClickStat[]) ?? []).map((r) => r.clicks) || [1])
                    );
                    const pct = Math.round((row.clicks / maxClicks) * 100);
                    return (
                      <div
                        key={row.slug}
                        className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-[#2c3340] truncate">{row.title}</p>
                          <p className="text-[11px] font-mono text-zinc-400 truncate">
                            /r/{row.slug}
                          </p>
                          <div className="mt-2 h-1.5 bg-zinc-100 rounded-full overflow-hidden max-w-xs">
                            <div
                              className="h-full rounded-full bg-[var(--nc-coral)]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-lg font-black text-[#2c3340] tabular-nums">
                              {row.clicks}
                            </p>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase">
                              klick
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-[#2c3340] tabular-nums">
                              {row.unique}
                            </p>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase">
                              unika
                            </p>
                          </div>
                          <a
                            href={row.tracked_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-11 min-h-[44px] px-3 rounded-xl bg-zinc-50 hover:bg-[#f2eeff] text-xs font-extrabold text-zinc-600 hover:text-[var(--nc-coral)] inline-flex items-center gap-1.5 transition-colors"
                          >
                            <LinkIcon size={12} /> Öppna
                          </a>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="nc-glass rounded-[1.5rem] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-50">
                <div>
                  <h3 className="text-sm font-black text-[#2c3340]">{t('emailList', locale)}</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {stats?.members ?? 0} {t('registered', locale)}
                  </p>
                </div>
                <Button
                  onClick={exportEmails}
                  size="sm"
                  className="rounded-full bg-[var(--nc-coral)] text-white font-bold flex items-center gap-2 h-8 text-xs"
                >
                  <Download size={12} /> {t('exportCsv', locale)}
                </Button>
              </div>
              <div className="divide-y divide-zinc-50">
                {(stats?.emails ?? []).slice(0, 8).map((e: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 px-6 py-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-sm font-black text-[var(--nc-coral)] flex-shrink-0">
                      {e.name?.[0] ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-[#2c3340] truncate">{e.name}</p>
                      <p className="text-xs text-zinc-400 truncate">{e.email}</p>
                    </div>
                    <p className="text-xs text-zinc-300 flex-shrink-0">
                      {e.created_at?.slice(0, 10)}
                    </p>
                  </div>
                ))}
                {!stats?.emails?.length && (
                  <div className="py-10 text-center text-sm text-zinc-400">Inga members ännu</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── EVENT ── */}
        {activeTab === 'event' && (
          <div className="space-y-5">
            <div className="nc-glass rounded-[1.5rem] p-6 max-w-2xl">
              <h3 className="text-sm font-black text-[#2c3340] mb-4 flex items-center gap-2">
                <Calendar size={14} /> {t('scheduleEvent', locale)}
              </h3>
              <div className="space-y-4">
                {/* Header photo */}
                <input
                  ref={eventCoverRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleEventCover(f);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => eventCoverRef.current?.click()}
                  disabled={eventUploading}
                  className="relative w-full h-36 min-h-[144px] rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 overflow-hidden flex flex-col items-center justify-center gap-1.5 hover:border-[var(--nc-coral)] transition-colors"
                >
                  {eventForm.image_url ? (
                    <>
                      <img
                        src={eventForm.image_url}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <span className="relative z-10 text-[11px] font-extrabold text-white bg-black/45 px-3 py-1.5 rounded-full">
                        Byt headerbild
                      </span>
                    </>
                  ) : eventUploading ? (
                    <Loader2
                      size={22}
                      className="text-zinc-400"
                      style={{ animation: 'spin 1s linear infinite' }}
                    />
                  ) : (
                    <>
                      <ImageIcon size={22} className="text-zinc-300" />
                      <span className="text-xs font-bold text-zinc-500">Lägg till headerbild</span>
                      <span className="text-[10px] text-zinc-400 font-medium">
                        Visas högst upp på eventet
                      </span>
                    </>
                  )}
                </button>
                {eventForm.image_url && (
                  <button
                    type="button"
                    onClick={() => setEventForm((p) => ({ ...p, image_url: '' }))}
                    className="text-xs font-bold text-zinc-400 hover:text-red-500 transition-colors -mt-2"
                  >
                    Ta bort bild
                  </button>
                )}

                <Input
                  placeholder={t('eventTitle', locale)}
                  value={eventForm.title}
                  onChange={(e) => setEventForm((p) => ({ ...p, title: e.target.value }))}
                  className="rounded-xl bg-zinc-50 border-zinc-100 h-11"
                />
                <Textarea
                  placeholder={t('description', locale)}
                  value={eventForm.description}
                  onChange={(e) => setEventForm((p) => ({ ...p, description: e.target.value }))}
                  className="rounded-xl bg-zinc-50 border-zinc-100 min-h-[70px] resize-none"
                />
                <Input
                  type="datetime-local"
                  value={eventForm.start_time}
                  onChange={(e) => setEventForm((p) => ({ ...p, start_time: e.target.value }))}
                  className="rounded-xl bg-zinc-50 border-zinc-100 h-11"
                />

                {/* In person / Online */}
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-zinc-400 mb-2">
                    Plats
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { key: 'online' as const, label: 'Online', icon: Monitor },
                        { key: 'in_person' as const, label: 'På plats', icon: MapPin },
                      ] as const
                    ).map(({ key, label, icon: Icon }) => {
                      const active = eventForm.location_type === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setEventForm((p) => ({ ...p, location_type: key }))}
                          className={`h-11 min-h-[44px] rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                            active
                              ? 'border-[var(--nc-coral)] bg-[color-mix(in_srgb,var(--nc-coral)_10%,white)] text-[#2c3340]'
                              : 'border-zinc-100 bg-zinc-50 text-zinc-500 hover:border-zinc-200'
                          }`}
                        >
                          <Icon size={15} /> {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {eventForm.location_type === 'online' ? (
                  <Input
                    placeholder={t('streamUrl', locale)}
                    value={eventForm.stream_url}
                    onChange={(e) => setEventForm((p) => ({ ...p, stream_url: e.target.value }))}
                    className="rounded-xl bg-zinc-50 border-zinc-100 h-11"
                  />
                ) : (
                  <Input
                    placeholder="Adress / plats (t.ex. Norrsken House, Stockholm)"
                    value={eventForm.location_address}
                    onChange={(e) =>
                      setEventForm((p) => ({ ...p, location_address: e.target.value }))
                    }
                    className="rounded-xl bg-zinc-50 border-zinc-100 h-11"
                  />
                )}

                {/* Audience */}
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-zinc-400 mb-2">
                    Vem kan delta
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(
                      [
                        {
                          key: 'invite_only' as const,
                          label: 'Endast inbjudna',
                          icon: Lock,
                        },
                        {
                          key: 'selected' as const,
                          label: 'Utvalda medlemmar',
                          icon: UserCheck,
                        },
                        {
                          key: 'community' as const,
                          label: 'Hela communityn',
                          icon: Users,
                        },
                      ] as const
                    ).map(({ key, label, icon: Icon }) => {
                      const active = eventForm.audience === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setEventForm((p) => ({ ...p, audience: key }))}
                          className={`h-11 min-h-[44px] rounded-xl border text-xs sm:text-[13px] font-bold flex items-center justify-center gap-1.5 px-2 transition-colors ${
                            active
                              ? 'border-[var(--nc-coral)] bg-[color-mix(in_srgb,var(--nc-coral)_10%,white)] text-[#2c3340]'
                              : 'border-zinc-100 bg-zinc-50 text-zinc-500 hover:border-zinc-200'
                          }`}
                        >
                          <Icon size={14} className="flex-shrink-0" /> {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {eventForm.audience === 'selected' && (
                  <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 max-h-44 overflow-y-auto space-y-1">
                    <p className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-wide mb-2">
                      Välj medlemmar
                    </p>
                    {getMockCommunityAdminPayload(adminCommunityId).members.map((m) => {
                      const checked = eventForm.invited_member_ids.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => toggleInvitedMember(m.id)}
                          className={`w-full flex items-center gap-2.5 px-2.5 h-11 min-h-[44px] rounded-lg text-left transition-colors ${
                            checked ? 'bg-white border border-[var(--nc-coral)]/40' : 'hover:bg-white'
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                              checked
                                ? 'bg-[var(--nc-coral)] border-[var(--nc-coral)]'
                                : 'border-zinc-300 bg-white'
                            }`}
                          >
                            {checked && <Check size={10} className="text-white" />}
                          </span>
                          <span className="text-sm font-bold text-[#2c3340] truncate">{m.name}</span>
                          <span className="text-[10px] text-zinc-400 font-medium ml-auto flex-shrink-0">
                            {m.role}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {eventForm.audience === 'invite_only' && (
                  <p className="text-xs text-zinc-400 font-medium -mt-1">
                    Endast personer du skickar en personlig inbjudan till kan se och anmäla sig.
                  </p>
                )}

                <Input
                  placeholder={t('speakerName', locale)}
                  value={eventForm.speaker_name}
                  onChange={(e) => setEventForm((p) => ({ ...p, speaker_name: e.target.value }))}
                  className="rounded-xl bg-zinc-50 border-zinc-100 h-11"
                />
                <Button
                  onClick={() => addEventMutation.mutate()}
                  disabled={
                    !eventForm.title ||
                    !eventForm.start_time ||
                    addEventMutation.isPending ||
                    (eventForm.audience === 'selected' &&
                      eventForm.invited_member_ids.length === 0) ||
                    (eventForm.location_type === 'in_person' && !eventForm.location_address.trim())
                  }
                  className="w-full rounded-full bg-[var(--nc-coral)] text-white font-black h-11 min-h-[44px] flex items-center justify-center gap-2"
                >
                  {saved === 'event' ? (
                    <>
                      <CheckCircle2 size={14} /> {t('saved', locale)}
                    </>
                  ) : (
                    <>
                      <Calendar size={14} /> {t('scheduleEventBtn', locale)}
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Planned / upcoming */}
              <div className="nc-glass rounded-[1.5rem] p-6">
                <h3 className="text-sm font-black text-[#2c3340] mb-1 flex items-center gap-2">
                  <Calendar size={14} className="text-[var(--nc-coral)]" /> Planerade events
                </h3>
                <p className="text-xs text-zinc-400 font-medium mb-4">
                  Kommande events som syns för medlemmar.
                </p>
                {plannedEvents.length === 0 ? (
                  <p className="text-sm text-zinc-400 font-medium py-6 text-center">
                    {t('noUpcomingEvents', locale)}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {plannedEvents.map(
                      (ev: {
                        id: number | string;
                        title: string;
                        start_time?: string;
                        speaker_name?: string;
                        category?: string;
                        attendee_count?: number;
                        image_url?: string | null;
                        location_type?: string;
                        audience?: string;
                      }) => (
                        <li
                          key={ev.id}
                          className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-100"
                        >
                          {ev.image_url ? (
                            <img
                              src={ev.image_url}
                              alt=""
                              className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                            />
                          ) : (
                            <div
                              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{
                                background: 'color-mix(in srgb, var(--nc-coral) 14%, white)',
                              }}
                            >
                              <Calendar size={16} className="text-[var(--nc-coral)]" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-[#2c3340] truncate">{ev.title}</p>
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {formatEventWhen(ev.start_time)}
                              {ev.speaker_name ? ` · ${ev.speaker_name}` : ''}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="text-[10px] font-extrabold uppercase tracking-wide text-zinc-500 bg-white border border-zinc-100 px-2 py-0.5 rounded-md">
                                {ev.location_type === 'in_person' ? 'På plats' : 'Online'}
                              </span>
                              <span className="text-[10px] font-extrabold uppercase tracking-wide text-zinc-500 bg-white border border-zinc-100 px-2 py-0.5 rounded-md">
                                {ev.audience === 'invite_only'
                                  ? 'Inbjudan'
                                  : ev.audience === 'selected'
                                    ? 'Utvalda'
                                    : 'Community'}
                              </span>
                              {ev.category && (
                                <span className="text-[10px] font-extrabold uppercase tracking-wide text-zinc-500 bg-white border border-zinc-100 px-2 py-0.5 rounded-md">
                                  {ev.category}
                                </span>
                              )}
                              <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                                <Users size={10} /> {ev.attendee_count ?? 0} RSVP
                              </span>
                            </div>
                          </div>
                        </li>
                      )
                    )}
                  </ul>
                )}
              </div>

              {/* Previous / past */}
              <div className="nc-glass rounded-[1.5rem] p-6">
                <h3 className="text-sm font-black text-[#2c3340] mb-1 flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-zinc-400" /> Tidigare events
                </h3>
                <p className="text-xs text-zinc-400 font-medium mb-4">
                  Avslutade events och replays.
                </p>
                {previousEvents.length === 0 ? (
                  <p className="text-sm text-zinc-400 font-medium py-6 text-center">
                    Inga tidigare events ännu.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {previousEvents.map(
                      (ev: {
                        id: number | string;
                        title: string;
                        start_time?: string;
                        speaker_name?: string;
                        category?: string;
                        attendee_count?: number;
                        image_url?: string | null;
                        location_type?: string;
                        audience?: string;
                      }) => (
                        <li
                          key={ev.id}
                          className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50/80 border border-zinc-100"
                        >
                          {ev.image_url ? (
                            <img
                              src={ev.image_url}
                              alt=""
                              className="w-12 h-12 rounded-xl object-cover flex-shrink-0 opacity-80"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0">
                              <CheckCircle2 size={16} className="text-zinc-400" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-zinc-600 truncate">{ev.title}</p>
                            <p className="text-xs text-zinc-400 mt-0.5">
                              {formatEventWhen(ev.start_time)}
                              {ev.speaker_name ? ` · ${ev.speaker_name}` : ''}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="text-[10px] font-extrabold uppercase tracking-wide text-zinc-400 bg-white border border-zinc-100 px-2 py-0.5 rounded-md">
                                {ev.location_type === 'in_person' ? 'På plats' : 'Online'}
                              </span>
                              <span className="text-[10px] font-extrabold uppercase tracking-wide text-zinc-400 bg-white border border-zinc-100 px-2 py-0.5 rounded-md">
                                {ev.audience === 'invite_only'
                                  ? 'Inbjudan'
                                  : ev.audience === 'selected'
                                    ? 'Utvalda'
                                    : 'Community'}
                              </span>
                              {ev.category && (
                                <span className="text-[10px] font-extrabold uppercase tracking-wide text-zinc-400 bg-white border border-zinc-100 px-2 py-0.5 rounded-md">
                                  {ev.category}
                                </span>
                              )}
                              <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                                <Users size={10} /> {ev.attendee_count ?? 0} deltog
                              </span>
                            </div>
                          </div>
                        </li>
                      )
                    )}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── COMMUNITY ── */}
        {activeTab === 'community' && <CommunityAdminPanel />}

        {/* ── EMAIL CRM ── */}
        {activeTab === 'email' && <EmailAdminPanel />}

        {/* ── BROADCAST STUDIO ── */}
        {activeTab === 'broadcast' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-[var(--nc-coral)] rounded-2xl overflow-hidden">
                <div className="aspect-video bg-zinc-950 flex items-center justify-center relative">
                  {isLive ? (
                    <div className="text-center text-white">
                      <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-3">
                        <Radio
                          size={32}
                          className="text-red-400"
                          style={{ animation: 'livePulse 1s ease-in-out infinite' }}
                        />
                      </div>
                      <p className="text-lg font-black">{liveTitle || 'Live Sändning'}</p>
                      <div className="flex items-center justify-center gap-2 mt-2">
                        <span className="flex items-center gap-1.5 bg-red-500 text-white text-xs font-extrabold px-3 py-1 rounded-full">
                          <div
                            className="w-1.5 h-1.5 bg-white rounded-full"
                            style={{ animation: 'livePulse 1s ease-in-out infinite' }}
                          />{' '}
                          LIVE
                        </span>
                        <span className="flex items-center gap-1.5 bg-white/10 text-white text-xs font-bold px-3 py-1 rounded-full">
                          <Users size={11} /> {attendeeCount} {t('viewers', locale).toLowerCase()}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Video size={48} className="text-zinc-700 mx-auto mb-3" strokeWidth={1} />
                      <p className="text-zinc-500 text-sm font-bold">
                        {t('readyToBroadcast', locale)}
                      </p>
                    </div>
                  )}
                </div>
                <div className="p-4 flex items-center gap-3">
                  <button className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                    <Mic size={15} className="text-white" />
                  </button>
                  <button className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                    <Video size={15} className="text-white" />
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => {
                      if (isLive) {
                        setIsLive(false);
                      } else {
                        startBroadcast();
                      }
                    }}
                    className={`flex items-center gap-2 h-10 px-5 rounded-xl font-black text-sm transition-all ${isLive ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                  >
                    <Radio size={13} />{' '}
                    {isLive ? t('endBroadcast', locale) : t('startBroadcast', locale)}
                  </button>
                </div>
              </div>
              <div className="nc-glass rounded-[1.5rem] p-6">
                <h3 className="text-sm font-black text-[#2c3340] mb-4 flex items-center gap-2">
                  <Activity size={14} className="text-red-500" /> {t('broadcastSettings', locale)}
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                      {t('broadcastTitle', locale)}
                    </label>
                    <Input
                      value={liveTitle}
                      onChange={(e) => setLiveTitle(e.target.value)}
                      placeholder={t('broadcastTitlePlaceholder', locale)}
                      className="rounded-xl border-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                      {t('streamKeyLabel', locale)}
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={streamKey}
                        readOnly
                        className="rounded-xl border-zinc-200 font-mono text-xs bg-zinc-50 flex-1"
                      />
                      <button
                        onClick={async () => {
                          await navigator.clipboard.writeText(streamKey);
                          setKeyCopied(true);
                          setTimeout(() => setKeyCopied(false), 2000);
                        }}
                        className={`h-10 px-3 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${keyCopied ? 'bg-green-100 text-green-600' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'}`}
                      >
                        {keyCopied ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-black text-[#2c3340]">{attendeeCount}</p>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        {t('viewers', locale)}
                      </p>
                    </div>
                    <div className="bg-zinc-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-black text-[#2c3340]">{liveChat.length}</p>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        {t('chatMessages', locale)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div
              className="nc-glass rounded-[1.5rem] flex flex-col overflow-hidden"
              style={{ height: 560 }}
            >
              <div className="p-4 border-b border-zinc-50 flex items-center gap-2 flex-shrink-0">
                <Radio size={13} className={isLive ? 'text-red-500' : 'text-zinc-300'} />
                <h3 className="text-sm font-black text-[#2c3340]">{t('liveChat', locale)}</h3>
                {isLive && (
                  <span className="ml-auto text-[10px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                    LIVE
                  </span>
                )}
              </div>
              <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {liveChat.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center">
                    <div>
                      <Radio size={28} className="text-zinc-200 mx-auto mb-2" />
                      <p className="text-sm text-zinc-400 font-medium">
                        {isLive ? t('waitingMessages', locale) : t('startForChat', locale)}
                      </p>
                    </div>
                  </div>
                ) : (
                  liveChat.map((msg, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-extrabold text-[var(--nc-coral)] flex-shrink-0">
                        {msg.name[0]}
                      </div>
                      <div>
                        <span className="text-xs font-extrabold text-[var(--nc-coral)]">{msg.name}: </span>
                        <span className="text-xs text-zinc-600">{msg.msg}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-3 border-t border-zinc-50 flex gap-2 flex-shrink-0">
                <input
                  value={chatMsg}
                  onChange={(e) => setChatMsg(e.target.value)}
                  placeholder={t('writeToAudience', locale)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && chatMsg.trim()) {
                      setLiveChat((p) => [...p, { name: session.user.name, msg: chatMsg }]);
                      setChatMsg('');
                    }
                  }}
                  className="flex-1 h-9 rounded-xl bg-zinc-50 border border-zinc-200 px-3 text-xs focus:outline-none focus:border-indigo-300"
                />
                <button
                  onClick={() => {
                    if (chatMsg.trim()) {
                      setLiveChat((p) => [...p, { name: session.user.name, msg: chatMsg }]);
                      setChatMsg('');
                    }
                  }}
                  disabled={!chatMsg.trim()}
                  className="w-9 h-9 rounded-xl bg-[var(--nc-coral)] flex items-center justify-center disabled:opacity-40 hover:bg-indigo-700 transition-colors flex-shrink-0"
                >
                  <Send size={12} className="text-white" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── BIO BUILDER ── */}
        {activeTab === 'biobuilder' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {/* Redigera profil */}
              <div className="nc-glass rounded-[1.5rem] p-6">
                <h3 className="text-sm font-black text-[#2c3340] mb-5 flex items-center gap-2">
                  <Settings size={14} className="text-zinc-500" /> {t('editProfile', locale)}
                </h3>
                <div className="mb-5 pb-5 border-b border-zinc-50">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-3">
                    {t('profilePhoto', locale)}
                  </label>
                  <AvatarUploader avatarUrl={bioAvatarUrl} onUpdate={setBioAvatarUrl} />
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                      {t('displayName', locale)}
                    </label>
                    <Input
                      value={bioDisplayName}
                      onChange={(e) => setBioDisplayName(e.target.value)}
                      placeholder={session.user.name}
                      className="rounded-xl border-zinc-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                      {t('handleLabel', locale)}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-sm">
                        @
                      </span>
                      <Input
                        value={bioHandle}
                        onChange={(e) =>
                          setBioHandle(e.target.value.toLowerCase().replace(/\s/g, ''))
                        }
                        placeholder="creator"
                        className="rounded-xl border-zinc-200 pl-7 text-sm"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                    {t('bioLabel', locale)}
                  </label>
                  <Textarea
                    value={bioBioText}
                    onChange={(e) => setBioBioText(e.target.value)}
                    placeholder="Beskriv dig kortfattat..."
                    className="rounded-xl border-zinc-200 resize-none min-h-[60px] text-sm"
                  />
                </div>
              </div>

              {/* Välj tema + anpassning */}
              <div className="nc-glass rounded-[1.5rem] p-6 space-y-5">
                <div>
                  <h3 className="text-sm font-black text-[#2c3340] mb-1 flex items-center gap-2">
                    <Palette size={14} /> {t('chooseTheme', locale)}
                  </h3>
                  <p className="text-xs text-zinc-400 font-medium">
                    Välj ett preset eller finjustera färger, typografi och knappar.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {BIO_THEME_PRESETS.map((theme) => {
                    const active = bioTheme.presetId === theme.presetId;
                    return (
                      <button
                        key={theme.presetId}
                        type="button"
                        onClick={() => setBioTheme(applyBioPreset(theme.presetId))}
                        className={`p-3.5 rounded-2xl border-2 text-left transition-all min-h-[44px] ${
                          active
                            ? 'border-[var(--nc-coral)] shadow-md'
                            : 'border-zinc-100 hover:border-zinc-200'
                        }`}
                        style={{ background: theme.bg }}
                      >
                        <div className="flex items-center gap-1.5 mb-2">
                          <div
                            className="w-6 h-6 rounded-md"
                            style={{ background: theme.buttonBg }}
                          />
                          <div
                            className="w-6 h-6 rounded-md border border-black/5"
                            style={{ background: theme.accent }}
                          />
                        </div>
                        <p
                          className="text-xs font-extrabold"
                          style={{
                            color: theme.nameColor,
                            fontFamily: getBioFontFamily(theme.fontId),
                          }}
                        >
                          {theme.label}
                        </p>
                        <p className="text-[10px]" style={{ color: theme.mutedColor }}>
                          {theme.desc}
                        </p>
                        {active && (
                          <div className="mt-1.5 flex items-center gap-1 text-[10px] font-black text-[var(--nc-coral)]">
                            <Check size={10} /> Aktivt
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {bioTheme.presetId === 'custom' && (
                  <p className="text-[11px] font-bold text-[var(--nc-coral)] -mt-2">
                    Anpassat tema — dina manuella val används.
                  </p>
                )}

                <div className="border-t border-zinc-100 pt-5 space-y-4">
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-zinc-400">
                    Färger
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <ThemeColorField
                      label="Bakgrund"
                      value={bioTheme.bg}
                      onChange={(v) => patchBioTheme('bg', v)}
                    />
                    <ThemeColorField
                      label="Accent"
                      value={bioTheme.accent}
                      onChange={(v) => patchBioTheme('accent', v)}
                    />
                    <ThemeColorField
                      label="Knappfärg"
                      value={bioTheme.buttonBg}
                      onChange={(v) => patchBioTheme('buttonBg', v)}
                    />
                    <ThemeColorField
                      label="Knapptext"
                      value={bioTheme.buttonText}
                      onChange={(v) => patchBioTheme('buttonText', v)}
                    />
                    <ThemeColorField
                      label="Knappkant"
                      value={bioTheme.buttonBorder}
                      onChange={(v) => patchBioTheme('buttonBorder', v)}
                    />
                    <ThemeColorField
                      label="Namnfärg"
                      value={bioTheme.nameColor}
                      onChange={(v) => patchBioTheme('nameColor', v)}
                    />
                    <ThemeColorField
                      label="Sekundär text"
                      value={bioTheme.mutedColor}
                      onChange={(v) => patchBioTheme('mutedColor', v)}
                    />
                  </div>
                </div>

                <div className="border-t border-zinc-100 pt-5 space-y-3">
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-zinc-400">
                    Typografi
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {BIO_FONTS.map((font) => {
                      const active = bioTheme.fontId === font.id;
                      return (
                        <button
                          key={font.id}
                          type="button"
                          onClick={() => {
                            const href = getBioGoogleFontsHref(font.id);
                            if (href && typeof document !== 'undefined') {
                              const id = `bio-font-${font.id}`;
                              if (!document.getElementById(id)) {
                                const link = document.createElement('link');
                                link.id = id;
                                link.rel = 'stylesheet';
                                link.href = href;
                                document.head.appendChild(link);
                              }
                            }
                            patchBioTheme('fontId', font.id);
                          }}
                          className={`h-14 min-h-[44px] rounded-xl border px-3 text-left transition-colors ${
                            active
                              ? 'border-[var(--nc-coral)] bg-[color-mix(in_srgb,var(--nc-coral)_8%,white)]'
                              : 'border-zinc-100 bg-zinc-50 hover:border-zinc-200'
                          }`}
                        >
                          <span
                            className="block text-sm font-bold text-[#2c3340] truncate"
                            style={{ fontFamily: font.family }}
                          >
                            {font.label}
                          </span>
                          <span
                            className="block text-[10px] text-zinc-400 truncate"
                            style={{ fontFamily: font.family }}
                          >
                            Aa Bb Cc
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-zinc-100 pt-5 space-y-4">
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-zinc-400">
                    Knappar
                  </p>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 mb-2">Stil</p>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { key: 'filled' as const, label: 'Fylld' },
                          { key: 'soft' as const, label: 'Mjuk' },
                          { key: 'outline' as const, label: 'Kontur' },
                        ] as const
                      ).map(({ key, label }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => patchBioTheme('buttonStyle', key)}
                          className={`h-11 min-h-[44px] rounded-xl border text-xs font-bold transition-colors ${
                            bioTheme.buttonStyle === key
                              ? 'border-[var(--nc-coral)] text-[#2c3340] bg-white'
                              : 'border-zinc-100 bg-zinc-50 text-zinc-500'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 mb-2">Hörn</p>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { key: 'sharp' as const, label: 'Skarpa' },
                          { key: 'rounded' as const, label: 'Runda' },
                          { key: 'pill' as const, label: 'Pill' },
                        ] as const
                      ).map(({ key, label }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => patchBioTheme('buttonRadius', key)}
                          className={`h-11 min-h-[44px] rounded-xl border text-xs font-bold transition-colors ${
                            bioTheme.buttonRadius === key
                              ? 'border-[var(--nc-coral)] text-[#2c3340] bg-white'
                              : 'border-zinc-100 bg-zinc-50 text-zinc-500'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 mb-2">Skugga</p>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { key: 'none' as const, label: 'Ingen' },
                          { key: 'soft' as const, label: 'Mjuk' },
                          { key: 'strong' as const, label: 'Stark' },
                        ] as const
                      ).map(({ key, label }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => patchBioTheme('buttonShadow', key)}
                          className={`h-11 min-h-[44px] rounded-xl border text-xs font-bold transition-colors ${
                            bioTheme.buttonShadow === key
                              ? 'border-[var(--nc-coral)] text-[#2c3340] bg-white'
                              : 'border-zinc-100 bg-zinc-50 text-zinc-500'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  className="w-full rounded-full bg-[var(--nc-coral)] text-white font-black h-11 min-h-[44px]"
                  onClick={() => {
                    saveBioMutation.mutate();
                    setSaved('theme');
                    setTimeout(() => setSaved(''), 2000);
                  }}
                >
                  {saved === 'theme' ? t('themeSaved', locale) : t('applyTheme', locale)}
                </Button>
              </div>

              {/* Social links card */}
              <div className="nc-glass rounded-[1.5rem] p-6">
                <SocialLinksEditor links={socialLinks} onChange={setSocialLinks} />
              </div>

              {/* Links category */}
              <div className="nc-glass rounded-[1.5rem] p-6">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-black text-[#2c3340] flex items-center gap-2">
                    <LinkIcon size={14} className="text-zinc-400" /> Links
                  </h3>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setAddBlockOpen((v) => !v)}
                      className="flex items-center gap-1.5 h-11 min-h-[44px] px-3 rounded-xl bg-indigo-100 text-[var(--nc-coral)] text-xs font-extrabold hover:bg-indigo-200 transition-colors"
                    >
                      <Plus size={12} /> {t('addBlock', locale)}{' '}
                      <ChevronDown
                        size={11}
                        className={`transition-transform ${addBlockOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {addBlockOpen && (
                      <div className="absolute right-0 top-full mt-1 bg-white border border-zinc-100 rounded-2xl shadow-xl overflow-hidden z-10 min-w-[160px]">
                        {LINK_BLOCK_TYPES.map((bt) => (
                          <button
                            key={bt.type}
                            type="button"
                            onClick={() => addLinkBlock(bt.type)}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors text-left min-h-[44px]"
                          >
                            <span>{bt.emoji}</span> {bt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-zinc-400 mb-3">
                  Bio-knappar och länkar till community, kurser och lead magnets.
                </p>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">
                  {t('dragToReorder', locale)}
                </p>
                <div className="space-y-2" onDragEnd={handleDrop}>
                  {blocks.map((block, i) =>
                    block.category === 'store' ? null : (
                      <BioDragBlock
                        key={block.id}
                        block={block}
                        index={i}
                        dragging={dragIndex}
                        handle={bioHandle}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onUpdate={updateBlock}
                        onDelete={deleteBlock}
                        onToggle={toggleBlock}
                      />
                    )
                  )}
                </div>
                {blocks.filter((b) => b.category !== 'store').length === 0 && (
                  <div className="text-center py-8 text-zinc-300">
                    <LinkIcon size={22} className="mx-auto mb-2" />
                    <p className="text-sm font-bold">Inga links ännu</p>
                  </div>
                )}
              </div>

              {/* Store category — external products with UTM tracking */}
              <div className="nc-glass rounded-[1.5rem] p-6">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-black text-[#2c3340] flex items-center gap-2">
                    <ShoppingBag size={14} className="text-[var(--nc-coral)]" /> Store
                  </h3>
                  <button
                    type="button"
                    onClick={addStoreProduct}
                    className="flex items-center gap-1.5 h-11 min-h-[44px] px-3 rounded-xl bg-[var(--nc-coral)] text-white text-xs font-extrabold hover:opacity-90 transition-opacity"
                  >
                    <Plus size={12} /> Lägg till produkt
                  </button>
                </div>
                <p className="text-xs text-zinc-400 mb-3">
                  Produkter från andra webbplatser. Varje produkt får en unik UTM-länk som
                  spåras under Analytics.
                </p>
                <div className="space-y-2" onDragEnd={handleDrop}>
                  {blocks.map((block, i) =>
                    block.category === 'store' ? (
                      <BioDragBlock
                        key={block.id}
                        block={block}
                        index={i}
                        dragging={dragIndex}
                        handle={bioHandle}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onUpdate={updateBlock}
                        onDelete={deleteBlock}
                        onToggle={toggleBlock}
                      />
                    ) : null
                  )}
                </div>
                {blocks.filter((b) => b.category === 'store').length === 0 && (
                  <div className="text-center py-8 text-zinc-300">
                    <ShoppingBag size={22} className="mx-auto mb-2" />
                    <p className="text-sm font-bold">Inga store-produkter ännu</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => saveBioMutation.mutate()}
                  disabled={saveBioMutation.isPending}
                  className={`flex items-center gap-2 h-11 px-6 rounded-xl font-black text-sm transition-all disabled:opacity-60 ${bioSaved ? 'bg-green-600 text-white' : 'bg-[var(--nc-coral)] hover:opacity-90 text-white'}`}
                >
                  {bioSaved ? (
                    <>
                      <Check size={14} /> {t('savedBio', locale)}
                    </>
                  ) : (
                    <>
                      <Save size={14} /> {t('saveBio', locale)}
                    </>
                  )}
                </button>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(
                      `${window.location.origin}/@${bioHandle || 'creator'}`
                    );
                    setBioLinkCopied(true);
                    setTimeout(() => setBioLinkCopied(false), 2500);
                  }}
                  className={`flex items-center gap-2 h-11 px-5 rounded-xl font-black text-sm border transition-all ${bioLinkCopied ? 'bg-green-50 border-green-200 text-green-600' : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'}`}
                >
                  {bioLinkCopied ? (
                    <>
                      <Check size={14} /> {t('linkCopied', locale)}
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> {t('copyLink', locale)}
                    </>
                  )}
                </button>
                <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-xl px-3 h-11 text-xs font-mono text-zinc-400">
                  <LinkIcon size={10} className="text-zinc-300" /> app.se/@{bioHandle || 'creator'}
                </div>
                <button
                  onClick={() => setShowPreview((v) => !v)}
                  className={`h-11 px-4 rounded-xl border text-xs font-extrabold transition-colors flex items-center gap-2 ${showPreview ? 'border-indigo-200 bg-indigo-50 text-[var(--nc-coral)]' : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50'}`}
                >
                  {showPreview ? <EyeOff size={13} /> : <Eye size={13} />} {t('preview', locale)}
                </button>
              </div>
            </div>

            {/* Mobile preview — sticks under the admin header while scrolling */}
            <div className="lg:sticky lg:top-28 lg:self-start lg:z-20 h-fit">
              {showPreview ? (
                <div className="nc-glass rounded-[1.5rem] p-6 max-h-[calc(100vh-8rem)] overflow-y-auto">
                  <h3 className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Smartphone size={12} /> {t('livePreview', locale)}
                  </h3>
                  <MobilePreview
                    blocks={blocks}
                    handle={bioHandle}
                    displayName={bioDisplayName}
                    bioText={bioBioText}
                    avatarUrl={bioAvatarUrl}
                    socialLinks={socialLinks}
                    theme={bioTheme}
                  />
                </div>
              ) : (
                <div className="bg-zinc-50 border border-dashed border-zinc-200 rounded-2xl p-10 text-center">
                  <Eye size={24} className="text-zinc-300 mx-auto mb-2" />
                  <p className="text-sm text-zinc-400 font-bold">{t('previewHidden', locale)}</p>
                  <button
                    onClick={() => setShowPreview(true)}
                    className="mt-2 text-xs font-bold text-indigo-500 hover:underline"
                  >
                    {t('showPreview', locale)}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── AI COPILOT DRAWER ── */}
      {showCreatorAI && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowCreatorAI(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 bg-[var(--nc-coral)] flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <Sparkles size={16} className="text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white">{t('aiCopilot', locale)}</h2>
                  <p className="text-[10px] text-white/70">{t('generating', locale)}</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreatorAI(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X size={16} className="text-white" />
              </button>
            </div>
            <div className="px-5 py-3.5 border-b border-zinc-100 bg-zinc-50 flex-shrink-0">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                {t('topicLabel', locale)}
              </p>
              <Input
                placeholder={t('topicPlaceholder', locale)}
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                className="rounded-xl bg-white border-zinc-200 text-sm h-9"
              />
            </div>
            <div className="px-5 py-4 border-b border-zinc-100 flex-shrink-0">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">
                {t('quickActions', locale)}
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  {
                    id: 'course-outline',
                    label: t('courseOutline', locale),
                    color: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100',
                  },
                  {
                    id: 'community-post',
                    label: t('communityPostAction', locale),
                    color: 'bg-green-50 text-green-700 hover:bg-green-100 border-green-100',
                  },
                  {
                    id: 'sales-email',
                    label: t('salesEmail', locale),
                    color: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-100',
                  },
                  {
                    id: 'headlines',
                    label: t('headlines', locale),
                    color: 'bg-[#f2eeff] text-[#6b5bb8] hover:bg-violet-100 border-violet-100',
                  },
                ].map(({ id, label, color }) => (
                  <button
                    key={id}
                    onClick={() => runCreatorAI(id)}
                    disabled={aiLoading}
                    className={`flex items-start gap-2 p-3 rounded-xl border text-xs font-bold text-left transition-all disabled:opacity-50 ${color}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {aiLoading && !aiStreamingOutput && (
                <div className="flex items-center gap-3 text-zinc-400">
                  <div
                    className="w-5 h-5 border-2 border-[#e8e2ff] border-t-violet-600 rounded-full flex-shrink-0"
                    style={{ animation: 'spin 1s linear infinite' }}
                  />
                  <span className="text-sm font-medium">{t('generating', locale)}</span>
                </div>
              )}
              {aiStreamingOutput || aiOutput ? (
                <div className="text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap bg-zinc-50 rounded-xl p-4 border border-zinc-100 font-mono">
                  {aiStreamingOutput || aiOutput}
                </div>
              ) : (
                !aiLoading && (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 rounded-2xl bg-[#f2eeff] flex items-center justify-center mx-auto mb-3">
                      <Sparkles size={26} className="text-violet-300" />
                    </div>
                    <p className="text-sm font-black text-zinc-400">
                      {t('selectActionFirst', locale)}
                    </p>
                    <p className="text-xs text-zinc-300 mt-1">{t('addTopicForCustom', locale)}</p>
                  </div>
                )
              )}
            </div>
            {(aiOutput || aiStreamingOutput) && (
              <div className="px-5 py-4 border-t border-zinc-100 flex gap-2.5 flex-shrink-0">
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(aiOutput || aiStreamingOutput);
                    setAiCopied(true);
                    setTimeout(() => setAiCopied(false), 2200);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 h-10 rounded-full bg-[var(--nc-coral)] hover:opacity-90 text-white text-xs font-extrabold transition-colors"
                >
                  {aiCopied ? (
                    <>
                      <CheckCheck size={13} /> {t('copiedToClipboard', locale)}
                    </>
                  ) : (
                    <>
                      <Copy size={13} /> {t('copyToClipboard', locale)}
                    </>
                  )}
                </button>
                {!aiLoading && (
                  <button
                    onClick={() => {
                      setAiOutput('');
                      setAiStreamingOutput('');
                    }}
                    className="w-10 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center flex-shrink-0"
                  >
                    <X size={14} className="text-zinc-500" />
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}

      <style jsx global>{`
        @keyframes livePulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

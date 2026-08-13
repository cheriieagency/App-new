'use client';

import { useState, useEffect, useCallback, useRef, useId, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client';
import { signOutAndRedirect } from '@/lib/sign-out-client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  BarChart3,
  Users,
  Calendar,
  CalendarDays,
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
  Link as LinkIcon,
  Crown,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  Save,
  Trash2,
  Edit3,
  Check,
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
  ExternalLink,
  Share2,
  BookOpen,
  GraduationCap,
  MessagesSquare,
} from 'lucide-react';
import useHandleStreamResponse from '@/utils/useHandleStreamResponse';
import { useLocale } from '@/lib/locale-context';
import { t, type TranslationKey } from '@/lib/i18n';
import {
  filterInAppNotifications,
  loadNotificationPrefs,
} from '@/lib/notification-prefs';
import useUpload from '@/utils/useUpload';
import dynamic from 'next/dynamic';
import {
  getMockCommunityAdminPayload,
  listManagedCommunities,
  type ManagedCommunity,
} from '@/lib/mock-community-admin';
import WorkspaceSelector from '@/components/planner/WorkspaceSelector';
import CreateWorkspaceModal from '@/components/planner/CreateWorkspaceModal';
import { useWorkspace } from '@/context/WorkspaceContext';
import type { WorkspaceBioBlock } from '@/lib/mock-workspace-profiles';
import { useAdminNav } from '@/components/admin/AdminNavContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import BioPublishSuccessDialog from '@/components/admin/BioPublishSuccessDialog';
import { bioPublicDisplay, bioPublicUrl } from '@/lib/site';
import { useSubscription } from '@/components/common/useSubscription';
import UpgradeModal from '@/components/common/UpgradeModal';
import ConnectSocialsEmpty from '@/components/admin/ConnectSocialsEmpty';
import { useConnectedSocials } from '@/hooks/useConnectedSocials';
import {
  appendUtmParams,
  buildTrackedShortUrl,
  registerDemoDestination,
  slugifyBioProduct,
  type UtmClickStat,
} from '@/lib/bio-utm';
import {
  BIO_THEME_PRESETS,
  bioCanvasStyle,
  buttonRadiusPx,
  buttonShadowCss,
  DEFAULT_BIO_THEME,
  getBioFontFamily,
  getBioGoogleFontsHref,
  hoverEffectClass,
  normalizeBioTheme,
  type BioTheme,
} from '@/lib/bio-theme';
import BioBuilderDesignTab from '@/components/admin/BioBuilderDesignTab';
import GoogleIntegrationCard from '@/components/admin/GoogleIntegrationCard';
import {
  SOCIAL_BRAND_ICONS,
  type SocialBrandId,
} from '@/components/icons/SocialBrandIcons';

const PanelFallback = () => (
  <div className="py-16 text-center text-sm font-semibold text-slate-400">Loading…</div>
);

const LaterAnalyticsPanel = dynamic(
  () => import('@/components/admin/LaterAnalyticsPanel'),
  { loading: PanelFallback }
);
const AdminSettingsPanel = dynamic(
  () => import('@/components/admin/AdminSettingsPanel'),
  { loading: PanelFallback }
);
const SocialInboxPanel = dynamic(
  () => import('@/components/admin/SocialInboxPanel'),
  { loading: PanelFallback }
);
const MediaLibraryPanel = dynamic(
  () => import('@/components/admin/MediaLibraryPanel'),
  { loading: PanelFallback }
);
const ProjectsPanel = dynamic(
  () => import('@/components/admin/ProjectsPanel'),
  { loading: PanelFallback }
);
const CommunityAdminPanel = dynamic(
  () => import('@/components/admin/CommunityAdminPanel'),
  { loading: PanelFallback }
);
const EmailAdminPanel = dynamic(
  () => import('@/components/admin/EmailAdminPanel'),
  { loading: PanelFallback }
);

type BioSubTab = 'blocks' | 'design' | 'analytics' | 'settings';

type CommunityInitialSub = 'overview' | 'event' | 'broadcast';

type BioCategory = 'links' | 'store';

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
  /** Purchase unlocks access to a creator community. */
  grants_community_access?: boolean;
  /** Target community when grants_community_access is true. */
  access_community_id?: number | null;
  /** Coaching: auto-create Google Calendar + Meet on checkout. */
  google_calendar_enabled?: boolean;
}

function parsePriceInput(value: string): number | null {
  const cleaned = value.replace(/\s/g, '').replace(',', '.').replace(/[^\d.]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function formatSek(amount: number): string {
  return `${Math.round(amount).toLocaleString('en-US')} SEK`;
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

/** Soft pastel category icon for bio block list cards. */
function LinkBlockCategoryIcon({ type }: { type: BioBlock['type'] }) {
  const base =
    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border';
  if (type === 'lead_magnet') {
    return (
      <div className={`${base} bg-indigo-50 border-indigo-100 text-indigo-600`}>
        <BookOpen size={18} strokeWidth={2.25} />
      </div>
    );
  }
  if (type === 'course') {
    return (
      <div className={`${base} bg-purple-50 border-purple-100 text-purple-600`}>
        <GraduationCap size={18} strokeWidth={2.25} />
      </div>
    );
  }
  if (type === 'coaching') {
    return (
      <div className={`${base} bg-amber-50 border-amber-100 text-amber-600`}>
        <MessagesSquare size={18} strokeWidth={2.25} />
      </div>
    );
  }
  if (type === 'community') {
    return (
      <div className={`${base} bg-emerald-50 border-emerald-100 text-emerald-600`}>
        <Users size={18} strokeWidth={2.25} />
      </div>
    );
  }
  if (type === 'store') {
    return (
      <div className={`${base} bg-violet-50 border-violet-100 text-violet-600`}>
        <ShoppingBag size={18} strokeWidth={2.25} />
      </div>
    );
  }
  return (
    <div className={`${base} bg-slate-50 border-slate-100 text-slate-600`}>
      <LinkIcon size={18} strokeWidth={2.25} />
    </div>
  );
}

/** Price pill between subtext and action buttons (FREE / paid / coaching). */
function getBlockPricePill(block: BioBlock): { label: string; className: string } | null {
  if (block.type === 'divider') return null;
  const hasPrice = typeof block.price === 'number' && block.price >= 0;
  const hasSale =
    typeof block.sale_price === 'number' &&
    block.sale_price >= 0 &&
    hasPrice &&
    block.sale_price < block.price!;
  const amount = hasSale ? block.sale_price! : hasPrice ? block.price! : null;
  const freeHint = /gratis|free/i.test(`${block.title} ${block.subtitle}`);

  if (block.type === 'coaching') {
    const label = amount != null && amount > 0 ? formatSek(amount) : 'FREE';
    return {
      label,
      className:
        'bg-amber-50 text-amber-700 border border-amber-200 font-mono text-[10px] font-extrabold px-2.5 py-0.5 rounded-full whitespace-nowrap',
    };
  }

  if (amount === 0 || ((amount == null || !hasPrice) && (block.type === 'lead_magnet' || freeHint))) {
    return {
      label: 'FREE',
      className:
        'bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[10px] font-extrabold px-2.5 py-0.5 rounded-full whitespace-nowrap',
    };
  }

  if (amount != null && amount > 0) {
    return {
      label: formatSek(amount),
      className:
        'bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-[10px] font-extrabold px-2.5 py-0.5 rounded-full whitespace-nowrap',
    };
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
    defaultSubtitle: '12 lessons · Start today',
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
    defaultTitle: 'Join the Community',
    defaultSubtitle: 'Free & open',
    category: 'links' as const,
  },
  {
    type: 'link' as const,
    label: 'Link',
    emoji: '🔗',
    color: '#6B7280',
    defaultTitle: 'External link',
    defaultSubtitle: 'Tap for more info',
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
  defaultSubtitle: 'Link to external store',
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
    grants_community_access: block.grants_community_access === true,
    access_community_id:
      typeof block.access_community_id === 'number' && Number.isFinite(block.access_community_id)
        ? block.access_community_id
        : null,
    google_calendar_enabled:
      block.type === 'coaching'
        ? block.google_calendar_enabled !== false
        : block.google_calendar_enabled === true,
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
  {
    id: 'facebook',
    label: 'Facebook',
    color: '#1877F2',
    prefix: 'https://facebook.com/',
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
  'Thanks for the tips!',
  'Kan du repetera?',
  '💯 Toppen!',
  'Where do I buy the course?',
  'Genialt! 🙌',
];

// ── Mobile preview ─────────────────────────────────────────────────────────────
function getPreviewPricePill(block: BioBlock): { label: string; className: string } | null {
  const base = getBlockPricePill(block);
  if (!base) return null;
  if (base.label === 'FREE') {
    return {
      label: 'FREE',
      className:
        'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap',
    };
  }
  return {
    label: base.label,
    className:
      'bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 font-mono text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap',
  };
}

function PreviewBlockRow({ block, theme }: { block: BioBlock; theme: BioTheme }) {
  if (block.type === 'divider') {
    return <div className="h-px mx-2 bg-white/15" />;
  }

  const isFrosted =
    theme.blockVariant === 'frosted' ||
    theme.bgType === 'mesh' ||
    theme.bgType === 'liquid';
  const pricePill = getPreviewPricePill(block);
  const hover = hoverEffectClass(theme.hoverEffect);

  if (isFrosted) {
    return (
      <div
        className={`bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 flex items-center justify-between gap-2 text-white ${hover}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center text-xs flex-shrink-0 overflow-hidden">
            {block.icon_url ? (
              <img src={block.icon_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span>{block.emoji}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-xs text-white truncate leading-snug">{block.title}</p>
            <p className="font-sans text-[10px] text-white/70 truncate">{block.subtitle}</p>
          </div>
        </div>
        {pricePill ? (
          <span className={pricePill.className}>{pricePill.label}</span>
        ) : block.category === 'store' ? (
          <span className="bg-white/10 text-white/80 border border-white/20 font-mono text-[9px] font-bold px-2 py-0.5 rounded-full">
            UTM
          </span>
        ) : null}
      </div>
    );
  }

  const radius = buttonRadiusPx(theme.buttonRadius);
  const variant = theme.blockVariant || 'solid';
  let bg = theme.buttonBg;
  let color = theme.buttonText;
  let border = '1px solid transparent';
  let shadow = buttonShadowCss(theme.buttonShadow);

  if (variant === 'luxe') {
    bg = '#FFFFFF';
    color = '#1C1917';
    border = '1px solid #E7E5E4';
    shadow = '0 1px 2px rgba(15,23,42,0.06)';
  } else if (variant === 'minimal') {
    bg = 'transparent';
    color = theme.nameColor;
    border = `1.5px solid currentColor`;
    shadow = 'none';
  } else {
    bg = '#0F172A';
    color = '#FFFFFF';
    border = '1px solid transparent';
    shadow = buttonShadowCss(theme.buttonShadow);
  }

  return (
    <div
      className={`p-3 flex items-center justify-between gap-2 rounded-2xl ${hover}`}
      style={{
        background: bg,
        color,
        borderRadius: radius,
        boxShadow: shadow,
        border,
        fontFamily: getBioFontFamily(theme.fontId),
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-xs flex-shrink-0 overflow-hidden"
          style={{ background: `${theme.accent}22` }}
        >
          {block.icon_url ? (
            <img src={block.icon_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span>{block.emoji}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-xs truncate leading-snug" style={{ color }}>
            {block.title}
          </p>
          <p className="font-sans text-[10px] truncate" style={{ color, opacity: 0.7 }}>
            {block.subtitle}
          </p>
        </div>
      </div>
      {pricePill && <span className={pricePill.className}>{pricePill.label}</span>}
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
  const { locale } = useLocale();
  const [previewTab, setPreviewTab] = useState<BioCategory>('links');
  const visible = blocks.filter((b) => b.visible);
  const linkBlocks = visible.filter((b) => b.category !== 'store');
  const storeBlocks = visible.filter((b) => b.category === 'store');
  const activeBlocks = previewTab === 'store' ? storeBlocks : linkBlocks;
  const fontFamily = getBioFontFamily(theme.fontId);
  const isGlass =
    theme.blockVariant === 'frosted' ||
    theme.bgType === 'mesh' ||
    theme.bgType === 'liquid';

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

  const avatarRadius = theme.avatarShape === 'squircle' ? '1.5rem' : '9999px';
  const canvas = isGlass
    ? bioCanvasStyle({ ...theme, bg: theme.bg || '#0B0F17', bgType: theme.bgType || 'mesh' })
    : bioCanvasStyle(theme);
  const coverOn = theme.coverEnabled || isGlass;
  const coverUrl =
    theme.coverImageUrl ||
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80';
  const socialIcons = socialLinks.slice(0, 5).map((sl, i) => {
    const plat = SOCIAL_PLATFORMS.find((p) => p.id === sl.platform) ?? SOCIAL_PLATFORMS[6];
    return (
      <div
        key={i}
        className="w-7 h-7 rounded-full flex items-center justify-center border border-white/15 bg-white/10 backdrop-blur-md"
        style={{ color: plat.color }}
      >
        <SocialPlatformIcon id={plat.id} size={12} />
      </div>
    );
  });

  return (
    <div className="flex items-center justify-center py-2">
      <style jsx global>{`
        @keyframes bio-liquid {
          0%,
          100% {
            background-position: 0% 40%;
          }
          50% {
            background-position: 100% 60%;
          }
        }
        .bio-block-shimmer {
          position: relative;
          overflow: hidden;
        }
        .bio-block-shimmer::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            105deg,
            transparent 40%,
            rgba(255, 255, 255, 0.35) 50%,
            transparent 60%
          );
          transform: translateX(-120%);
          pointer-events: none;
        }
        .bio-block-shimmer:hover::after {
          animation: bio-shimmer 0.7s ease;
        }
        @keyframes bio-shimmer {
          to {
            transform: translateX(120%);
          }
        }
      `}</style>
      <div style={{ width: 260 }}>
        <div className="rounded-[36px] p-[3px] shadow-2xl bg-gradient-to-b from-slate-600 via-slate-800 to-slate-950">
          <div
            className="rounded-[33px] overflow-hidden relative"
            style={{ height: 560, background: isGlass ? '#0B0F17' : theme.bg }}
          >
            <div className="absolute inset-0" style={canvas} />
            <div className="relative z-10 flex flex-col h-full">
              {/* Status bar */}
              <div className="h-8 flex items-center justify-between px-5 flex-shrink-0 relative z-20">
                <span
                  className={`text-[9px] font-bold ${isGlass ? 'text-white/90' : ''}`}
                  style={isGlass ? undefined : { color: theme.nameColor }}
                >
                  9:41
                </span>
                <div className="w-20 h-3.5 bg-black/50 rounded-full border border-white/10" />
                <div className="flex gap-0.5">
                  <div className={`w-2.5 h-2 rounded-sm ${isGlass ? 'bg-white/50' : ''}`} style={isGlass ? undefined : { background: `${theme.nameColor}66` }} />
                  <div className={`w-2 h-2 rounded-full ${isGlass ? 'bg-white/50' : ''}`} style={isGlass ? undefined : { background: `${theme.nameColor}66` }} />
                </div>
              </div>

              <div className="overflow-y-auto flex-1" style={{ fontFamily }}>
                {/* Cover banner */}
                {coverOn && (
                  <div className="relative h-24 w-full overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600">
                    <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F17] via-[#0B0F17]/40 to-transparent" />
                  </div>
                )}

                {/* Profile header */}
                <div className={`text-center px-4 ${coverOn ? '-mt-10' : 'pt-4'}`}>
                  <div className="relative w-20 h-20 mx-auto mb-2.5">
                    <div
                      className="w-20 h-20 flex items-center justify-center overflow-hidden border-2 border-white/80 shadow-xl object-cover"
                      style={{
                        borderRadius: avatarRadius,
                        background: `linear-gradient(135deg, ${theme.accent}cc, #6366f1)`,
                      }}
                    >
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Crown size={22} className="text-white" />
                      )}
                    </div>
                    {(theme.verifiedBadge || isGlass) && (
                      <span
                        className="absolute bottom-0.5 right-0.5 bg-indigo-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[9px] border-2 border-slate-950 shadow"
                        title="Verified"
                      >
                        <Check size={10} strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-[13px] font-extrabold tracking-tight ${isGlass ? 'text-white' : ''}`}
                    style={isGlass ? undefined : { color: theme.nameColor }}
                  >
                    {displayName || 'Creator Name'}
                  </p>
                  <p className="font-mono text-[11px] text-slate-400 mt-0.5">
                    @{handle || 'creator'}
                  </p>
                  <p
                    className={`text-[11px] font-medium leading-snug mt-1.5 px-1 ${isGlass ? 'text-white/80' : ''}`}
                    style={isGlass ? undefined : { color: theme.mutedColor }}
                  >
                    {bioText || 'Bio text here...'}
                  </p>
                  {theme.socialLayout === 'header' && socialIcons.length > 0 && (
                    <div className="flex items-center justify-center gap-1.5 mt-2.5 flex-wrap">
                      {socialIcons}
                    </div>
                  )}
                </div>

                <div className="px-3 pt-3 pb-2 space-y-2">
                  {/* Segmented tabs */}
                  <div
                    className={
                      isGlass
                        ? 'bg-white/10 backdrop-blur-md p-1 rounded-2xl border border-white/10 flex items-center gap-0.5'
                        : 'flex items-center gap-0.5 p-1 rounded-2xl border border-slate-200 bg-slate-50'
                    }
                  >
                    {(
                      [
                        { key: 'links' as const, label: 'Links' },
                        { key: 'store' as const, label: 'Store 🛍️' },
                      ] as const
                    ).map(({ key, label }) => {
                      const active = previewTab === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setPreviewTab(key)}
                          className={`flex-1 h-8 min-h-[32px] rounded-xl text-[9px] font-extrabold uppercase tracking-[0.14em] transition-all ${
                            isGlass
                              ? active
                                ? 'bg-white/20 text-white shadow-xs'
                                : 'text-white/70 opacity-70'
                              : active
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-400'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {activeBlocks.length === 0 ? (
                    <p className={`text-[10px] px-0.5 pt-2 text-center ${isGlass ? 'text-white/40' : 'text-slate-400'}`}>
                      {previewTab === 'store'
                        ? t('noStoreProductsYet', locale)
                        : t('noLinksYet', locale)}
                    </p>
                  ) : (
                    activeBlocks.map((block) => (
                      <PreviewBlockRow key={block.id} block={block} theme={theme} />
                    ))
                  )}
                </div>
              </div>

              {theme.socialLayout === 'dock' && socialIcons.length > 0 && (
                <div className="px-3 pb-1 flex-shrink-0">
                  <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
                    {socialIcons}
                  </div>
                </div>
              )}

              {/* Watermark footer */}
              <div className="px-3 pb-3 pt-1 flex-shrink-0 text-center">
                <p
                  className={`font-mono text-[8px] uppercase tracking-widest ${
                    isGlass ? 'text-white/40' : 'text-slate-400/80'
                  }`}
                >
                  Powered by clikd: Studio
                </p>
              </div>
            </div>
          </div>
        </div>
        <p className="text-center text-[10px] font-mono font-bold text-zinc-400 mt-2.5">
          clikd.app/@{handle || 'creator'}
        </p>
      </div>
    </div>
  );
}

/** Coaching block: toggle Google Calendar / Meet booking + connect CTA. */
function CoachingGoogleCalendarControls({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id;
  const { data: status } = useQuery({
    queryKey: ['google-status', workspaceId],
    queryFn: async () => {
      const qs = workspaceId
        ? `?workspaceId=${encodeURIComponent(workspaceId)}`
        : '';
      const r = await fetch(`/api/admin/google/status${qs}`);
      if (!r.ok) throw new Error('status failed');
      return r.json() as Promise<{ connected: boolean; email: string | null }>;
    },
    enabled: Boolean(workspaceId),
  });
  const { data: health } = useQuery({
    queryKey: ['google-health'],
    queryFn: async () => {
      const r = await fetch('/api/admin/google/health');
      if (!r.ok) throw new Error('health failed');
      return r.json() as Promise<{
        oauthReady: boolean;
        issues: string[];
        hint: string;
      }>;
    },
  });

  const connected = Boolean(status?.connected);
  const connectUrl = workspaceId
    ? `/api/auth/google/login?workspaceId=${encodeURIComponent(workspaceId)}`
    : '/api/auth/google/login';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2.5 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-600 inline-flex items-center gap-1.5">
            <CalendarDays size={12} className="text-[#F472B6]" />
            Google Calendar & Meet
          </p>
          <p className="text-[10px] text-slate-400 font-medium leading-snug mt-0.5">
            Auto-create a Meet link when someone buys this 1:1 session.
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => onChange(false)}
            className={`h-9 min-h-[36px] px-2.5 rounded-lg text-[10px] font-bold border transition-colors ${
              !enabled
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Off
          </button>
          <button
            type="button"
            onClick={() => onChange(true)}
            className={`h-9 min-h-[36px] px-2.5 rounded-lg text-[10px] font-bold border transition-colors ${
              enabled
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            On
          </button>
        </div>
      </div>
      {enabled && !connected && (
        <div className="rounded-lg border border-[#E9D5FF] bg-[#FDF4FF] px-2.5 py-2 space-y-2">
          <p className="text-[10px] font-semibold text-slate-700 leading-snug">
            {health?.oauthReady === false
              ? health.hint
              : 'Connect Google to enable Calendar + Meet for this coaching block.'}
          </p>
          {health?.oauthReady !== false && (
            <a
              href={connectUrl}
              className="inline-flex items-center justify-center h-10 min-h-[40px] w-full rounded-lg bg-[#2B2568] text-white text-[11px] font-extrabold"
            >
              Connect Google Calendar
            </a>
          )}
        </div>
      )}
      {enabled && connected && (
        <p className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-2 font-medium">
          Connected ✓ {status?.email ? `· ${status.email}` : ''} — Meet links
          send on purchase.
        </p>
      )}
    </div>
  );
}

// ── Bio drag block ─────────────────────────────────────────────────────────────
function BioDragBlock({
  block,
  index,
  dragging,
  handle,
  communities,
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
  communities: ManagedCommunity[];
  onDragStart: (i: number) => void;
  onDragOver: (i: number) => void;
  onDrop: () => void;
  onUpdate: (i: number, b: Partial<BioBlock>) => void;
  onDelete: (i: number) => void;
  onToggle: (i: number) => void;
}) {
  const { locale } = useLocale();
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
  const accessCommunity = communities.find((c) => c.id === block.access_community_id);

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
  const pricePill = getBlockPricePill(block);

  return (
    <div
      draggable={!editing}
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(index);
      }}
      onDrop={onDrop}
      className={`group bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs transition-all ${editing ? 'cursor-default space-y-3' : 'cursor-grab'} ${dragging === index ? 'opacity-40 scale-95' : 'hover:border-indigo-300'} ${block.visible ? '' : 'border-dashed opacity-60'}`}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <GripVertical size={15} className="text-slate-300 hover:text-slate-500 flex-shrink-0" />
          <button
            type="button"
            onClick={() => {
              setEditing(true);
              setIconTab(block.icon_url ? 'upload' : 'emoji');
            }}
            className="relative flex-shrink-0 rounded-xl ring-offset-1 hover:ring-2 hover:ring-indigo-300/50 transition-shadow"
            title="Byt ikon"
          >
            <LinkBlockCategoryIcon type={block.type} />
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
                className="w-full text-xs font-extrabold text-slate-900 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-300"
              />
              {!isStore && (
                <input
                  value={block.subtitle}
                  onChange={(e) => onUpdate(index, { subtitle: e.target.value })}
                  className="w-full text-[10px] font-mono text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-300"
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
                      className="w-full text-[10px] text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-300"
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
                      className="w-full text-[10px] text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-300"
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
                    className="w-full text-[10px] text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-300"
                  />
                  <p className="text-[9px] text-zinc-400 font-medium break-all">
                    UTM: {utmDestination || 'Add a product URL'}
                  </p>
                </>
              )}
              {/* Community access unlock after purchase */}
              <div className="rounded-xl border border-slate-200 bg-white p-2.5 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-600">
                      {t('communityAccessLabel', locale)}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium leading-snug">
                      {t('communityAccessHint', locale)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdate(index, {
                          grants_community_access: false,
                          access_community_id: null,
                        })
                      }
                      className={`h-9 min-h-[36px] px-2.5 rounded-lg text-[10px] font-bold border transition-colors ${
                        !block.grants_community_access
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {t('noLabel', locale)}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdate(index, {
                          grants_community_access: true,
                          access_community_id:
                            block.access_community_id ?? communities[0]?.id ?? null,
                        })
                      }
                      className={`h-9 min-h-[36px] px-2.5 rounded-lg text-[10px] font-bold border transition-colors ${
                        block.grants_community_access
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {t('yesLabel', locale)}
                    </button>
                  </div>
                </div>
                {block.grants_community_access && (
                  <div className="space-y-2">
                    <label className="block">
                      <span className="text-[9px] font-extrabold uppercase tracking-wide text-zinc-400 block mb-0.5">
                        {t('whichCommunity', locale)}
                      </span>
                      <select
                        value={block.access_community_id ?? ''}
                        onChange={(e) =>
                          onUpdate(index, {
                            access_community_id: e.target.value
                              ? Number(e.target.value)
                              : null,
                          })
                        }
                        className="w-full h-11 min-h-[44px] text-[11px] font-semibold text-slate-800 bg-zinc-50 border border-zinc-200 rounded-lg px-2 focus:outline-none focus:border-indigo-300"
                      >
                        {communities.length === 0 && (
                          <option value="">No communities yet</option>
                        )}
                        {communities.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-2 font-medium leading-snug">
                      {t('communityAccessEmailNote', locale)}
                    </p>
                  </div>
                )}
              </div>
              {block.type === 'coaching' && (
                <CoachingGoogleCalendarControls
                  enabled={block.google_calendar_enabled !== false}
                  onChange={(enabled) =>
                    onUpdate(index, { google_calendar_enabled: enabled })
                  }
                />
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
            <div className="min-w-0 flex-1">
              <p className="font-extrabold text-xs text-slate-900 leading-snug truncate">
                {block.title || '(Inget namn)'}
              </p>
              <p className="font-mono text-[10px] text-slate-400 truncate">{block.subtitle}</p>
              {block.grants_community_access && accessCommunity && (
                <p className="text-[9px] text-emerald-600 font-semibold truncate mt-0.5">
                  {t('unlocksLabel', locale)} · {accessCommunity.name}
                </p>
              )}
              {block.type === 'coaching' && block.google_calendar_enabled !== false && (
                <p className="text-[9px] text-[#2B2568] font-semibold truncate mt-0.5 inline-flex items-center gap-1">
                  <CalendarDays size={10} className="text-[#F472B6]" />
                  Google Calendar + Meet
                </p>
              )}
              {isStore && block.destination_url && (
                <p className="text-[9px] text-zinc-300 truncate font-mono mt-0.5">{trackedUrl}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {!editing && pricePill && (
            <span className={pricePill.className}>{pricePill.label}</span>
          )}
          {isStore && (
            <button
              type="button"
              onClick={() => void copyUtm()}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border ${utmCopied ? 'bg-green-50 text-green-600 border-green-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
              title="Copy UTM link"
            >
              {utmCopied ? <Check size={12} /> : <Copy size={12} />}
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className={`w-8 h-8 min-h-[32px] min-w-[32px] rounded-xl flex items-center justify-center transition-all border ${editing ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'}`}
            aria-label="Edit"
          >
            {editing ? <Check size={12} /> : <Edit3 size={12} />}
          </button>
          <button
            type="button"
            onClick={() => onToggle(index)}
            role="switch"
            aria-checked={block.visible}
            className="flex items-center justify-center flex-shrink-0"
            aria-label="Toggle active"
          >
            {block.visible ? (
              <ToggleRight className="text-indigo-600 text-base" size={22} />
            ) : (
              <ToggleLeft className="text-slate-300 text-base" size={22} />
            )}
          </button>
          <button
            type="button"
            onClick={() => onDelete(index)}
            className="w-8 h-8 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center hover:bg-red-100 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 size={12} className="text-red-400" />
          </button>
        </div>
      </div>

      {editing && (
        <div className="px-3 pb-3 pt-0">
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-zinc-400">
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
                    Remove image (use emoji)
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

// ── Social links list (add via the single “Add Link / Product” drawer) ─────────
function SocialLinksEditor({
  links,
  onChange,
}: {
  links: SocialLink[];
  onChange: (links: SocialLink[]) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
          <GlobeIcon size={12} /> Social media links
        </h4>
        <span className="text-[10px] font-semibold text-slate-400">
          Use Add Link / Product
        </span>
      </div>
      <div className="space-y-2">
        {links.length === 0 && (
          <div className="text-center py-5 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-slate-400">
            <GlobeIcon size={20} className="mx-auto mb-1.5 opacity-50" />
            <p className="text-xs font-bold text-slate-500">No social links yet</p>
            <p className="text-[10px] mt-0.5">
              Open Add Link / Product → Social media
            </p>
          </div>
        )}
        {links.map((link, i) => {
          const plat =
            SOCIAL_PLATFORMS.find((p) => p.id === link.platform) ?? SOCIAL_PLATFORMS[6];
          return (
            <div
              key={`${link.platform}-${i}`}
              className="flex items-center gap-2 p-2.5 min-h-[44px] rounded-xl bg-slate-50 border border-slate-100 group"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${plat.color}15`, color: plat.color }}
              >
                <SocialPlatformIcon id={plat.id} size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-0.5">
                  {plat.label}
                </p>
                <input
                  value={link.url}
                  onChange={(e) =>
                    onChange(
                      links.map((l, idx) => (idx === i ? { ...l, url: e.target.value } : l))
                    )
                  }
                  className="w-full text-xs text-slate-700 bg-transparent focus:outline-none truncate"
                  placeholder="https://..."
                />
              </div>
              <button
                type="button"
                onClick={() => onChange(links.filter((_, idx) => idx !== i))}
                className="h-9 w-9 min-h-[36px] min-w-[36px] rounded-lg bg-red-50 flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0"
                aria-label="Remove social link"
              >
                <X size={12} className="text-red-400" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main admin page ────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    hasFeature,
    requestUpgrade,
    upgradeOpen,
    setUpgradeOpen,
    upgradeTarget,
  } = useSubscription();
  const canUseAi = hasFeature('aiCopilotSuite');
  const { locale } = useLocale();
  const {
    activeWorkspace,
    activeWorkspaceId,
    setActiveWorkspaceId,
    brandWorkspaces,
    updateActiveBio,
    refreshWorkspaces,
  } = useWorkspace();
  const adminCommunityId = activeWorkspace.community.community_id;
  const { section, setSection } = useAdminNav();
  const { hasConnectedSocials, isLoading: socialsLoading } = useConnectedSocials();

  // Planner is its own route — never show the admin interstitial for ?tab=calendar.
  useEffect(() => {
    if (section === 'calendar') {
      router.replace('/planner');
    }
  }, [section, router]);

  const [communityInitialSub, setCommunityInitialSub] =
    useState<CommunityInitialSub>('overview');
  const [bioTheme, setBioTheme] = useState<BioTheme>(DEFAULT_BIO_THEME);
  const [bioSubTab, setBioSubTab] = useState<BioSubTab>('design');
  const [saved, setSaved] = useState('');
  const [adminSearch, setAdminSearch] = useState('');
  const [createWsOpen, setCreateWsOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const bioHydratingRef = useRef(false);
  const [headerNotifs, setHeaderNotifs] = useState(() =>
    filterInAppNotifications(loadNotificationPrefs(session?.user?.id))
  );

  // Keep header bell in sync with Settings → Notifications preferences.
  useEffect(() => {
    const refresh = () => {
      setHeaderNotifs(
        filterInAppNotifications(loadNotificationPrefs(session?.user?.id))
      );
    };
    refresh();
    const onPrefs = () => refresh();
    window.addEventListener('clikd:notif-prefs', onPrefs as EventListener);
    window.addEventListener('storage', onPrefs);
    return () => {
      window.removeEventListener('clikd:notif-prefs', onPrefs as EventListener);
      window.removeEventListener('storage', onPrefs);
    };
  }, [session?.user?.id]);

  // Deep-link support for community sub-views.
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get('tab');
    if (!raw) return;
    if (raw === 'content' || raw === 'event') {
      setCommunityInitialSub('event');
      return;
    }
    if (raw === 'broadcast') {
      setCommunityInitialSub('broadcast');
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
  const [liveOrigin, setLiveOrigin] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);

  // Bio builder
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [blocks, setBlocks] = useState<BioBlock[]>([
    {
      id: '1',
      type: 'lead_magnet',
      category: 'links',
      title: 'Live Hook Checklist',
      subtitle: 'Ladda ned gratis PDF-guide • 142 nedladdningar',
      emoji: '📘',
      color: '#3B82F6',
      visible: true,
      price: 0,
    },
    {
      id: '2',
      type: 'course',
      category: 'links',
      title: 'Kurs: Clikd Studio',
      subtitle: 'Onlinekurs · 12 lektioner • Masterclass',
      emoji: '🎓',
      color: '#9b8afb',
      visible: true,
      price: 1499,
    },
    {
      id: '3',
      type: 'coaching',
      category: 'links',
      title: '1:1 Coaching',
      subtitle: 'Boka ett samtal • 45 min Zoom',
      emoji: '🤝',
      color: '#10B981',
      visible: true,
      price: 599,
      grants_community_access: true,
      access_community_id: 101,
    },
    {
      id: '4',
      type: 'community',
      category: 'links',
      title: 'Join the Community',
      subtitle: 'Free & open • Webbinarier & RSVP',
      emoji: '🏠',
      color: '#F59E0B',
      visible: true,
      price: 0,
      grants_community_access: true,
      access_community_id: 101,
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
      price: 1499,
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
      price: 299,
    },
  ]);
  const [bioHandle, setBioHandle] = useState('');
  const [bioDisplayName, setBioDisplayName] = useState('');
  const [bioBioText, setBioBioText] = useState('');
  const [bioAvatarUrl, setBioAvatarUrl] = useState('');
  const [bioLinkCopied, setBioLinkCopied] = useState(false);
  const [bioSaved, setBioSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishDialogFirst, setPublishDialogFirst] = useState(false);
  const [publishDialogHandle, setPublishDialogHandle] = useState('creator');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [drawerSocialPlatform, setDrawerSocialPlatform] = useState('instagram');
  const [drawerSocialUrl, setDrawerSocialUrl] = useState('');
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  // Creator communities available for product → membership unlock.
  const bioCommunities = useMemo(() => listManagedCommunities(), []);

  // Set stream key once on mount using stable uid (no Math.random / Date.now in render path)
  useEffect(() => {
    const safe = uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'nclivekey';
    const key = `nc-live-${safe}`;
    setStreamKey(key);
    setLiveOrigin(window.location.origin);
    // Register a public session so the share link resolves before Start Live.
    void fetch(`/api/live/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'upsert',
        title: 'Live Broadcast',
        creator_name: 'Creator',
        is_live: false,
      }),
    }).catch(() => undefined);
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
        google_calendar_enabled: type === 'coaching',
      },
    ]);
    setAddDrawerOpen(false);
  };

  const addSocialLinkFromDrawer = () => {
    if (!drawerSocialUrl.trim()) return;
    const platform = SOCIAL_PLATFORMS.find((p) => p.id === drawerSocialPlatform);
    let finalUrl = drawerSocialUrl.trim();
    if (platform?.prefix && !finalUrl.startsWith('http')) {
      finalUrl = platform.prefix + finalUrl.replace('@', '');
    }
    setSocialLinks((prev) => [
      ...prev,
      { platform: drawerSocialPlatform, url: finalUrl },
    ]);
    setDrawerSocialUrl('');
    setDrawerSocialPlatform('instagram');
    setAddDrawerOpen(false);
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
    enabled: !!session && section === 'biobuilder',
    queryFn: async () => {
      const r = await fetch('/api/admin/bio');
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
  });

  // Hydrate Bio Builder from the active Team Workspace / Brand Profile.
  useEffect(() => {
    bioHydratingRef.current = true;
    const bio = activeWorkspace.bio;
    setBlocks(
      bio.blocks.map((b) =>
        normalizeBioBlock(b as Partial<BioBlock> & { id: string })
      )
    );
    setBioHandle(bio.handle.replace(/^@/, ''));
    setBioDisplayName(bio.display_name);
    setBioBioText(bio.bio_text);
    setBioAvatarUrl(bio.profile_photo || '');
    setBioTheme(normalizeBioTheme(bio.theme));
    const t = window.setTimeout(() => {
      bioHydratingRef.current = false;
    }, 0);
    return () => window.clearTimeout(t);
  }, [activeWorkspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist Bio edits into the global workspace profile (instant tab sync).
  useEffect(() => {
    if (bioHydratingRef.current) return;
    const themeLabel =
      BIO_THEME_PRESETS.find((p) => p.presetId === bioTheme.presetId)?.label ||
      activeWorkspace.bio.theme_label;
    updateActiveBio({
      profile_photo: bioAvatarUrl || null,
      display_name: bioDisplayName,
      handle: bioHandle.replace(/^@/, ''),
      bio_text: bioBioText,
      theme: bioTheme,
      theme_label: themeLabel,
      blocks: blocks as WorkspaceBioBlock[],
    });
  }, [
    blocks,
    bioHandle,
    bioDisplayName,
    bioBioText,
    bioAvatarUrl,
    bioTheme,
    updateActiveBio,
  ]);

  // Legacy API bio load only fills empty fields when workspace bio is blank.
  useEffect(() => {
    if (!bioData || activeWorkspace.bio.blocks.length > 0) return;
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
  }, [bioData, activeWorkspace.bio.blocks.length]);

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
      const cleanHandle = (bioHandle || activeWorkspace.handle || 'creator')
        .replace(/^@/, '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '') || 'creator';

      // Persist into workspace profile before/alongside API save.
      updateActiveBio({
        profile_photo: bioAvatarUrl || null,
        display_name: bioDisplayName,
        handle: cleanHandle,
        bio_text: bioBioText,
        theme: bioTheme,
        theme_label:
          BIO_THEME_PRESETS.find((p) => p.presetId === bioTheme.presetId)?.label ||
          activeWorkspace.bio.theme_label,
        blocks: blocks as WorkspaceBioBlock[],
      });

      const r = await fetch('/api/admin/bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blocks,
          handle: cleanHandle,
          display_name: bioDisplayName,
          bio_text: bioBioText,
          avatar_url: bioAvatarUrl,
          social_links: socialLinks,
          theme: bioTheme,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || 'Failed to publish');
      return { ...data, handle: cleanHandle } as {
        success?: boolean;
        first_publish?: boolean;
        handle: string;
        demo?: boolean;
      };
    },
    onSuccess: (data) => {
      const handle = data.handle || 'creator';
      const storageKey = `clikd_bio_published_${activeWorkspaceId || handle}`;
      let firstPublish = Boolean(data.first_publish && !data.demo);
      try {
        if (typeof window !== 'undefined') {
          const seen = window.localStorage.getItem(storageKey);
          // Local flag covers demo mode + first-ever publish in this browser.
          if (!seen) {
            firstPublish = true;
            window.localStorage.setItem(storageKey, new Date().toISOString());
          }
        }
      } catch {
        /* ignore storage */
      }

      setBioHandle(handle);
      setBioSaved(true);
      window.setTimeout(() => setBioSaved(false), 2500);
      setPublishDialogFirst(firstPublish);
      setPublishDialogHandle(handle);
      setPublishDialogOpen(true);
      queryClient.invalidateQueries({ queryKey: ['bio'] });
    },
  });

  const patchBioTheme = <K extends keyof BioTheme>(key: K, value: BioTheme[K]) => {
    setBioTheme((prev) => ({ ...prev, [key]: value, presetId: 'custom' }));
  };

  const exportEmails = () => {
    if (typeof document === 'undefined') return;
    const rows = activeWorkspace.analytics.recent_emails.length
      ? activeWorkspace.analytics.recent_emails
      : (stats?.emails ?? []);
    if (!rows.length) return;
    const csv = ['Email,Name,Joined']
      .concat(rows.map((e: any) => `${e.email},${e.name},${e.created_at}`))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeWorkspace.name.replace(/\s+/g, '-').toLowerCase()}-members.csv`;
    a.click();
  };

  const runCreatorAI = async (action: string) => {
    if (!canUseAi) {
      requestUpgrade('pro');
      return;
    }
    setAiLoading(true);
    setAiOutput('');
    setAiStreamingOutput('');
    try {
      const res = await fetch('/api/ai/creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, topic: aiTopic }),
      });
      if (res.status === 403) {
        requestUpgrade('pro');
        setAiLoading(false);
        return;
      }
      if (!res.ok) throw new Error('AI request failed');
      handleAIStream(res);
    } catch (err) {
      console.error(err);
      setAiLoading(false);
    }
  };

  const syncPublicLive = useCallback(
    async (action: 'start' | 'stop' | 'update', viewerCount?: number) => {
      if (!streamKey || streamKey.includes('xxxxxxxx')) return;
      const communityName = activeWorkspace.name;
      try {
        await fetch(`/api/live/${encodeURIComponent(streamKey)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            title: liveTitle || 'Live Broadcast',
            creator_name: session?.user?.name || 'Creator',
            community_name: communityName,
            viewer_count: viewerCount,
          }),
        });
      } catch {
        /* non-blocking demo sync */
      }
    },
    [streamKey, liveTitle, session?.user?.name, activeWorkspace.name]
  );

  const startBroadcast = useCallback(() => {
    setAttendeeCount(28);
    setLiveChat([]);
    chatTickRef.current = 0;
    setIsLive(true);
    void syncPublicLive('start', 28);
  }, [syncPublicLive]);

  const endBroadcast = useCallback(() => {
    setIsLive(false);
    void syncPublicLive('stop');
  }, [syncPublicLive]);

  // Keep public live page title / viewers in sync while broadcasting.
  useEffect(() => {
    if (!isLive || !streamKey || streamKey.includes('xxxxxxxx')) return;
    void syncPublicLive('update', attendeeCount);
  }, [isLive, liveTitle, attendeeCount, streamKey, syncPublicLive]);

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

  const BIO_SUB_TABS: { key: BioSubTab; label: string }[] = [
    { key: 'design', label: t('bioTabDesign', locale) },
    { key: 'blocks', label: t('bioTabBlocks', locale) },
    { key: 'analytics', label: t('bioTabAnalytics', locale) },
    { key: 'settings', label: t('settings', locale) },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Top navbar — minimal Clikd shell */}
      <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between gap-4">
        <div className="md:hidden flex-shrink-0 min-w-0 max-w-[42%]">
          <WorkspaceSelector
            workspaces={brandWorkspaces}
            activeId={activeWorkspaceId}
            onSelect={(ws) => setActiveWorkspaceId(ws.id)}
            onCreateNew={() => setCreateWsOpen(true)}
          />
        </div>
        <div className="relative w-full max-w-md hidden sm:block flex-1">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            value={adminSearch}
            onChange={(e) => setAdminSearch(e.target.value)}
            placeholder={t('adminSearchPlaceholder', locale)}
            className="w-full max-w-md bg-white text-sm rounded-xl border border-slate-200/90 pl-10 pr-14 py-2 min-h-[40px] font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-300"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
            ⌘K
          </kbd>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-auto">
          <LanguageSwitcher className="hidden lg:block [&_button]:bg-transparent [&_button]:border-0 [&_button]:shadow-none [&_button]:h-9 [&_button]:min-h-[36px] [&_button]:text-slate-500 [&_button]:px-2 [&_button]:text-xs [&_button]:font-semibold" />
          <button
            type="button"
            onClick={() => {
              if (!canUseAi) {
                requestUpgrade('pro');
                return;
              }
              setShowCreatorAI(true);
            }}
            className="hidden xl:inline-flex items-center gap-1.5 h-9 min-h-[36px] px-2.5 rounded-lg text-slate-500 text-xs font-semibold hover:bg-slate-50 hover:text-slate-800 transition-colors"
            title={t('aiCopilotTitle', locale)}
          >
            <Sparkles size={14} />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setAccountMenuOpen(false);
                setNotifOpen((v) => !v);
              }}
              className="h-9 w-9 min-h-[36px] min-w-[36px] rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-500 relative transition-colors"
              aria-label={t('notificationsTitle', locale)}
            >
              <Bell size={17} strokeWidth={1.75} />
              {headerNotifs.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#F472B6]" />
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200/90 rounded-2xl shadow-xl z-40 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900">
                    {t('notificationsTitle', locale)}
                  </p>
                </div>
                {headerNotifs.length === 0 ? (
                  <p className="px-4 py-4 text-xs font-medium text-slate-500">
                    {t('notifEmpty', locale)}
                  </p>
                ) : (
                  headerNotifs.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="w-full text-left px-4 py-3 text-xs font-medium text-slate-600 hover:bg-slate-50 border-b border-slate-50 last:border-0"
                    >
                      {t(n.messageKey as TranslationKey, locale)}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setNotifOpen(false);
                setAccountMenuOpen((v) => !v);
              }}
              className="h-9 w-9 min-h-[36px] min-w-[36px] rounded-full overflow-hidden border border-slate-200 shadow-sm bg-slate-900 flex items-center justify-center text-white text-xs font-bold"
              title={session.user.name || t('accountMenuTitle', locale)}
              aria-expanded={accountMenuOpen}
              aria-haspopup="menu"
            >
              {session.user.image ? (
                <img src={session.user.image} alt="" className="w-full h-full object-cover" />
              ) : (
                (session.user.name?.[0] ?? 'U').toLowerCase()
              )}
            </button>
            {accountMenuOpen && (
              <>
                <button
                  type="button"
                  aria-label={t('settingsClose', locale)}
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setAccountMenuOpen(false)}
                />
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200/90 rounded-2xl shadow-xl z-50 overflow-hidden"
                >
                  <div className="px-4 py-4 border-b border-slate-100 flex items-center gap-3">
                    <div className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-full overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {session.user.image ? (
                        <img
                          src={session.user.image}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (session.user.name?.[0] ?? 'U').toLowerCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-extrabold text-slate-900 truncate">
                        {session.user.name || t('accountMenuCreator', locale)}
                      </p>
                      <p className="text-xs font-medium text-slate-500 truncate flex items-center gap-1 mt-0.5">
                        <Mail size={11} className="flex-shrink-0 text-slate-400" />
                        {session.user.email || '—'}
                      </p>
                    </div>
                  </div>

                  <div className="px-4 py-3 border-b border-slate-100 space-y-2">
                    <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
                      {t('accountMenuTitle', locale)}
                    </p>
                    <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          {t('email', locale)}
                        </span>
                        <span className="text-xs font-semibold text-slate-700 text-right break-all">
                          {session.user.email || '—'}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          {t('accountMenuWorkspace', locale)}
                        </span>
                        <span className="text-xs font-semibold text-slate-700 text-right truncate">
                          {activeWorkspace.name} ({activeWorkspace.handle})
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          {t('accountMenuRole', locale)}
                        </span>
                        <span className="text-xs font-semibold text-slate-700">
                          {t('accountMenuCreator', locale)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="py-1.5">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        setSection('settings');
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 min-h-[44px] text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Settings size={14} className="text-slate-400" />
                      {t('accountMenuSettingsBilling', locale)}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        setSection('biobuilder');
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 min-h-[44px] text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <UserCheck size={14} className="text-slate-400" />
                      {t('accountMenuProfileBio', locale)}
                    </button>
                  </div>

                  <div className="border-t border-slate-100 p-2">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        void signOutAndRedirect('/');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-3 min-h-[44px] rounded-xl text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <LogOut size={14} />
                      {t('signOut', locale)}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-8 pb-24 md:pb-16">
        {section === 'settings' ? (
          <AdminSettingsPanel />
        ) : socialsLoading ? (
          <div className="py-16 text-center text-sm font-semibold text-slate-400">
            Loading…
          </div>
        ) : !hasConnectedSocials ? (
          <ConnectSocialsEmpty />
        ) : (
          <>
        {section === 'analytics' && <LaterAnalyticsPanel />}
        {section === 'media' && <MediaLibraryPanel />}
        {section === 'projects' && <ProjectsPanel />}
        {section === 'inbox' && <SocialInboxPanel />}

        {/* ── COMMUNITY (includes Event + Sänd Live) ── */}
        {section === 'community' && (
          <CommunityAdminPanel
            initialSubTab={communityInitialSub}
            isLive={isLive}
            eventPanel={
          <div className="space-y-5">
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-6 max-w-2xl">
              <h3 className="text-sm font-extrabold text-slate-900 mb-4 flex items-center gap-2">
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
                  className="relative w-full h-36 min-h-[144px] rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden flex flex-col items-center justify-center gap-1.5 hover:border-[#9089F0] transition-colors"
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
                      className="text-slate-400"
                      style={{ animation: 'spin 1s linear infinite' }}
                    />
                  ) : (
                    <>
                      <ImageIcon size={22} className="text-slate-300" />
                      <span className="text-xs font-bold text-slate-500">Add header image</span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Shown at the top of the event
                      </span>
                    </>
                  )}
                </button>
                {eventForm.image_url && (
                  <button
                    type="button"
                    onClick={() => setEventForm((p) => ({ ...p, image_url: '' }))}
                    className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors -mt-2"
                  >
                    Ta bort bild
                  </button>
                )}

                <Input
                  placeholder={t('eventTitle', locale)}
                  value={eventForm.title}
                  onChange={(e) => setEventForm((p) => ({ ...p, title: e.target.value }))}
                  className="rounded-xl bg-slate-50 border-slate-100 h-11"
                />
                <Textarea
                  placeholder={t('description', locale)}
                  value={eventForm.description}
                  onChange={(e) => setEventForm((p) => ({ ...p, description: e.target.value }))}
                  className="rounded-xl bg-slate-50 border-slate-100 min-h-[70px] resize-none"
                />
                <Input
                  type="datetime-local"
                  value={eventForm.start_time}
                  onChange={(e) => setEventForm((p) => ({ ...p, start_time: e.target.value }))}
                  className="rounded-xl bg-slate-50 border-slate-100 h-11"
                />

                {/* In person / Online */}
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400 mb-2">
                    Plats
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { key: 'online' as const, label: 'Online', icon: Monitor },
                        { key: 'in_person' as const, label: 'In person', icon: MapPin },
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
                              ? 'border-[#9089F0] bg-[#E9D5FF]/50 text-slate-900'
                              : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
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
                    className="rounded-xl bg-slate-50 border-slate-100 h-11"
                  />
                ) : (
                  <Input
                    placeholder="Adress / plats (t.ex. Norrsken House, Stockholm)"
                    value={eventForm.location_address}
                    onChange={(e) =>
                      setEventForm((p) => ({ ...p, location_address: e.target.value }))
                    }
                    className="rounded-xl bg-slate-50 border-slate-100 h-11"
                  />
                )}

                {/* Audience */}
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400 mb-2">
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
                              ? 'border-[#9089F0] bg-[#E9D5FF]/50 text-slate-900'
                              : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                          }`}
                        >
                          <Icon size={14} className="flex-shrink-0" /> {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {eventForm.audience === 'selected' && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 max-h-44 overflow-y-auto space-y-1">
                    <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide mb-2">
                      Select members
                    </p>
                    {getMockCommunityAdminPayload(adminCommunityId).members.map((m) => {
                      const checked = eventForm.invited_member_ids.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => toggleInvitedMember(m.id)}
                          className={`w-full flex items-center gap-2.5 px-2.5 h-11 min-h-[44px] rounded-lg text-left transition-colors ${
                            checked ? 'bg-white border border-[#9089F0]/50' : 'hover:bg-white'
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                              checked
                                ? 'bg-[#1a1848] border-[#1a1848]'
                                : 'border-zinc-300 bg-white'
                            }`}
                          >
                            {checked && <Check size={10} className="text-white" />}
                          </span>
                          <span className="text-sm font-bold text-slate-900 truncate">{m.name}</span>
                          <span className="text-[10px] text-slate-400 font-medium ml-auto flex-shrink-0">
                            {m.role}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {eventForm.audience === 'invite_only' && (
                  <p className="text-xs text-slate-400 font-medium -mt-1">
                    Only people you personally invite can see and RSVP.
                  </p>
                )}

                <Input
                  placeholder={t('speakerName', locale)}
                  value={eventForm.speaker_name}
                  onChange={(e) => setEventForm((p) => ({ ...p, speaker_name: e.target.value }))}
                  className="rounded-xl bg-slate-50 border-slate-100 h-11"
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
                  className="w-full rounded-full bg-[#1a1848] hover:bg-[#2B2568] text-white font-extrabold h-11 min-h-[44px] flex items-center justify-center gap-2"
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
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-6">
                <h3 className="text-sm font-extrabold text-slate-900 mb-1 flex items-center gap-2">
                  <Calendar size={14} className="text-[#9089F0]" /> Planerade events
                </h3>
                <p className="text-xs text-slate-400 font-medium mb-4">
                  Upcoming events visible to members.
                </p>
                {plannedEvents.length === 0 ? (
                  <p className="text-sm text-slate-400 font-medium py-6 text-center">
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
                          className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100"
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
                                background: '#E9D5FF',
                              }}
                            >
                              <Calendar size={16} className="text-[#9089F0]" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-900 truncate">{ev.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {formatEventWhen(ev.start_time)}
                              {ev.speaker_name ? ` · ${ev.speaker_name}` : ''}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500 bg-white border border-slate-100 px-2 py-0.5 rounded-md">
                                {ev.location_type === 'in_person' ? 'In person' : 'Online'}
                              </span>
                              <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500 bg-white border border-slate-100 px-2 py-0.5 rounded-md">
                                {ev.audience === 'invite_only'
                                  ? 'Inbjudan'
                                  : ev.audience === 'selected'
                                    ? 'Utvalda'
                                    : 'Community'}
                              </span>
                              {ev.category && (
                                <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500 bg-white border border-slate-100 px-2 py-0.5 rounded-md">
                                  {ev.category}
                                </span>
                              )}
                              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
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
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-6">
                <h3 className="text-sm font-extrabold text-slate-900 mb-1 flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-slate-400" /> Tidigare events
                </h3>
                <p className="text-xs text-slate-400 font-medium mb-4">
                  Avslutade events och replays.
                </p>
                {previousEvents.length === 0 ? (
                  <p className="text-sm text-slate-400 font-medium py-6 text-center">
                    No past events yet.
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
                          className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-100"
                        >
                          {ev.image_url ? (
                            <img
                              src={ev.image_url}
                              alt=""
                              className="w-12 h-12 rounded-xl object-cover flex-shrink-0 opacity-80"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0">
                              <CheckCircle2 size={16} className="text-slate-400" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-600 truncate">{ev.title}</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {formatEventWhen(ev.start_time)}
                              {ev.speaker_name ? ` · ${ev.speaker_name}` : ''}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded-md">
                                {ev.location_type === 'in_person' ? 'In person' : 'Online'}
                              </span>
                              <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded-md">
                                {ev.audience === 'invite_only'
                                  ? 'Inbjudan'
                                  : ev.audience === 'selected'
                                    ? 'Utvalda'
                                    : 'Community'}
                              </span>
                              {ev.category && (
                                <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded-md">
                                  {ev.category}
                                </span>
                              )}
                              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
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
            }
            broadcastPanel={
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-[#1a1848] rounded-2xl overflow-hidden">
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
                      <p className="text-lg font-extrabold">{liveTitle || 'Live Broadcast'}</p>
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
                      <Video size={48} className="text-slate-500 mx-auto mb-3" strokeWidth={1} />
                      <p className="text-slate-500 text-sm font-bold">
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
                      if (isLive) endBroadcast();
                      else startBroadcast();
                    }}
                    className={`flex items-center gap-2 h-10 px-5 rounded-xl font-extrabold text-sm transition-all ${isLive ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                  >
                    <Radio size={13} />{' '}
                    {isLive ? t('endBroadcast', locale) : t('startBroadcast', locale)}
                  </button>
                </div>
              </div>
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-6">
                <h3 className="text-sm font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                  <Activity size={14} className="text-red-500" /> {t('broadcastSettings', locale)}
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">
                      {t('broadcastTitle', locale)}
                    </label>
                    <Input
                      value={liveTitle}
                      onChange={(e) => setLiveTitle(e.target.value)}
                      placeholder={t('broadcastTitlePlaceholder', locale)}
                      className="rounded-xl border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">
                      {t('streamKeyLabel', locale)} (dela publikt)
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={
                          liveOrigin
                            ? `${liveOrigin}/live/${streamKey}`
                            : `/live/${streamKey}`
                        }
                        readOnly
                        onFocus={(e) => e.currentTarget.select()}
                        className="rounded-xl border-slate-200 font-mono text-xs bg-slate-50 flex-1 cursor-text"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const url = `${liveOrigin || window.location.origin}/live/${streamKey}`;
                          await navigator.clipboard.writeText(url);
                          setKeyCopied(true);
                          setTimeout(() => setKeyCopied(false), 2000);
                        }}
                        className={`h-11 min-h-[44px] px-3 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${keyCopied ? 'bg-green-100 text-green-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                        title="Copy link"
                      >
                        {keyCopied ? <Check size={13} /> : <Share2 size={13} />}
                      </button>
                      <a
                        href={`/live/${streamKey}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-11 min-h-[44px] px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center flex-shrink-0"
                        title="Open live page"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium mt-1.5">
                      Share the link with anyone — works outside the community. No
                      login required to watch.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-extrabold text-slate-900">{attendeeCount}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {t('viewers', locale)}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-extrabold text-slate-900">{liveChat.length}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {t('chatMessages', locale)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div
              className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col overflow-hidden"
              style={{ height: 560 }}
            >
              <div className="p-4 border-b border-slate-100 flex items-center gap-2 flex-shrink-0">
                <Radio size={13} className={isLive ? 'text-red-500' : 'text-slate-300'} />
                <h3 className="text-sm font-extrabold text-slate-900">{t('liveChat', locale)}</h3>
                {isLive && (
                  <span className="ml-auto text-[10px] font-extrabold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                    LIVE
                  </span>
                )}
              </div>
              <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {liveChat.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center">
                    <div>
                      <Radio size={28} className="text-slate-200 mx-auto mb-2" />
                      <p className="text-sm text-slate-400 font-medium">
                        {isLive ? t('waitingMessages', locale) : t('startForChat', locale)}
                      </p>
                    </div>
                  </div>
                ) : (
                  liveChat.map((msg, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-extrabold text-[#9089F0] flex-shrink-0">
                        {msg.name[0]}
                      </div>
                      <div>
                        <span className="text-xs font-extrabold text-[#9089F0]">{msg.name}: </span>
                        <span className="text-xs text-slate-600">{msg.msg}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-3 border-t border-slate-100 flex gap-2 flex-shrink-0">
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
                  className="flex-1 h-9 rounded-xl bg-slate-50 border border-slate-200 px-3 text-xs focus:outline-none focus:border-indigo-300"
                />
                <button
                  onClick={() => {
                    if (chatMsg.trim()) {
                      setLiveChat((p) => [...p, { name: session.user.name, msg: chatMsg }]);
                      setChatMsg('');
                    }
                  }}
                  disabled={!chatMsg.trim()}
                  className="w-9 h-9 rounded-xl bg-[#1a1848] flex items-center justify-center disabled:opacity-40 hover:bg-[#2B2568] transition-colors flex-shrink-0"
                >
                  <Send size={12} className="text-white" />
                </button>
              </div>
            </div>
          </div>
            }
          />
        )}

        {/* ── EMAIL CRM ── */}
        {section === 'email' && <EmailAdminPanel />}


        {/* ── BIO BUILDER — Link in Bio Studio ── */}
        {section === 'biobuilder' && (
          <div className="-mx-4 sm:-mx-6 -mt-6 mb-5">
            {/* Sub-header & CTAs */}
            <div className="bg-white border-b border-slate-200/80 px-4 sm:px-8 py-6">
              <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400">
                    {t('adminBioBuilder', locale)} ·{' '}
                    <span className="text-slate-600">{activeWorkspace.handle}</span>
                  </p>
                  <h1 className="font-clikd-wordmark font-extrabold text-[28px] sm:text-[32px] leading-tight text-slate-900 tracking-tight mt-1">
                    {t('linkInBio', locale)}
                  </h1>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      const cleanHandle = (bioHandle || activeWorkspace.handle || 'creator')
                        .replace(/^@/, '')
                        .trim();
                      // Persist latest studio state so the new tab sees what you see.
                      updateActiveBio({
                        profile_photo: bioAvatarUrl || null,
                        display_name: bioDisplayName,
                        handle: cleanHandle,
                        bio_text: bioBioText,
                        theme: bioTheme,
                        theme_label:
                          BIO_THEME_PRESETS.find((p) => p.presetId === bioTheme.presetId)
                            ?.label || activeWorkspace.bio.theme_label,
                        blocks: blocks as WorkspaceBioBlock[],
                      });
                      window.open(
                        `/bio/${encodeURIComponent(cleanHandle || 'creator')}`,
                        '_blank',
                        'noopener,noreferrer'
                      );
                    }}
                    className="h-10 min-h-[40px] px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 inline-flex items-center gap-1.5 hover:bg-slate-50 transition-colors"
                    title={t('openPublicBioTitle', locale)}
                  >
                    <ExternalLink size={13} /> {t('preview', locale)}
                  </button>
                  <button
                    type="button"
                    onClick={() => saveBioMutation.mutate()}
                    disabled={saveBioMutation.isPending}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-5 py-2.5 min-h-[40px] rounded-xl transition-all hover:opacity-95 ${
                      bioSaved
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    {bioSaved ? (
                      <>
                        <Check size={13} /> {t('publishedCheck', locale)}
                      </>
                    ) : (
                      <>
                        <Save size={13} /> {t('publishChanges', locale)}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Sub nav tabs */}
            <div className="bg-white border-b border-slate-200/80 px-4 sm:px-8">
              <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto scrollbar-none">
                {BIO_SUB_TABS.map(({ key, label }) => {
                  const active = bioSubTab === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setBioSubTab(key)}
                      className={`relative h-11 min-h-[44px] px-4 text-xs whitespace-nowrap transition-colors border-b-2 ${
                        active
                          ? 'border-[#F472B6] text-[#2B2568] font-bold'
                          : 'border-transparent text-slate-400 font-semibold hover:text-slate-700'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {section === 'biobuilder' && (
          <div className="space-y-5">

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className={`${bioSubTab === 'design' ? 'lg:col-span-8' : 'lg:col-span-7'} space-y-4`}>
                {bioSubTab === 'blocks' && (
                  <>
                    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-black text-slate-900">
                            {t('activeBlocksTitle', locale)}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {t('activeBlocksSub', locale)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setDrawerSocialUrl('');
                            setAddDrawerOpen(true);
                          }}
                          className="h-11 min-h-[44px] px-4 rounded-xl bg-[#2B2568] text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 hover:bg-[#1a1848] transition-colors self-start sm:self-auto"
                        >
                          <Plus size={14} /> {t('addLinkOrProduct', locale)}
                        </button>
                      </div>

                      <SocialLinksEditor links={socialLinks} onChange={setSocialLinks} />

                      <div>
                        <p className="font-bold text-[10px] text-slate-400 uppercase tracking-[0.14em] mb-2">
                          {t('linksAndLeadMagnets', locale)}
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
                                communities={bioCommunities}
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
                          <p className="text-sm font-bold text-zinc-400 text-center py-6">
                            {t('noLinksYet', locale)}
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="font-bold text-[10px] text-slate-400 uppercase tracking-[0.14em] mb-2">
                          {t('storeProductsTitle', locale)}
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
                                communities={bioCommunities}
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
                          <p className="text-sm font-bold text-zinc-400 text-center py-6">
                            {t('noStoreProductsYet', locale)}
                          </p>
                        )}
                      </div>
                    </div>

                    {addDrawerOpen && (
                      <>
                        <div
                          className="fixed inset-0 bg-black/40 z-40"
                          onClick={() => setAddDrawerOpen(false)}
                        />
                        <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl p-5 overflow-y-auto">
                          <div className="flex items-center justify-between mb-5">
                            <div>
                              <h3 className="text-sm font-black text-slate-900">
                                {t('addLinkOrProduct', locale)}
                              </h3>
                              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                Links, products, social & coaching
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setAddDrawerOpen(false)}
                              className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl hover:bg-slate-100 inline-flex items-center justify-center"
                              aria-label="Close"
                            >
                              <X size={16} />
                            </button>
                          </div>

                          <p className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-slate-400 mb-2">
                            Links
                          </p>
                          <div className="space-y-1 mb-5">
                            {LINK_BLOCK_TYPES.map((bt) => (
                              <button
                                key={bt.type}
                                type="button"
                                onClick={() => addLinkBlock(bt.type)}
                                className="w-full flex items-center gap-2.5 px-3 py-3 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 min-h-[44px] text-left border border-transparent hover:border-slate-100"
                              >
                                <span className="text-base w-6 text-center">{bt.emoji}</span>
                                <span className="flex-1">{bt.label}</span>
                                {bt.type === 'coaching' ? (
                                  <span className="text-[9px] font-bold uppercase tracking-wide text-[#F472B6] bg-[#FDF2F8] px-1.5 py-0.5 rounded">
                                    Calendar
                                  </span>
                                ) : null}
                              </button>
                            ))}
                          </div>

                          <p className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-slate-400 mb-2">
                            Social media
                          </p>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-3 mb-5">
                            <div className="grid grid-cols-4 gap-1.5">
                              {SOCIAL_PLATFORMS.map((p) => {
                                const active = drawerSocialPlatform === p.id;
                                return (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setDrawerSocialPlatform(p.id)}
                                    className={`flex flex-col items-center gap-1 p-2 min-h-[44px] rounded-xl border text-center transition-all ${
                                      active
                                        ? 'border-[#F472B6] bg-white shadow-sm'
                                        : 'border-slate-200 bg-white hover:border-slate-300'
                                    }`}
                                  >
                                    <span
                                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                                      style={{ background: `${p.color}14`, color: p.color }}
                                    >
                                      <SocialPlatformIcon id={p.id} size={14} />
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-600 leading-tight">
                                      {p.label.split(' ')[0]}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                            <input
                              value={drawerSocialUrl}
                              onChange={(e) => setDrawerSocialUrl(e.target.value)}
                              placeholder={
                                SOCIAL_PLATFORMS.find((p) => p.id === drawerSocialPlatform)
                                  ?.prefix ?? 'https://...'
                              }
                              className="w-full h-11 min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium focus:outline-none focus:border-[#F472B6]"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') addSocialLinkFromDrawer();
                              }}
                            />
                            <button
                              type="button"
                              onClick={addSocialLinkFromDrawer}
                              disabled={!drawerSocialUrl.trim()}
                              className="w-full h-11 min-h-[44px] rounded-xl bg-[#F472B6] text-white text-xs font-extrabold disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
                            >
                              <Plus size={13} /> Add social link
                            </button>
                          </div>

                          <p className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-slate-400 mb-2">
                            Products
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              addStoreProduct();
                              setAddDrawerOpen(false);
                            }}
                            className="w-full h-11 min-h-[44px] rounded-xl bg-[#2B2568] text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5"
                          >
                            <ShoppingBag size={13} /> Add Product
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}

                {bioSubTab === 'design' && (
                  <BioBuilderDesignTab
                    theme={bioTheme}
                    onChange={setBioTheme}
                    onPatch={patchBioTheme}
                    onApply={() => {
                      saveBioMutation.mutate();
                      setSaved('theme');
                      setTimeout(() => setSaved(''), 2000);
                    }}
                    saved={saved === 'theme'}
                  />
                )}

                {bioSubTab === 'analytics' && (
                  <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
                    <div className="px-5 py-4 border-b border-zinc-100">
                      <h3 className="text-sm font-black text-[#1f2430]">Bio Store UTM clicks</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Link performance & top converting products · {activeWorkspace.analytics.utm_total_clicks} clicks
                      </p>
                    </div>
                    <div className="divide-y divide-zinc-100">
                      {activeWorkspace.analytics.utm_links.length === 0 ? (
                        <p className="py-10 text-center text-sm text-zinc-400">
                          Add store products in Blocks to see UTM breakdown.
                        </p>
                      ) : (
                        activeWorkspace.analytics.utm_links.map((row) => (
                          <div key={row.slug} className="px-5 py-4 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-black text-[#1f2430] truncate">{row.title}</p>
                              <p className="text-[11px] font-mono text-zinc-400 truncate">/r/{row.slug}</p>
                            </div>
                            <div className="flex items-center gap-4 flex-shrink-0">
                              <div className="text-right">
                                <p className="text-lg font-black tabular-nums">{row.clicks}</p>
                                <p className="text-[10px] font-bold uppercase text-zinc-400">Clicks</p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-black tabular-nums">{row.unique}</p>
                                <p className="text-[10px] font-bold uppercase text-zinc-400">Unique</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {bioSubTab === 'settings' && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-4">
                      <h3 className="text-sm font-black text-[#1f2430]">Profile</h3>
                      <div className="mb-2">
                        <label className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-zinc-400 block mb-2">
                          Profile photo
                        </label>
                        <AvatarUploader avatarUrl={bioAvatarUrl} onUpdate={setBioAvatarUrl} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-zinc-400 block mb-1">
                            Display name
                          </label>
                          <Input value={bioDisplayName} onChange={(e) => setBioDisplayName(e.target.value)} className="rounded-xl border-zinc-200 text-sm" />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-zinc-400 block mb-1">
                            Handle
                          </label>
                          <Input
                            value={bioHandle}
                            onChange={(e) => setBioHandle(e.target.value.toLowerCase().replace(/\s/g, ''))}
                            className="rounded-xl border-zinc-200 text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-zinc-400 block mb-1">
                          Bio
                        </label>
                        <Textarea
                          value={bioBioText}
                          onChange={(e) => setBioBioText(e.target.value)}
                          placeholder="Short bio…"
                          className="rounded-xl border-zinc-200 resize-none min-h-[60px] text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-sm font-black text-slate-900 px-0.5">
                        Booking integrations
                      </h3>
                      <p className="text-xs text-slate-500 px-0.5 mb-1">
                        Connect Google so 1:1 Coaching blocks can create Calendar events + Meet links on purchase.
                      </p>
                      <GoogleIntegrationCard />
                    </div>
                  </div>
                )}
              </div>

              <div
                className={`${bioSubTab === 'design' ? 'lg:col-span-4' : 'lg:col-span-5'} lg:sticky lg:top-20 lg:self-start h-fit`}
              >
                {showPreview ? (
                  <div className="max-h-[calc(100vh-7rem)] overflow-y-auto">
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
                  <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-10 text-center">
                    <Eye size={24} className="text-zinc-300 mx-auto mb-2" />
                    <p className="text-sm text-zinc-400 font-bold">Preview hidden</p>
                    <button type="button" onClick={() => setShowPreview(true)} className="mt-2 text-xs font-bold text-[#7c6cf0] hover:underline">
                      Show preview
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
          </>
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

      <BioPublishSuccessDialog
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        firstPublish={publishDialogFirst}
        publicDisplay={bioPublicDisplay(publishDialogHandle)}
        publicUrl={
          typeof window !== 'undefined'
            ? `${window.location.origin}/@${publishDialogHandle.replace(/^@+/, '')}`
            : bioPublicUrl(publishDialogHandle)
        }
      />

      <CreateWorkspaceModal
        open={createWsOpen}
        onOpenChange={setCreateWsOpen}
        createUrl="/api/admin/workspaces"
        onCreated={(ws) => {
          refreshWorkspaces();
          setActiveWorkspaceId(ws.id);
          queryClient.invalidateQueries({ queryKey: ['admin-workspaces'] });
          queryClient.invalidateQueries({ queryKey: ['admin-community'] });
          queryClient.invalidateQueries({ queryKey: ['admin-email'] });
        }}
      />

      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        minPlan={upgradeTarget}
      />

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

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Crown } from 'lucide-react';
import {
  SOCIAL_BRAND_ICONS,
  type SocialBrandId,
} from '@/components/icons/SocialBrandIcons';
import {
  bioBlockSurfaceStyle,
  bioCanvasStyle,
  getBioFontFamily,
  getBioGoogleFontsHref,
  hoverEffectClass,
  normalizeBioTheme,
  usesFrostedBlocks,
  usesGlassCanvas,
  type BioTheme,
} from '@/lib/bio-theme';
import type { WorkspaceBioBlock, WorkspaceProfile } from '@/lib/mock-workspace-profiles';
import { syncWorkspaceBioAnalytics } from '@/lib/mock-workspace-profiles';
import type { StoreProduct } from '@/lib/mock-store';
import { DEFAULT_COLLECT_FIELDS } from '@/lib/store-collect-fields';
import OneTapCheckoutDrawer from '@/components/store/OneTapCheckoutDrawer';
import { localeTag, useLanguage } from '@/lib/i18n';
import {
  effectiveUnitPrice,
  recordBioSale,
} from '@/lib/bio-sales';
import {
  bioBlockSlug,
  registerDemoDestination,
} from '@/lib/bio-utm';
import {
  registerBioLinkDestinations,
  trackBioLinkClick,
} from '@/lib/bio-clicks/client';

type Category = 'links' | 'store';

/** Map a bio block into a checkout product when it unlocks community access. */
function bioBlockAsCheckoutProduct(block: WorkspaceBioBlock): StoreProduct {
  const price =
    typeof block.sale_price === 'number' &&
    typeof block.price === 'number' &&
    block.sale_price < block.price
      ? block.sale_price
      : typeof block.price === 'number'
        ? block.price
        : 0;
  return {
    id: Number.parseInt(String(block.id).replace(/\D/g, ''), 10) || Date.now(),
    name: block.title || 'Product',
    description: block.subtitle || null,
    price,
    currency: 'SEK',
    type:
      block.type === 'course'
        ? 'course'
        : block.type === 'coaching'
          ? 'coaching'
          : block.type === 'community'
            ? 'community'
            : block.type === 'lead_magnet'
              ? 'ebook'
              : 'digital',
    kind:
      block.type === 'coaching' || block.type === 'community' ? 'service' : 'product',
    image_url: null,
    community_id: block.access_community_id ?? null,
    is_published: true,
    created_at: new Date().toISOString(),
    collect_fields: DEFAULT_COLLECT_FIELDS,
    order_bump: null,
    grants_community_access: block.grants_community_access === true,
    access_community_id: block.access_community_id ?? null,
    google_calendar_enabled:
      block.type === 'coaching'
        ? block.google_calendar_enabled !== false
        : block.google_calendar_enabled === true,
  };
}

function formatSek(amount: number, language: ReturnType<typeof useLanguage>['language']) {
  return `${Math.round(amount).toLocaleString(localeTag(language))} SEK`;
}

function pricePill(block: WorkspaceBioBlock, freeLabel: string, language: ReturnType<typeof useLanguage>['language']) {
  const price = typeof block.price === 'number' ? block.price : null;
  const sale =
    typeof block.sale_price === 'number' &&
    price != null &&
    block.sale_price >= 0 &&
    block.sale_price < price
      ? block.sale_price
      : null;
  const amount = sale ?? price;
  const freeHint = /gratis|free/i.test(`${block.title} ${block.subtitle}`);

  if (amount === 0 || ((amount == null || amount <= 0) && (block.type === 'lead_magnet' || freeHint))) {
    return {
      label: freeLabel,
      className:
        'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full',
    };
  }
  if (amount != null && amount > 0) {
    return {
      label: formatSek(amount, language),
      className:
        'bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full',
    };
  }
  return null;
}

function BlockRow({
  block,
  theme,
  onCheckout,
  freeLabel,
  language,
  trackedHref,
}: {
  block: WorkspaceBioBlock;
  theme: BioTheme;
  onCheckout?: (block: WorkspaceBioBlock) => void;
  freeLabel: string;
  language: ReturnType<typeof useLanguage>['language'];
  /** Prefer /r/{slug} so every outbound click is counted server-side. */
  trackedHref?: string;
}) {
  if (block.type === 'divider') {
    return <div className="h-px mx-1 opacity-20" style={{ background: theme.mutedColor }} />;
  }
  const isFrosted = usesFrostedBlocks(theme);
  const surface = bioBlockSurfaceStyle(theme);
  const pill = pricePill(block, freeLabel, language);
  const rawHref = block.destination_url || block.url || '#';
  // Route through /r/{slug} when available so Analytics gets real click events.
  const href = trackedHref || rawHref;
  // Priced Bio Builder blocks + community unlocks sell through 1-tap checkout (Revenue).
  const hasPrice = typeof block.price === 'number' && block.price >= 0;
  const usesCheckout =
    typeof onCheckout === 'function' &&
    (Boolean(block.grants_community_access && block.access_community_id) ||
      hasPrice);

  const inner = (
    <>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-base flex-shrink-0 overflow-hidden"
          style={{
            background: isFrosted ? 'rgba(99,102,241,0.2)' : `${theme.accent}18`,
            border: isFrosted ? '1px solid rgba(129,140,248,0.3)' : 'none',
          }}
        >
          <span>{block.emoji || '🔗'}</span>
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="font-bold text-sm truncate leading-snug">{block.title}</p>
          {block.subtitle ? (
            <p className="text-[11px] truncate font-medium opacity-70">{block.subtitle}</p>
          ) : null}
        </div>
      </div>
      {pill ? <span className={pill.className}>{pill.label}</span> : null}
    </>
  );

  const className = `w-full p-3.5 flex items-center justify-between gap-2 min-h-[52px] ${hoverEffectClass(theme.hoverEffect)}`;

  if (usesCheckout) {
    return (
      <button
        type="button"
        onClick={() => onCheckout?.(block)}
        className={className}
        style={surface}
      >
        {inner}
      </button>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={surface}
    >
      {inner}
    </a>
  );
}

/** Full-page link-in-bio as visitors see it (not the admin phone chrome). */
export default function PublicBioView({ profile }: { profile: WorkspaceProfile }) {
  const { t, language } = useLanguage();
  const bio = profile.bio;
  const theme = useMemo(() => normalizeBioTheme(bio.theme), [bio.theme]);
  const [tab, setTab] = useState<Category>('links');
  const [checkoutProduct, setCheckoutProduct] = useState<StoreProduct | null>(null);
  const [checkoutBlock, setCheckoutBlock] = useState<WorkspaceBioBlock | null>(null);
  const handle = (bio.handle || profile.handle || 'creator').replace(/^@/, '');
  const visible = bio.blocks.filter((b) => b.visible !== false);
  const links = visible.filter((b) => b.category !== 'store');
  const store = visible.filter((b) => b.category === 'store');
  const active = tab === 'store' ? store : links;
  const isGlass = usesGlassCanvas(theme);
  const isFrosted = usesFrostedBlocks(theme);
  const chromeLight = isGlass || isFrosted;
  const canvas = bioCanvasStyle(theme);
  const coverOn = Boolean(theme.coverEnabled);
  const coverUrl =
    theme.coverImageUrl ||
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80';
  const avatarRadius = theme.avatarShape === 'squircle' ? '1.5rem' : '9999px';
  const fontFamily = getBioFontFamily(theme.fontId);
  const socialLinks = (bio.social_links ?? []).filter(
    (l) => l && String(l.platform || '').trim() && String(l.url || '').trim()
  );

  // Register /r/{slug} destinations once so outbound link clicks are countable.
  useEffect(() => {
    const links = bio.blocks
      .filter((b) => b.visible !== false && b.type !== 'divider')
      .map((b) => {
        const destination = String(b.destination_url || b.url || '').trim();
        if (!destination) return null;
        const slug = bioBlockSlug(b);
        return {
          slug,
          blockId: b.id,
          title: b.title || 'Link',
          destinationUrl: destination,
        };
      })
      .filter(Boolean) as Array<{
      slug: string;
      blockId: string;
      title: string;
      destinationUrl: string;
    }>;
    if (links.length === 0) return;
    registerBioLinkDestinations({
      workspaceId: profile.id,
      handle,
      links,
    });
    for (const link of links) {
      registerDemoDestination(link.slug, {
        destination: link.destinationUrl,
        handle,
        title: link.title,
      });
    }
  }, [profile.id, handle, bio.blocks]);

  const openCheckout = (block: WorkspaceBioBlock) => {
    const slug = bioBlockSlug(block);
    const destination = String(block.destination_url || block.url || '').trim();
    if (destination) {
      registerDemoDestination(slug, {
        destination,
        handle,
        title: block.title || 'Product',
      });
    }
    // Checkout taps count as Link-in-bio clicks (same product row in Analytics).
    trackBioLinkClick({
      workspaceId: profile.id,
      handle,
      slug,
      blockId: block.id,
      title: block.title || 'Product',
      destinationUrl: destination || undefined,
    });
    setCheckoutBlock(block);
    setCheckoutProduct(bioBlockAsCheckoutProduct(block));
  };

  const handleCheckoutSuccess = (payload: {
    product: StoreProduct;
    values: Record<string, string>;
    bumpSelected: boolean;
    total: number;
  }) => {
    const block = checkoutBlock;
    const blockId = block?.id || String(payload.product.id);
    recordBioSale({
      workspaceId: profile.id,
      blockId,
      productTitle: payload.product.name || block?.title || 'Product',
      category:
        block?.category === 'store' || block?.type === 'store'
          ? 'Store'
          : block?.type || 'Link',
      amountSek: payload.total || effectiveUnitPrice(block || ({ price: payload.product.price } as WorkspaceBioBlock)),
      currency: payload.product.currency || 'SEK',
      buyerEmail: payload.values.email || null,
    });
    syncWorkspaceBioAnalytics(profile.id);
  };

  useEffect(() => {
    const href = getBioGoogleFontsHref(theme.fontId);
    if (!href || typeof document === 'undefined') return;
    const id = `bio-public-font-${theme.fontId}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }, [theme.fontId]);

  return (
    <div
      className="min-h-screen relative"
      style={{ background: theme.bg || '#FAFAFA', fontFamily }}
    >
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
      <div className="absolute inset-0 pointer-events-none" style={canvas} />
      <div className="relative z-10 max-w-md mx-auto min-h-screen flex flex-col pb-8">
        {coverOn && (
          <div className="relative h-36 w-full overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600">
            <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          </div>
        )}

        <div className={`px-5 text-center ${coverOn ? '-mt-12' : 'pt-10'}`}>
          <div className="relative w-24 h-24 mx-auto mb-3">
            <div
              className="w-24 h-24 overflow-hidden border-2 border-white/80 shadow-xl flex items-center justify-center"
              style={{
                borderRadius: avatarRadius,
                background: `linear-gradient(135deg, ${theme.accent}cc, #6366f1)`,
              }}
            >
              {bio.profile_photo || profile.avatar_url ? (
                <img
                  src={bio.profile_photo || profile.avatar_url || ''}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <Crown size={28} className="text-white" />
              )}
            </div>
            {theme.verifiedBadge && (
              <span className="absolute bottom-1 right-1 bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center border-2 border-slate-950">
                <Check size={12} strokeWidth={3} />
              </span>
            )}
          </div>
          <h1
            className="text-xl font-extrabold tracking-tight"
            style={{ color: theme.nameColor }}
          >
            {bio.display_name || profile.name}
          </h1>
          <p
            className="font-mono text-sm mt-1"
            style={{ color: theme.mutedColor }}
          >
            @{handle}
          </p>
          {socialLinks.length > 0 ? (
            <div className="flex items-center justify-center gap-2.5 mt-3 flex-wrap">
              {socialLinks.slice(0, 8).map((sl, i) => {
                const id = String(sl.platform) as SocialBrandId;
                const Icon = SOCIAL_BRAND_ICONS[id] ?? SOCIAL_BRAND_ICONS.custom;
                const href = String(sl.url).trim();
                const colorMap: Partial<Record<SocialBrandId, string>> = {
                  instagram: '#E1306C',
                  facebook: '#1877F2',
                  tiktok: '#010101',
                  youtube: '#FF0000',
                  twitter: '#000000',
                  linkedin: '#0A66C2',
                  spotify: '#1DB954',
                  custom: '#6B7280',
                };
                const color = colorMap[id] ?? '#6B7280';
                return (
                  <a
                    key={`${sl.platform}-${i}`}
                    href={href.startsWith('http') ? href : `https://${href}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-105"
                    style={{
                      color,
                      background: chromeLight ? 'rgba(255,255,255,0.18)' : `${color}14`,
                      border: `1px solid ${chromeLight ? 'rgba(255,255,255,0.28)' : `${color}33`}`,
                    }}
                    aria-label={String(sl.platform)}
                  >
                    <Icon size={16} />
                  </a>
                );
              })}
            </div>
          ) : null}
          {bio.bio_text ? (
            <p
              className="text-sm font-medium leading-snug mt-2"
              style={{ color: theme.mutedColor }}
            >
              {bio.bio_text}
            </p>
          ) : null}
        </div>

        <div className="px-4 mt-5 space-y-3 flex-1">
          <div
            className={
              chromeLight
                ? 'bg-white/10 backdrop-blur-md p-1 rounded-2xl border border-white/10 flex gap-0.5'
                : 'bg-slate-100 p-1 rounded-2xl border border-slate-200 flex gap-0.5'
            }
          >
            {(
              [
                { key: 'links' as const, label: t('bio.links') },
                { key: 'store' as const, label: t('bio.store') },
              ] as const
            ).map(({ key, label }) => {
              const on = tab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`flex-1 h-11 min-h-[44px] rounded-xl text-[11px] font-extrabold uppercase tracking-wider transition-all ${
                    chromeLight
                      ? on
                        ? 'bg-white/20 text-white'
                        : 'text-white/70'
                      : on
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {active.length === 0 ? (
            <p
              className="text-center text-sm py-8"
              style={{ color: theme.mutedColor }}
            >
              {tab === 'store' ? t('bio.noProductsYet') : t('bio.noLinksYet')}
            </p>
          ) : (
            active.map((block) => {
              const slug = bioBlockSlug(block);
              const hasOutbound = Boolean(block.destination_url || block.url);
              return (
                <BlockRow
                  key={block.id}
                  block={block}
                  theme={theme}
                  freeLabel={t('bio.free')}
                  language={language}
                  onCheckout={openCheckout}
                  trackedHref={hasOutbound ? `/r/${slug}` : undefined}
                />
              );
            })
          )}
        </div>

        <p
          className="mt-auto pt-8 text-center font-mono text-[9px] uppercase tracking-widest"
          style={{ color: theme.mutedColor }}
        >
          {t('bio.poweredBy')}
        </p>
      </div>

      <OneTapCheckoutDrawer
        open={Boolean(checkoutProduct)}
        product={checkoutProduct}
        communityId={checkoutProduct?.access_community_id ?? null}
        workspaceId={profile.id}
        handle={profile.handle}
        onClose={() => {
          setCheckoutProduct(null);
          setCheckoutBlock(null);
        }}
        onSuccess={handleCheckoutSuccess}
      />
    </div>
  );
}

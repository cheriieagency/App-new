'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Crown } from 'lucide-react';
import {
  bioCanvasStyle,
  getBioFontFamily,
  getBioGoogleFontsHref,
  hoverEffectClass,
  normalizeBioTheme,
  type BioTheme,
} from '@/lib/bio-theme';
import type { WorkspaceBioBlock, WorkspaceProfile } from '@/lib/mock-workspace-profiles';
import type { StoreProduct } from '@/lib/mock-store';
import { DEFAULT_COLLECT_FIELDS } from '@/lib/store-collect-fields';
import OneTapCheckoutDrawer from '@/components/store/OneTapCheckoutDrawer';
import { localeTag, useLanguage } from '@/lib/i18n';

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
}: {
  block: WorkspaceBioBlock;
  theme: BioTheme;
  onCheckout?: (block: WorkspaceBioBlock) => void;
  freeLabel: string;
  language: ReturnType<typeof useLanguage>['language'];
}) {
  if (block.type === 'divider') {
    return <div className="h-px mx-1 bg-white/15" />;
  }
  const isFrosted =
    theme.blockVariant === 'frosted' ||
    theme.bgType === 'mesh' ||
    theme.bgType === 'liquid';
  const pill = pricePill(block, freeLabel, language);
  const href = block.destination_url || block.url || '#';
  const usesCheckout =
    Boolean(block.grants_community_access && block.access_community_id) &&
    typeof onCheckout === 'function';

  const inner = (
    <>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 flex items-center justify-center text-base flex-shrink-0 overflow-hidden">
          <span>{block.emoji || '🔗'}</span>
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="font-bold text-sm text-white truncate leading-snug">{block.title}</p>
          {block.subtitle ? (
            <p className="text-[11px] text-white/70 truncate font-medium">{block.subtitle}</p>
          ) : null}
        </div>
      </div>
      {pill ? <span className={pill.className}>{pill.label}</span> : null}
    </>
  );

  if (usesCheckout) {
    const className = isFrosted
      ? `w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 flex items-center justify-between gap-2 text-white min-h-[52px] ${hoverEffectClass(theme.hoverEffect)}`
      : `w-full rounded-2xl p-3.5 flex items-center justify-between gap-2 min-h-[52px] border border-slate-200 bg-white text-slate-900 shadow-sm ${hoverEffectClass(theme.hoverEffect)}`;
    return (
      <button type="button" onClick={() => onCheckout?.(block)} className={className}>
        {isFrosted ? (
          inner
        ) : (
          <>
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-base flex-shrink-0">
                <span>{block.emoji || '🔗'}</span>
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="font-bold text-sm truncate leading-snug">{block.title}</p>
                {block.subtitle ? (
                  <p className="text-[11px] text-slate-500 truncate font-medium">
                    {block.subtitle}
                  </p>
                ) : null}
              </div>
            </div>
            {pill ? (
              <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                {pill.label}
              </span>
            ) : null}
          </>
        )}
      </button>
    );
  }

  if (isFrosted) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 flex items-center justify-between gap-2 text-white min-h-[52px] ${hoverEffectClass(theme.hoverEffect)}`}
      >
        {inner}
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`rounded-2xl p-3.5 flex items-center justify-between gap-2 min-h-[52px] border border-slate-200 bg-white text-slate-900 shadow-sm ${hoverEffectClass(theme.hoverEffect)}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-base flex-shrink-0">
          <span>{block.emoji || '🔗'}</span>
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="font-bold text-sm truncate leading-snug">{block.title}</p>
          {block.subtitle ? (
            <p className="text-[11px] text-slate-500 truncate font-medium">{block.subtitle}</p>
          ) : null}
        </div>
      </div>
      {pill ? (
        <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full">
          {pill.label}
        </span>
      ) : null}
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
  const handle = (bio.handle || profile.handle || 'creator').replace(/^@/, '');
  const visible = bio.blocks.filter((b) => b.visible !== false);
  const links = visible.filter((b) => b.category !== 'store');
  const store = visible.filter((b) => b.category === 'store');
  const active = tab === 'store' ? store : links;
  const isGlass =
    theme.blockVariant === 'frosted' ||
    theme.bgType === 'mesh' ||
    theme.bgType === 'liquid';
  const canvas = bioCanvasStyle(theme);
  const coverOn = theme.coverEnabled || isGlass;
  const coverUrl =
    theme.coverImageUrl ||
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80';
  const avatarRadius = theme.avatarShape === 'squircle' ? '1.5rem' : '9999px';
  const fontFamily = getBioFontFamily(theme.fontId);

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
      style={{ background: isGlass ? '#0B0F17' : theme.bg || '#FAFAFA', fontFamily }}
    >
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
            className={`text-xl font-extrabold tracking-tight ${isGlass ? 'text-white' : 'text-slate-900'}`}
          >
            {bio.display_name || profile.name}
          </h1>
          <p className="font-mono text-sm text-slate-400 mt-1">@{handle}</p>
          {bio.bio_text ? (
            <p
              className={`text-sm font-medium leading-snug mt-2 ${isGlass ? 'text-white/80' : 'text-slate-600'}`}
            >
              {bio.bio_text}
            </p>
          ) : null}
        </div>

        <div className="px-4 mt-5 space-y-3 flex-1">
          <div
            className={
              isGlass
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
                  className={`flex-1 h-10 min-h-[40px] rounded-xl text-[11px] font-extrabold uppercase tracking-wider transition-all ${
                    isGlass
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
            <p className={`text-center text-sm py-8 ${isGlass ? 'text-white/40' : 'text-slate-400'}`}>
              {tab === 'store' ? t('bio.noProductsYet') : t('bio.noLinksYet')}
            </p>
          ) : (
            active.map((block) => (
              <BlockRow
                key={block.id}
                block={block}
                theme={theme}
                freeLabel={t('bio.free')}
                language={language}
                onCheckout={(b) => setCheckoutProduct(bioBlockAsCheckoutProduct(b))}
              />
            ))
          )}
        </div>

        <p
          className={`mt-auto pt-8 text-center font-mono text-[9px] uppercase tracking-widest ${
            isGlass ? 'text-white/40' : 'text-slate-400'
          }`}
        >
          {t('bio.poweredBy')}
        </p>
      </div>

      <OneTapCheckoutDrawer
        open={Boolean(checkoutProduct)}
        product={checkoutProduct}
        communityId={checkoutProduct?.access_community_id ?? null}
        onClose={() => setCheckoutProduct(null)}
      />
    </div>
  );
}

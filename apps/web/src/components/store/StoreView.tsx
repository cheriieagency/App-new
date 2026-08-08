'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingBag,
  Briefcase,
  Package,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import type { StoreKind, StoreProduct } from '@/lib/mock-store';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';

type FilterKey = 'all' | StoreKind;

function formatPrice(price: number, currency: string, locale: string) {
  if (!price) return t('freeLabel', locale as Parameters<typeof t>[1]);
  return `${Math.round(price)} ${currency}`;
}

function typeLabel(type: string) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export default function StoreView({
  communityId,
  communityName,
}: {
  communityId?: number | null;
  communityName?: string | null;
}) {
  const { locale } = useLocale();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [buyingId, setBuyingId] = useState<number | null>(null);
  const [boughtId, setBoughtId] = useState<number | null>(null);

  const { data: products = [], isLoading } = useQuery<StoreProduct[]>({
    queryKey: ['store', communityId ?? 'all'],
    queryFn: async () => {
      const qs = communityId ? `?community_id=${communityId}` : '';
      const r = await fetch(`/api/products${qs}`);
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
  });

  const filtered = useMemo(() => {
    if (filter === 'all') return products;
    return products.filter((p) => p.kind === filter);
  }, [products, filter]);

  const handleBuy = async (product: StoreProduct) => {
    setBuyingId(product.id);
    // Demo checkout placeholder — Swish flow can plug in here later.
    await new Promise((r) => setTimeout(r, 700));
    setBuyingId(null);
    setBoughtId(product.id);
    setTimeout(() => setBoughtId(null), 2500);
  };

  const filters: { key: FilterKey; label: string; icon: React.ElementType }[] = [
    { key: 'all', label: t('storeAll', locale), icon: ShoppingBag },
    { key: 'product', label: t('storeProducts', locale), icon: Package },
    { key: 'service', label: t('storeServices', locale), icon: Briefcase },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-black text-[#2c3340]">
            {t('store', locale)}
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            {communityName
              ? t('storeCommunityHint', locale).replace('{name}', communityName)
              : t('productsAndOffers', locale)}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-white border border-zinc-100 shadow-sm p-1 rounded-2xl w-fit">
          {filters.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`flex items-center gap-1.5 h-11 min-h-[44px] px-3.5 rounded-xl text-xs font-bold transition-all ${
                filter === key
                  ? 'bg-[var(--nc-coral)] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-700'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-zinc-400 text-sm flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin" />
          {t('loading', locale)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="nc-glass rounded-[1.5rem] py-16 text-center">
          <ShoppingBag size={32} className="text-zinc-200 mx-auto mb-3" />
          <p className="text-sm font-bold text-zinc-400">{t('storeEmpty', locale)}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {filtered.map((product) => {
            const isService = product.kind === 'service';
            const isBuying = buyingId === product.id;
            const justBought = boughtId === product.id;
            return (
              <div
                key={product.id}
                className="nc-glass rounded-[1.5rem] overflow-hidden border border-white/60 flex flex-col hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="relative aspect-[16/10] bg-zinc-100 overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#fff4f0] to-zinc-100">
                      {isService ? (
                        <Briefcase size={32} className="text-[#ffb59f]" />
                      ) : (
                        <Package size={32} className="text-[#ffb59f]" />
                      )}
                    </div>
                  )}
                  <span
                    className={`absolute top-3 left-3 text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-lg backdrop-blur-sm ${
                      isService
                        ? 'bg-[#2c3340]/70 text-white'
                        : 'bg-[var(--nc-coral)]/90 text-white'
                    }`}
                  >
                    {isService
                      ? t('storeServices', locale)
                      : t('storeProducts', locale)}
                  </span>
                </div>

                <div className="p-4 sm:p-5 flex flex-col flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                    {typeLabel(product.type)}
                  </p>
                  <h3 className="text-base font-black text-[#2c3340] leading-snug mb-1.5">
                    {product.name}
                  </h3>
                  <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2 flex-1">
                    {product.description}
                  </p>

                  <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between gap-3">
                    <p className="text-lg font-black text-[#2c3340] tabular-nums">
                      {formatPrice(product.price, product.currency, locale)}
                    </p>
                    <button
                      type="button"
                      disabled={isBuying}
                      onClick={() => void handleBuy(product)}
                      className={`h-11 min-h-[44px] px-4 rounded-xl text-xs font-black transition-all active:scale-95 disabled:opacity-60 flex items-center gap-1.5 ${
                        justBought
                          ? 'bg-green-100 text-green-700'
                          : 'bg-[var(--nc-coral)] text-white hover:opacity-90'
                      }`}
                    >
                      {isBuying ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : justBought ? (
                        <>
                          <CheckCircle2 size={13} /> {t('storeBought', locale)}
                        </>
                      ) : (
                        t('storeBuy', locale)
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

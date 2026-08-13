'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingBag,
  Briefcase,
  Package,
  Loader2,
} from 'lucide-react';
import type { StoreKind, StoreProduct } from '@/lib/mock-store';
import { useLanguage } from '@/lib/i18n';
import OneTapCheckoutDrawer from '@/components/store/OneTapCheckoutDrawer';
import { useWorkspaceOptional } from '@/context/WorkspaceContext';
import { authClient } from '@/lib/auth-client';

type FilterKey = 'all' | StoreKind;

function formatPrice(price: number, currency: string, translate: (key: string) => string) {
  if (!price) return translate('freeLabel');
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
  const { t } = useLanguage();
  const workspace = useWorkspaceOptional();
  const { data: session } = authClient.useSession();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [checkoutProduct, setCheckoutProduct] = useState<StoreProduct | null>(
    null
  );

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

  const filters: { key: FilterKey; label: string; icon: React.ElementType }[] = [
    { key: 'all', label: t('storeAll'), icon: ShoppingBag },
    { key: 'product', label: t('storeProducts'), icon: Package },
    { key: 'service', label: t('storeServices'), icon: Briefcase },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            {t('store')}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {communityName
              ? t('storeCommunityHint').replace('{name}', communityName)
              : t('productsAndOffers')}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-white border border-slate-100 shadow-sm p-1 rounded-2xl w-fit">
          {filters.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`flex items-center gap-1.5 h-11 min-h-[44px] px-3.5 rounded-xl text-xs font-bold transition-all ${
                filter === key
                  ? 'bg-[var(--nc-coral)] text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-slate-400 text-sm flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin" />
          {t('loading')}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] py-16 text-center">
          <ShoppingBag size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-400">{t('storeEmpty')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {filtered.map((product) => {
            const isService = product.kind === 'service';
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => setCheckoutProduct(product)}
                className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden border border-white/60 flex flex-col text-left hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#FCE7F3] to-slate-100">
                      {isService ? (
                        <Briefcase size={32} className="text-[#ffb59f]" />
                      ) : (
                        <Package size={32} className="text-[#ffb59f]" />
                      )}
                    </div>
                  )}
                  <span
                    className={`absolute top-3 left-3 text-[10px] font-extrabold uppercase tracking-wide px-2 py-1 rounded-lg backdrop-blur-sm ${
                      isService
                        ? 'bg-[#2c3340]/70 text-white'
                        : 'bg-[var(--nc-coral)]/90 text-white'
                    }`}
                  >
                    {isService
                      ? t('storeServices')
                      : t('storeProducts')}
                  </span>
                </div>

                <div className="p-4 sm:p-5 flex flex-col flex-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1">
                    {typeLabel(product.type)}
                  </p>
                  <h3 className="text-base font-extrabold text-slate-900 leading-snug mb-1.5">
                    {product.name}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 flex-1">
                    {product.description}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                    <p className="text-lg font-extrabold text-slate-900 tabular-nums">
                      {formatPrice(product.price, product.currency, t)}
                    </p>
                    <span className="h-11 min-h-[44px] px-4 rounded-xl text-xs font-extrabold bg-[var(--nc-coral)] text-white flex items-center">
                      {t('storeBuy')}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <OneTapCheckoutDrawer
        open={Boolean(checkoutProduct)}
        product={checkoutProduct}
        communityId={communityId}
        workspaceId={workspace?.activeWorkspace?.id ?? null}
        sellerUserId={session?.user?.id ?? null}
        onClose={() => setCheckoutProduct(null)}
      />
    </div>
  );
}

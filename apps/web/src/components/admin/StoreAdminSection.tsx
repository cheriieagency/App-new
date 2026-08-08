'use client';

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingBag,
  Plus,
  Trash2,
  ImageIcon,
  X,
  Loader2,
  Eye,
  EyeOff,
  Package,
  Briefcase,
  Pencil,
} from 'lucide-react';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import useUpload from '@/utils/useUpload';
import {
  PRODUCT_TYPES,
  SERVICE_TYPES,
  type StoreKind,
  type StoreProduct,
  type StoreProductType,
} from '@/lib/mock-store';
import {
  DEFAULT_COLLECT_FIELDS,
  DEFAULT_ORDER_BUMP,
  type CollectField,
  type OrderBump,
} from '@/lib/store-collect-fields';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import CollectInfoFieldBuilder from '@/components/admin/CollectInfoFieldBuilder';

type StoreResponse = {
  products: StoreProduct[];
  demo?: boolean;
};

type ProductForm = {
  id: number | null;
  name: string;
  description: string;
  price: string;
  kind: StoreKind;
  type: StoreProductType;
  image_url: string;
  is_published: boolean;
  collect_fields: CollectField[];
  order_bump: OrderBump;
};

const EMPTY_FORM = (): ProductForm => ({
  id: null,
  name: '',
  description: '',
  price: '',
  kind: 'product',
  type: 'ebook',
  image_url: '',
  is_published: true,
  collect_fields: DEFAULT_COLLECT_FIELDS.map((f) => ({ ...f })),
  order_bump: { ...DEFAULT_ORDER_BUMP },
});

export default function StoreAdminSection({
  communityId,
}: {
  communityId?: number;
}) {
  const { locale } = useLocale();
  const queryClient = useQueryClient();
  const [kindFilter, setKindFilter] = useState<'all' | StoreKind>('all');
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [upload, { loading: uploading }] = useUpload();
  const imageRef = useRef<HTMLInputElement>(null);

  const queryKey = ['admin-store', communityId ?? 'all'] as const;

  const { data, isLoading } = useQuery<StoreResponse>({
    queryKey,
    queryFn: async () => {
      const qs = communityId ? `?community_id=${communityId}` : '';
      const r = await fetch(`/api/admin/store${qs}`);
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
  });

  const products = useMemo(() => {
    const list = data?.products ?? [];
    if (kindFilter === 'all') return list;
    return list.filter((p) => p.kind === kindFilter);
  }, [data?.products, kindFilter]);

  const typeOptions = form.kind === 'service' ? SERVICE_TYPES : PRODUCT_TYPES;
  const isEditing = form.id != null;

  const mutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const r = await fetch('/api/admin/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    onSuccess: (res, variables) => {
      queryClient.setQueryData<StoreResponse>(queryKey, (prev) => {
        if (!prev) return prev;
        const action = String(variables.action ?? 'create');

        if (action === 'create') {
          const product: StoreProduct = res.product;
          return { ...prev, products: [product, ...prev.products] };
        }

        if (action === 'update' || action === 'toggle_publish') {
          const product = res.product as StoreProduct | undefined;
          if (!product) return prev;
          return {
            ...prev,
            products: prev.products.map((p) =>
              p.id === product.id ? { ...p, ...product } : p
            ),
          };
        }

        if (action === 'delete') {
          const id = Number(variables.id);
          return {
            ...prev,
            products: prev.products.filter((p) => p.id !== id),
          };
        }

        return prev;
      });
      queryClient.invalidateQueries({ queryKey: ['store'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      if (
        String(variables.action ?? 'create') === 'create' ||
        String(variables.action) === 'update'
      ) {
        setForm(EMPTY_FORM());
        setShowForm(false);
      }
    },
  });

  const handleImage = async (file: File) => {
    const result = await upload({ file });
    if (result.url) {
      setForm((f) => ({ ...f, image_url: result.url! }));
      return;
    }
    setForm((f) => ({ ...f, image_url: URL.createObjectURL(file) }));
  };

  const openCreate = () => {
    setForm(EMPTY_FORM());
    setShowForm(true);
  };

  const openEdit = (product: StoreProduct) => {
    setForm({
      id: product.id,
      name: product.name,
      description: product.description ?? '',
      price: String(product.price),
      kind: product.kind,
      type: product.type,
      image_url: product.image_url ?? '',
      is_published: product.is_published,
      collect_fields: (product.collect_fields ?? DEFAULT_COLLECT_FIELDS).map(
        (f) => ({ ...f })
      ),
      order_bump: product.order_bump
        ? { ...product.order_bump }
        : { ...DEFAULT_ORDER_BUMP },
    });
    setShowForm(true);
  };

  const canSubmit =
    Boolean(form.name.trim()) &&
    form.price !== '' &&
    !mutation.isPending &&
    !uploading;

  const submit = () => {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: Number(form.price),
      type: form.type,
      kind: form.kind,
      image_url: form.image_url || null,
      is_published: form.is_published,
      community_id: communityId ?? null,
      collect_fields: form.collect_fields,
      order_bump: form.order_bump,
    };
    if (isEditing) {
      mutation.mutate({ action: 'update', id: form.id, ...payload });
    } else {
      mutation.mutate({ action: 'create', ...payload });
    }
  };

  return (
    <div className="space-y-4">
      <div className="nc-glass rounded-[1.5rem] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between mb-4">
          <div>
            <h3 className="text-sm font-black text-[#2c3340] flex items-center gap-2">
              <ShoppingBag size={14} className="text-[var(--nc-coral)]" />
              {t('storeAdminTitle', locale)}
            </h3>
            <p className="text-xs text-zinc-400 mt-1">{t('storeAdminHint', locale)}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (showForm) {
                setShowForm(false);
                setForm(EMPTY_FORM());
              } else {
                openCreate();
              }
            }}
            className="inline-flex items-center gap-1.5 h-11 min-h-[44px] px-4 rounded-xl bg-[var(--nc-coral)] text-white text-xs font-black"
          >
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? t('cancel', locale) : t('addProduct', locale)}
          </button>
        </div>

        <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl w-fit mb-4">
          {(
            [
              { key: 'all', label: t('storeAll', locale) },
              { key: 'product', label: t('storeProducts', locale) },
              { key: 'service', label: t('storeServices', locale) },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setKindFilter(key)}
              className={`h-10 min-h-[44px] px-3 rounded-lg text-xs font-bold transition-all ${
                kindFilter === key
                  ? 'bg-white text-[#2c3340] shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {showForm && (
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 space-y-5 mb-4">
            <div>
              <p className="text-sm font-black text-[#2c3340] mb-3">
                1. {isEditing ? 'Edit offer' : 'Basics'}
              </p>
              <input
                ref={imageRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleImage(f);
                  e.target.value = '';
                }}
              />

              <div className="grid grid-cols-2 gap-2 mb-3">
                {(
                  [
                    { key: 'product' as const, label: t('storeProducts', locale), icon: Package },
                    { key: 'service' as const, label: t('storeServices', locale), icon: Briefcase },
                  ] as const
                ).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        kind: key,
                        type: key === 'service' ? 'coaching' : 'ebook',
                      }))
                    }
                    className={`h-11 min-h-[44px] rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 border transition-all ${
                      form.kind === key
                        ? 'bg-white border-[var(--nc-coral)] text-[var(--nc-coral)]'
                        : 'bg-white border-zinc-200 text-zinc-500'
                    }`}
                  >
                    <Icon size={13} /> {label}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                <Input
                  placeholder={t('productName', locale)}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="rounded-xl bg-white border-zinc-200"
                />
                <Textarea
                  placeholder={t('description', locale)}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  className="rounded-xl bg-white border-zinc-200 min-h-[80px] resize-none"
                />
              </div>
            </div>

            <div>
              <p className="text-sm font-black text-[#2c3340] mb-3">2. Pricing & type</p>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  min={0}
                  placeholder={t('price', locale)}
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  className="rounded-xl bg-white border-zinc-200"
                />
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      type: e.target.value as StoreProductType,
                    }))
                  }
                  className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 focus:outline-none"
                >
                  {typeOptions.map((tp) => (
                    <option key={tp} value={tp}>
                      {tp}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <p className="text-sm font-black text-[#2c3340] mb-3">3. Cover image</p>
              {form.image_url ? (
                <div className="relative rounded-xl overflow-hidden border border-zinc-200 max-w-[220px]">
                  <img src={form.image_url} alt="" className="w-full h-28 object-cover" />
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, image_url: '' }))}
                    className="absolute top-2 right-2 h-8 w-8 rounded-lg bg-black/50 text-white flex items-center justify-center"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => imageRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 h-11 min-h-[44px] px-3 rounded-xl text-xs font-extrabold text-zinc-500 bg-white border border-zinc-200 hover:border-[var(--nc-coral)] hover:text-[var(--nc-coral)] disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <ImageIcon size={13} />
                  )}
                  {t('uploadImage', locale)}
                </button>
              )}
            </div>

            <div className="border-t border-zinc-200 pt-4">
              <CollectInfoFieldBuilder
                fields={form.collect_fields}
                onChange={(collect_fields) =>
                  setForm((f) => ({ ...f, collect_fields }))
                }
                orderBump={form.order_bump}
                onOrderBumpChange={(order_bump) =>
                  setForm((f) => ({ ...f, order_bump }))
                }
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 min-h-[44px]">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) =>
                  setForm((f) => ({ ...f, is_published: e.target.checked }))
                }
                className="rounded border-zinc-300"
              />
              {t('published', locale)}
            </label>

            <Button
              type="button"
              disabled={!canSubmit}
              onClick={submit}
              className="w-full rounded-xl bg-[var(--nc-coral)] text-white font-black h-11"
            >
              {mutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : isEditing ? (
                'Save changes'
              ) : (
                <>
                  <Plus size={14} className="mr-1" /> {t('addProductBtn', locale)}
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="nc-glass rounded-[1.5rem] py-12 text-center text-sm text-zinc-400">
          {t('loading', locale)}
        </div>
      ) : products.length === 0 ? (
        <div className="nc-glass rounded-[1.5rem] py-12 text-center">
          <ShoppingBag size={28} className="text-zinc-200 mx-auto mb-2" />
          <p className="text-sm font-bold text-zinc-400">{t('storeEmpty', locale)}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((product) => {
            const isService = product.kind === 'service';
            const fieldCount = (product.collect_fields ?? []).filter(
              (f) => f.visible
            ).length;
            return (
              <div
                key={product.id}
                className="nc-glass rounded-[1.5rem] p-4 sm:p-5 flex gap-3 sm:gap-4"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-zinc-100 flex-shrink-0">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {isService ? (
                        <Briefcase size={20} className="text-zinc-300" />
                      ) : (
                        <Package size={20} className="text-zinc-300" />
                      )}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="text-sm font-black text-[#2c3340] truncate">
                      {product.name}
                    </p>
                    <span
                      className={`text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full ${
                        isService
                          ? 'bg-zinc-100 text-zinc-600'
                          : 'bg-[#f2eeff] text-[#6b5bb8]'
                      }`}
                    >
                      {isService
                        ? t('storeServices', locale)
                        : t('storeProducts', locale)}
                    </span>
                    {!product.is_published && (
                      <span className="text-[9px] font-black uppercase tracking-wide bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full">
                        Draft
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 line-clamp-2 mb-1">
                    {product.description}
                  </p>
                  <p className="text-sm font-black text-[#2c3340] tabular-nums">
                    {product.price === 0
                      ? t('freeLabel', locale)
                      : `${Math.round(product.price)} ${product.currency}`}
                    <span className="text-[10px] font-bold text-zinc-400 ml-2">
                      {product.type} · {fieldCount} checkout fields
                      {product.order_bump?.enabled ? ' · bump' : ''}
                    </span>
                  </p>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(product)}
                    className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-zinc-50 text-zinc-500 hover:bg-[#f2eeff] hover:text-[var(--nc-coral)] flex items-center justify-center"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={mutation.isPending}
                    onClick={() =>
                      mutation.mutate({ action: 'toggle_publish', id: product.id })
                    }
                    className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-zinc-50 text-zinc-500 hover:bg-[#f2eeff] hover:text-[var(--nc-coral)] flex items-center justify-center disabled:opacity-50"
                    title={product.is_published ? 'Hide' : 'Publish'}
                  >
                    {product.is_published ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button
                    type="button"
                    disabled={mutation.isPending}
                    onClick={() => {
                      if (!window.confirm(t('confirmDeleteProduct', locale))) return;
                      mutation.mutate({ action: 'delete', id: product.id });
                    }}
                    className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

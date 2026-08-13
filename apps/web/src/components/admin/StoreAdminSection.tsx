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
  GraduationCap,
  ToggleLeft,
  ToggleRight,
  Upload,
  Link2,
  Award,
  FileDown,
} from 'lucide-react';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import useUpload from '@/utils/useUpload';
import AdminEmptyState from '@/components/admin/AdminEmptyState';
import {
  offerPillFromProduct,
  productFieldsFromOfferPill,
  type OfferTypePill,
  type StoreKind,
  type StoreProduct,
} from '@/lib/mock-store';
import {
  DEFAULT_FULFILLMENT,
  DEFAULT_ORDER_BUMP,
  MEMBER_ONE_CLICK_COLLECT_FIELDS,
  nextCollectFieldId,
  type BillingInterval,
  type CollectField,
  type CollectFieldType,
  type FulfillmentType,
  type OfferFulfillment,
  type OrderBump,
} from '@/lib/store-collect-fields';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useWorkspaceOptional } from '@/context/WorkspaceContext';
import { toast } from 'sonner';

type StoreResponse = {
  products: StoreProduct[];
  demo?: boolean;
};

type ClassroomResponse = {
  courses: { id: number; title: string }[];
};

type ProductForm = {
  id: number | null;
  name: string;
  description: string;
  price: string;
  offerPill: OfferTypePill;
  billing_interval: BillingInterval;
  image_url: string;
  is_published: boolean;
  require_custom_fields: boolean;
  custom_fields: CollectField[];
  order_bump: OrderBump;
  fulfillment: OfferFulfillment;
};

const DESC_MAX = 280;

const EMPTY_FORM = (): ProductForm => ({
  id: null,
  name: '',
  description: '',
  price: '199',
  offerPill: 'digital',
  billing_interval: 'one_time',
  image_url: '',
  is_published: true,
  require_custom_fields: false,
  custom_fields: [],
  order_bump: { ...DEFAULT_ORDER_BUMP },
  fulfillment: { ...DEFAULT_FULFILLMENT },
});

function parsePriceSek(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, '').replace(',', '.').trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

const OFFER_PILLS: {
  key: OfferTypePill;
  label: string;
  icon: typeof Package;
}[] = [
  { key: 'digital', label: 'Digital Product / Asset', icon: Package },
  { key: 'course', label: 'Course Access', icon: GraduationCap },
  { key: 'coaching', label: '1:1 Service / Coaching', icon: Briefcase },
];

const FULFILLMENT_OPTIONS: {
  key: FulfillmentType;
  label: string;
  icon: typeof GraduationCap;
}[] = [
  { key: 'unlock_course', label: 'Unlock Classroom Course Module', icon: GraduationCap },
  { key: 'assign_badge', label: 'Assign Member Role / Badge', icon: Award },
  { key: 'digital_file', label: 'Deliver Digital File Download', icon: FileDown },
  { key: 'booking_link', label: 'Provide Booking Link', icon: Link2 },
  { key: 'none', label: 'No automated fulfillment', icon: Package },
];

function buildCollectFields(form: ProductForm): CollectField[] {
  const defaults = MEMBER_ONE_CLICK_COLLECT_FIELDS.map((f) => ({ ...f }));
  if (!form.require_custom_fields) return defaults;
  return [...defaults, ...form.custom_fields.map((f) => ({ ...f, visible: true }))];
}

export default function StoreAdminSection({
  communityId,
}: {
  communityId?: number;
}) {
  const { locale } = useLocale();
  const workspaceCtx = useWorkspaceOptional();
  const queryClient = useQueryClient();
  const [kindFilter, setKindFilter] = useState<'all' | StoreKind>('all');
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [upload, { loading: uploading }] = useUpload();
  const imageRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const queryKey = ['admin-store', communityId ?? 'all'] as const;
  const storeUrl = '/api/admin/community/store';

  const { data, isLoading } = useQuery<StoreResponse>({
    queryKey,
    queryFn: async () => {
      const qs = communityId ? `?community_id=${communityId}` : '';
      const r = await fetch(`${storeUrl}${qs}`);
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
  });

  const { data: classroom } = useQuery<ClassroomResponse>({
    queryKey: ['admin-classroom', communityId ?? 'all'],
    enabled: Boolean(communityId) && showForm,
    queryFn: async () => {
      const qs = communityId ? `?community_id=${communityId}` : '';
      const r = await fetch(`/api/admin/classroom${qs}`);
      if (!r.ok) return { courses: [] };
      return r.json();
    },
  });

  const products = useMemo(() => {
    const list = data?.products ?? [];
    if (kindFilter === 'all') return list;
    return list.filter((p) => p.kind === kindFilter);
  }, [data?.products, kindFilter]);

  const isEditing = form.id != null;
  const courses = classroom?.courses ?? [];

  const mutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const r = await fetch(storeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(json?.message || json?.error || 'Failed to save offer');
      }
      return json;
    },
    onSuccess: (res, variables) => {
      queryClient.setQueryData<StoreResponse>(queryKey, (prev) => {
        const base = prev ?? { products: [] };
        const action = String(variables.action ?? 'create');

        if (action === 'create') {
          const product: StoreProduct = res.product;
          return {
            ...base,
            products: [product, ...(base.products ?? []).filter((p) => p.id !== product.id)],
          };
        }

        if (action === 'update' || action === 'toggle_publish') {
          const product = res.product as StoreProduct | undefined;
          if (!product) return base;
          return {
            ...base,
            products: (base.products ?? []).map((p) =>
              p.id === product.id ? { ...p, ...product } : p
            ),
          };
        }

        if (action === 'delete') {
          const id = Number(variables.id);
          return {
            ...base,
            products: (base.products ?? []).filter((p) => p.id !== id),
          };
        }

        return base;
      });
      void queryClient.invalidateQueries({ queryKey: ['store'] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-store'] });
      if (
        String(variables.action ?? 'create') === 'create' ||
        String(variables.action) === 'update'
      ) {
        toast.success(isEditing ? 'Offer updated' : 'Offer saved to community store');
        setForm(EMPTY_FORM());
        setShowForm(false);
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Could not save offer');
    },
  });

  const handleImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    const result = await upload({ file });
    if (result.url) {
      setForm((f) => ({ ...f, image_url: result.url! }));
      return;
    }
    setForm((f) => ({ ...f, image_url: URL.createObjectURL(file) }));
  };

  const handleFulfillmentFile = async (file: File) => {
    const result = await upload({ file });
    const url = result.url || URL.createObjectURL(file);
    setForm((f) => ({
      ...f,
      fulfillment: { ...f.fulfillment, type: 'digital_file', target: url },
    }));
  };

  const openCreate = () => {
    setForm(EMPTY_FORM());
    setShowForm(true);
  };

  const openEdit = (product: StoreProduct) => {
    const custom = (product.collect_fields ?? []).filter((f) => !f.isDefault);
    setForm({
      id: product.id,
      name: product.name,
      description: product.description ?? '',
      price: String(product.price),
      offerPill: offerPillFromProduct(product),
      billing_interval: product.billing_interval ?? 'one_time',
      image_url: product.image_url ?? '',
      is_published: product.is_published,
      require_custom_fields:
        product.require_custom_fields ?? custom.some((f) => f.visible),
      custom_fields: custom,
      order_bump: product.order_bump
        ? { ...product.order_bump }
        : { ...DEFAULT_ORDER_BUMP },
      fulfillment: product.fulfillment
        ? { ...product.fulfillment }
        : { ...DEFAULT_FULFILLMENT },
    });
    setShowForm(true);
  };

  const priceValue = parsePriceSek(form.price);
  const hasName = Boolean(form.name.trim());
  const hasPrice = priceValue != null;
  // Keep the CTA clickable — validate on click so the button never feels "dead".
  const canSubmit = !mutation.isPending;

  const submit = () => {
    if (!hasName) {
      toast.error('Add an offer title');
      nameRef.current?.focus();
      nameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!hasPrice) {
      toast.error('Enter a price in SEK (use 0 for free)');
      priceRef.current?.focus();
      priceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!communityId) {
      toast.error('Create a community before adding store offers');
      return;
    }
    const mapped = productFieldsFromOfferPill(form.offerPill);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim().slice(0, DESC_MAX) || null,
      price: priceValue,
      type: mapped.type,
      kind: mapped.kind,
      image_url: form.image_url || null,
      is_published: form.is_published,
      community_id: communityId,
      workspace_id: workspaceCtx?.activeWorkspaceId ?? null,
      collect_fields: buildCollectFields(form),
      order_bump: form.order_bump,
      billing_interval: form.billing_interval,
      fulfillment: form.fulfillment,
      require_custom_fields: form.require_custom_fields,
    };
    if (isEditing) {
      mutation.mutate({ action: 'update', id: form.id, ...payload });
    } else {
      mutation.mutate({ action: 'create', ...payload });
    }
  };

  const addCustomField = (type: CollectFieldType = 'text') => {
    setForm((f) => ({
      ...f,
      custom_fields: [
        ...f.custom_fields,
        {
          id: nextCollectFieldId(),
          label: type === 'textarea' ? 'Additional context' : 'Custom field',
          type,
          required: false,
          visible: true,
        },
      ],
    }));
  };

  const priceSuffix =
    form.billing_interval === 'monthly'
      ? 'SEK/mo'
      : form.billing_interval === 'yearly'
        ? 'SEK/yr'
        : 'SEK';

  return (
    <div className="space-y-4">
      <div className="nc-glass rounded-[1.5rem] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between mb-4">
          <div>
            <h3 className="text-sm font-black text-[#2c3340] flex items-center gap-2">
              <ShoppingBag size={14} className="text-[#F472B6]" />
              {t('storeAdminTitle', locale)}
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Sell exclusive offers to logged-in members — 1-click checkout, no re-entering contact info.
            </p>
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
            className="inline-flex items-center gap-1.5 h-11 min-h-[44px] px-4 rounded-xl bg-[#F472B6] hover:bg-[#ec4899] text-white text-xs font-black transition-colors"
          >
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? t('cancel', locale) : t('addProduct', locale)}
          </button>
        </div>

        <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl w-fit mb-4">
          {(
            [
              { key: 'all' as const, label: t('storeAll', locale) },
              { key: 'product' as const, label: t('storeProducts', locale) },
              { key: 'service' as const, label: t('storeServices', locale) },
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
          <div className="rounded-2xl border border-zinc-100 bg-white p-4 sm:p-5 space-y-6 mb-4">
            {/* 1. Offer basics */}
            <section className="space-y-3">
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
                1. Offer basics
              </p>
              <div className="flex flex-wrap gap-2">
                {OFFER_PILLS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, offerPill: key }))}
                    className={`inline-flex items-center gap-1.5 h-11 min-h-[44px] px-3.5 rounded-full text-xs font-extrabold border transition-colors ${
                      form.offerPill === key
                        ? 'bg-[#E9D5FF]/80 border-[#E9D5FF] text-[#1a1848]'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon size={13} /> {label}
                  </button>
                ))}
              </div>
              <input
                ref={nameRef}
                type="text"
                placeholder='e.g. "1:1 Strategy Coaching Call"'
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full h-11 min-h-[44px] rounded-xl border border-zinc-200 bg-white px-3.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#F472B6]/25 focus:border-[#F472B6]"
              />
              <div className="space-y-1">
                <Textarea
                  placeholder="Short description for members…"
                  value={form.description}
                  maxLength={DESC_MAX}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      description: e.target.value.slice(0, DESC_MAX),
                    }))
                  }
                  className="rounded-xl border-zinc-200 min-h-[88px] resize-none"
                />
                <p className="text-[10px] font-bold text-zinc-400 text-right tabular-nums">
                  {form.description.length}/{DESC_MAX}
                </p>
              </div>
            </section>

            {/* 2. Pricing */}
            <section className="space-y-3 border-t border-zinc-100 pt-5">
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
                2. Pricing & billing
              </p>
              <div className="relative max-w-xs">
                <input
                  ref={priceRef}
                  type="text"
                  inputMode="decimal"
                  placeholder="199"
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      price: e.target.value.replace(/[^\d.,]/g, ''),
                    }))
                  }
                  className={`w-full h-11 min-h-[44px] rounded-xl border bg-white px-3.5 pr-16 text-sm font-semibold tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#F472B6]/25 ${
                    !hasPrice
                      ? 'border-rose-300'
                      : 'border-zinc-200 focus:border-[#F472B6]'
                  }`}
                  aria-label="Price in SEK"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                  {priceSuffix}
                </span>
              </div>
              {!hasPrice ? (
                <p className="text-xs font-semibold text-rose-500">
                  Enter a price in SEK (use 0 for free).
                </p>
              ) : null}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, billing_interval: 'one_time' }))
                  }
                  className={`h-11 min-h-[44px] rounded-xl text-sm font-semibold border transition-colors ${
                    form.billing_interval === 'one_time'
                      ? 'bg-[#E9D5FF]/70 border-[#E9D5FF] text-[#1a1848]'
                      : 'bg-white border-zinc-200 text-zinc-600'
                  }`}
                >
                  One-time payment
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      billing_interval:
                        f.billing_interval === 'one_time' ? 'monthly' : f.billing_interval,
                    }))
                  }
                  className={`h-11 min-h-[44px] rounded-xl text-sm font-semibold border transition-colors ${
                    form.billing_interval !== 'one_time'
                      ? 'bg-[#E9D5FF]/70 border-[#E9D5FF] text-[#1a1848]'
                      : 'bg-white border-zinc-200 text-zinc-600'
                  }`}
                >
                  Recurring subscription
                </button>
              </div>
              {form.billing_interval !== 'one_time' ? (
                <div className="flex gap-2">
                  {(['monthly', 'yearly'] as const).map((interval) => (
                    <button
                      key={interval}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, billing_interval: interval }))
                      }
                      className={`h-10 min-h-[40px] px-4 rounded-xl text-xs font-bold border ${
                        form.billing_interval === interval
                          ? 'border-[#F472B6] text-[#F472B6] bg-pink-50'
                          : 'border-zinc-200 text-zinc-500'
                      }`}
                    >
                      {interval === 'monthly' ? 'Monthly' : 'Yearly'}
                    </button>
                  ))}
                </div>
              ) : null}
            </section>

            {/* 3. Cover */}
            <section className="space-y-3 border-t border-zinc-100 pt-5">
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
                3. Cover banner / thumbnail
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
              <button
                type="button"
                onClick={() => imageRef.current?.click()}
                disabled={uploading}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) void handleImage(f);
                }}
                className="relative w-full aspect-video max-h-48 rounded-2xl border border-dashed border-zinc-200 bg-slate-50 overflow-hidden hover:bg-slate-100/80 transition-colors flex items-center justify-center disabled:opacity-50"
              >
                {form.image_url ? (
                  <>
                    <img
                      src={form.image_url}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <span className="absolute bottom-2 right-2 h-9 px-3 rounded-lg bg-black/55 text-white text-[10px] font-bold inline-flex items-center gap-1">
                      <Upload size={11} /> Change
                    </span>
                  </>
                ) : (
                  <span className="inline-flex flex-col items-center gap-1.5 text-xs font-semibold text-zinc-400">
                    {uploading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <ImageIcon size={18} />
                    )}
                    Drop image or click to upload (16:9)
                  </span>
                )}
              </button>
              {form.image_url ? (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, image_url: '' }))}
                  className="text-xs font-bold text-zinc-400 hover:text-rose-500"
                >
                  Remove cover
                </button>
              ) : null}
            </section>

            {/* 4. Fulfillment */}
            <section className="space-y-3 border-t border-zinc-100 pt-5">
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
                4. Automated member fulfillment
              </p>
              <p className="text-xs text-zinc-400 font-medium -mt-1">
                What happens when a member buys this offer?
              </p>
              <select
                value={form.fulfillment.type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    fulfillment: {
                      type: e.target.value as FulfillmentType,
                      target: '',
                    },
                  }))
                }
                className="w-full h-11 min-h-[44px] rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-slate-800"
              >
                {FULFILLMENT_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {form.fulfillment.type === 'unlock_course' ? (
                <select
                  value={form.fulfillment.target}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      fulfillment: { ...f.fulfillment, target: e.target.value },
                    }))
                  }
                  className="w-full h-11 min-h-[44px] rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold"
                >
                  <option value="">Select classroom course…</option>
                  {courses.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.title}
                    </option>
                  ))}
                </select>
              ) : null}

              {form.fulfillment.type === 'assign_badge' ? (
                <Input
                  placeholder="e.g. VIP, Insider"
                  value={form.fulfillment.target}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      fulfillment: { ...f.fulfillment, target: e.target.value },
                    }))
                  }
                  className="rounded-xl border-zinc-200 h-11"
                />
              ) : null}

              {form.fulfillment.type === 'digital_file' ? (
                <div className="space-y-2">
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleFulfillmentFile(f);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="h-11 min-h-[44px] px-4 rounded-xl border border-zinc-200 bg-slate-50 text-xs font-extrabold text-zinc-600 inline-flex items-center gap-1.5"
                  >
                    {uploading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Upload size={14} />
                    )}
                    Upload downloadable file
                  </button>
                  {form.fulfillment.target ? (
                    <p className="text-[11px] font-medium text-zinc-500 truncate">
                      {form.fulfillment.target}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {form.fulfillment.type === 'booking_link' ? (
                <Input
                  type="url"
                  placeholder="https://calendly.com/…"
                  value={form.fulfillment.target}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      fulfillment: { ...f.fulfillment, target: e.target.value },
                    }))
                  }
                  className="rounded-xl border-zinc-200 h-11"
                />
              ) : null}
            </section>

            {/* Custom fields toggle (replaces Collect Info) */}
            <section className="space-y-3 border-t border-zinc-100 pt-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-[#2c3340]">
                    Require additional custom fields at checkout
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5 font-medium">
                    Off by default — members already have name, email & billing on file.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      require_custom_fields: !f.require_custom_fields,
                    }))
                  }
                  className="h-11 min-h-[44px] px-1 flex-shrink-0"
                  aria-label="Toggle custom checkout fields"
                >
                  {form.require_custom_fields ? (
                    <ToggleRight size={28} className="text-[#F472B6]" />
                  ) : (
                    <ToggleLeft size={28} className="text-zinc-300" />
                  )}
                </button>
              </div>
              {form.require_custom_fields ? (
                <div className="space-y-2">
                  {form.custom_fields.map((field) => (
                    <div
                      key={field.id}
                      className="flex gap-2 items-center rounded-xl border border-zinc-200 bg-slate-50 p-2"
                    >
                      <Input
                        value={field.label}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            custom_fields: f.custom_fields.map((cf) =>
                              cf.id === field.id
                                ? { ...cf, label: e.target.value }
                                : cf
                            ),
                          }))
                        }
                        className="h-10 rounded-lg text-sm flex-1"
                        placeholder="Field label"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            custom_fields: f.custom_fields.filter(
                              (cf) => cf.id !== field.id
                            ),
                          }))
                        }
                        className="h-10 w-10 rounded-lg text-zinc-400 hover:text-rose-500 flex items-center justify-center"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addCustomField('text')}
                    className="h-10 min-h-[40px] px-3 rounded-xl border border-dashed border-zinc-300 text-xs font-extrabold text-zinc-500 inline-flex items-center gap-1"
                  >
                    <Plus size={12} /> Add custom field
                  </button>
                </div>
              ) : null}
            </section>

            {/* 5. Order bump */}
            <section className="space-y-3 border-t border-zinc-100 pt-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400 mb-1">
                    5. Upsell / order bump
                  </p>
                  <p className="text-sm font-extrabold text-[#2c3340]">
                    Optional 1-click upsell at checkout
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      order_bump: {
                        ...f.order_bump,
                        enabled: !f.order_bump.enabled,
                      },
                    }))
                  }
                  className="h-11 min-h-[44px] px-1"
                >
                  {form.order_bump.enabled ? (
                    <ToggleRight size={28} className="text-[#F472B6]" />
                  ) : (
                    <ToggleLeft size={28} className="text-zinc-300" />
                  )}
                </button>
              </div>
              {form.order_bump.enabled ? (
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-2">
                  <Input
                    value={form.order_bump.title}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        order_bump: { ...f.order_bump, title: e.target.value },
                      }))
                    }
                    placeholder="Bump title"
                    className="h-11 rounded-xl text-sm"
                  />
                  <Input
                    type="number"
                    min={0}
                    value={form.order_bump.price}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        order_bump: {
                          ...f.order_bump,
                          price: Number(e.target.value) || 0,
                        },
                      }))
                    }
                    placeholder="SEK"
                    className="h-11 rounded-xl text-sm tabular-nums"
                  />
                  <Input
                    value={form.order_bump.description ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        order_bump: {
                          ...f.order_bump,
                          description: e.target.value,
                        },
                      }))
                    }
                    placeholder="Short bump description"
                    className="h-11 rounded-xl text-sm sm:col-span-2"
                  />
                </div>
              ) : null}
            </section>

            {/* 6. Publish */}
            <section className="space-y-3 border-t border-zinc-100 pt-5">
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-400">
                6. Publishing & visibility
              </p>
              <label className="flex items-center gap-2 text-sm font-bold text-zinc-600 min-h-[44px] cursor-pointer w-fit">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, is_published: e.target.checked }))
                  }
                  className="rounded border-zinc-300"
                />
                Published (visible in community storefront)
              </label>
              <button
                type="button"
                disabled={!canSubmit}
                onClick={submit}
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto rounded-xl bg-[#F472B6] hover:bg-[#ec4899] active:scale-[0.99] text-white font-black h-11 min-h-[44px] px-6 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Plus size={14} />
                )}
                {isEditing ? 'Save offer' : 'Save offer / Add product'}
              </button>
            </section>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="nc-glass rounded-[1.5rem] py-12 text-center text-sm text-zinc-400">
          {t('loading', locale)}
        </div>
      ) : products.length === 0 ? (
        <AdminEmptyState
          icon={ShoppingBag}
          headline="No digital products yet"
          description="Create your first e-book, course, or coaching offer for this workspace."
          ctaLabel="+ Create First Digital Product"
          onCta={() => setShowForm(true)}
        />
      ) : (
        <div className="space-y-3">
          {products.map((product) => {
            const isService = product.kind === 'service';
            const pill = offerPillFromProduct(product);
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
                    <span className="text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-[#E9D5FF]/60 text-[#2B2568]">
                      {pill === 'course'
                        ? 'Course'
                        : pill === 'coaching'
                          ? 'Coaching'
                          : 'Digital'}
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
                      : `${Math.round(product.price)} ${product.currency}${
                          product.billing_interval === 'monthly'
                            ? '/mo'
                            : product.billing_interval === 'yearly'
                              ? '/yr'
                              : ''
                        }`}
                    <span className="text-[10px] font-bold text-zinc-400 ml-2">
                      1-click member checkout
                      {product.order_bump?.enabled ? ' · bump' : ''}
                      {product.fulfillment?.type &&
                      product.fulfillment.type !== 'none'
                        ? ` · ${product.fulfillment.type.replace(/_/g, ' ')}`
                        : ''}
                    </span>
                  </p>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(product)}
                    className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-zinc-50 text-zinc-500 hover:bg-pink-50 hover:text-[#F472B6] flex items-center justify-center"
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
                    className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-zinc-50 text-zinc-500 hover:bg-pink-50 hover:text-[#F472B6] flex items-center justify-center disabled:opacity-50"
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

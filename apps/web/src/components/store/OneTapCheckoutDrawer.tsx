'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  Smartphone,
  X,
  Package,
} from 'lucide-react';
import type { StoreProduct } from '@/lib/mock-store';
import {
  visibleCollectFields,
  type CollectField,
} from '@/lib/store-collect-fields';

type Props = {
  open: boolean;
  product: StoreProduct | null;
  communityId?: number | null;
  onClose: () => void;
  onSuccess?: (payload: {
    product: StoreProduct;
    values: Record<string, string>;
    bumpSelected: boolean;
    total: number;
  }) => void;
};

function validateField(field: CollectField, value: string): string | null {
  const v = value.trim();
  if (field.required && !v) return 'This field is required';
  if (!v) return null;
  if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
    return 'Enter a valid email';
  }
  if (field.type === 'phone' && v.replace(/\D/g, '').length < 8) {
    return 'Enter a valid phone number';
  }
  return null;
}

export default function OneTapCheckoutDrawer({
  open,
  product,
  communityId,
  onClose,
  onSuccess,
}: Props) {
  const fields = useMemo(
    () => (product ? visibleCollectFields(product.collect_fields ?? []) : []),
    [product]
  );
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bumpSelected, setBumpSelected] = useState(false);
  const [paying, setPaying] = useState(false);
  const [swishPulse, setSwishPulse] = useState(false);
  const [done, setDone] = useState(false);
  const [redirectIn, setRedirectIn] = useState(3);

  useEffect(() => {
    if (!open || !product) return;
    const initial: Record<string, string> = {};
    for (const f of visibleCollectFields(product.collect_fields ?? [])) {
      initial[f.id] = '';
    }
    setValues(initial);
    setErrors({});
    setBumpSelected(false);
    setPaying(false);
    setSwishPulse(false);
    setDone(false);
    setRedirectIn(3);
  }, [open, product?.id]);

  useEffect(() => {
    if (!done) return;
    if (redirectIn <= 0) {
      onClose();
      return;
    }
    const t = setTimeout(() => setRedirectIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [done, redirectIn, onClose]);

  if (!open || !product) return null;

  const bump =
    product.order_bump?.enabled && product.order_bump.price > 0
      ? product.order_bump
      : null;
  const bumpAmount = bumpSelected && bump ? bump.price : 0;
  const total = Number(product.price) + bumpAmount;

  const setValue = (id: string, value: string) => {
    setValues((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) setErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const validateAll = () => {
    const next: Record<string, string> = {};
    for (const f of fields) {
      const err = validateField(f, values[f.id] ?? '');
      if (err) next[f.id] = err;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const completePurchase = async (method: 'swish' | 'card') => {
    if (!validateAll()) return;
    setPaying(true);
    if (method === 'swish') {
      setSwishPulse(true);
      await new Promise((r) => setTimeout(r, 1400));
      setSwishPulse(false);
    } else {
      await new Promise((r) => setTimeout(r, 900));
    }

    // Sync buyer into Email CRM (demo).
    const source =
      product.type === 'ebook'
        ? 'ebook_purchaser'
        : product.type === 'community' || product.kind === 'service'
          ? 'vip_access'
          : 'store_purchase';
    try {
      await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync',
          source,
          name: values.name || values.email || 'Buyer',
          email: values.email || undefined,
          community_id: communityId ?? product.community_id,
          tags: [
            product.type === 'ebook'
              ? 'E-Book Purchaser'
              : product.type === 'community'
                ? 'VIP Access'
                : 'Store Purchase',
          ],
        }),
      });
    } catch {
      /* non-blocking */
    }

    setPaying(false);
    setDone(true);
    onSuccess?.({
      product,
      values,
      bumpSelected,
      total,
    });
  };

  const redirectHint =
    product.type === 'community'
      ? 'community'
      : product.type === 'course' || product.type === 'ebook'
        ? 'course content'
        : 'your purchase';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close checkout"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={() => !paying && onClose()}
      />

      <div
        className="relative z-10 w-full bg-white shadow-2xl flex flex-col
          max-h-[92vh] mt-auto rounded-t-3xl
          sm:mt-0 sm:max-h-none sm:h-full sm:max-w-md sm:rounded-none"
        role="dialog"
        aria-modal="true"
        aria-label="1-tap checkout"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 flex-shrink-0">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
              1-Tap Checkout
            </p>
            <p className="text-sm font-black text-[#2c3340]">Secure checkout</p>
          </div>
          <button
            type="button"
            onClick={() => !paying && onClose()}
            className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-zinc-50 flex items-center justify-center"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {done ? (
            <div className="py-10 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <p className="text-lg font-black text-[#2c3340]">Payment confirmed!</p>
                <p className="text-sm text-zinc-500 mt-1">
                  Redirecting to {redirectHint} in {redirectIn}s…
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="h-11 min-h-[44px] px-5 rounded-full bg-[var(--nc-coral)] text-white text-sm font-black"
              >
                Continue now
              </button>
            </div>
          ) : (
            <>
              {/* Product summary */}
              <div className="flex gap-3 p-3 rounded-2xl bg-zinc-50 border border-zinc-100">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-100 flex-shrink-0">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={20} className="text-zinc-300" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-[#2c3340] leading-snug">
                    {product.name}
                  </p>
                  <p className="text-xs text-zinc-400 line-clamp-2 mt-0.5">
                    {product.description}
                  </p>
                  <p className="text-base font-black text-[#2c3340] mt-1 tabular-nums">
                    {product.price === 0
                      ? 'Free'
                      : `${Math.round(product.price)} SEK`}
                  </p>
                </div>
              </div>

              {/* Collect info form */}
              <div className="space-y-3">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                  Your info
                </p>
                {fields.map((field) => (
                  <label key={field.id} className="block space-y-1">
                    <span className="text-xs font-bold text-zinc-600">
                      {field.label}
                      {field.required && (
                        <span className="text-[var(--nc-coral)] ml-0.5">*</span>
                      )}
                    </span>
                    {field.type === 'textarea' ? (
                      <textarea
                        value={values[field.id] ?? ''}
                        onChange={(e) => setValue(field.id, e.target.value)}
                        rows={3}
                        className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--nc-coral)] resize-none min-h-[88px] ${
                          errors[field.id] ? 'border-red-400' : 'border-zinc-200'
                        }`}
                      />
                    ) : field.type === 'dropdown' ? (
                      <select
                        value={values[field.id] ?? ''}
                        onChange={(e) => setValue(field.id, e.target.value)}
                        className={`w-full h-11 min-h-[44px] rounded-xl border bg-white px-3 text-sm focus:outline-none focus:border-[var(--nc-coral)] ${
                          errors[field.id] ? 'border-red-400' : 'border-zinc-200'
                        }`}
                      >
                        <option value="">Select…</option>
                        {(field.options ?? []).map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={
                          field.type === 'email'
                            ? 'email'
                            : field.type === 'phone'
                              ? 'tel'
                              : 'text'
                        }
                        inputMode={
                          field.type === 'phone'
                            ? 'tel'
                            : field.type === 'email'
                              ? 'email'
                              : 'text'
                        }
                        value={values[field.id] ?? ''}
                        onChange={(e) => setValue(field.id, e.target.value)}
                        className={`w-full h-11 min-h-[44px] rounded-xl border bg-white px-3 text-sm focus:outline-none focus:border-[var(--nc-coral)] ${
                          errors[field.id] ? 'border-red-400' : 'border-zinc-200'
                        }`}
                        placeholder={
                          field.type === 'phone'
                            ? '07X XXX XX XX'
                            : field.type === 'email'
                              ? 'you@email.com'
                              : undefined
                        }
                      />
                    )}
                    {errors[field.id] && (
                      <span className="text-[11px] font-bold text-red-500">
                        {errors[field.id]}
                      </span>
                    )}
                  </label>
                ))}
              </div>

              {/* Order bump */}
              {bump && (
                <label className="flex items-start gap-3 p-3.5 rounded-2xl border-2 border-amber-200 bg-amber-50/60 cursor-pointer min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={bumpSelected}
                    onChange={(e) => setBumpSelected(e.target.checked)}
                    className="mt-1 rounded border-amber-300"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-black text-[#2c3340]">
                      {bump.title}
                    </span>
                    {bump.description && (
                      <span className="block text-xs text-zinc-500 mt-0.5">
                        {bump.description}
                      </span>
                    )}
                  </span>
                </label>
              )}

              <div className="flex items-center justify-between text-sm font-bold text-zinc-600 pt-1">
                <span>Total</span>
                <span className="text-lg font-black text-[#2c3340] tabular-nums">
                  {Math.round(total)} SEK
                </span>
              </div>
            </>
          )}
        </div>

        {!done && (
          <div className="px-5 py-4 border-t border-zinc-100 space-y-2 flex-shrink-0 bg-white">
            <button
              type="button"
              disabled={paying}
              onClick={() => void completePurchase('swish')}
              className={`relative w-full h-12 min-h-[48px] rounded-xl text-white text-sm font-black flex items-center justify-center gap-2 overflow-hidden disabled:opacity-70 transition-transform active:scale-[0.98] ${
                swishPulse ? 'scale-[1.02]' : ''
              }`}
              style={{ background: '#002244' }}
            >
              {swishPulse && (
                <span
                  className="absolute inset-0 bg-white/15"
                  style={{ animation: 'livePulse 0.8s ease-in-out infinite' }}
                />
              )}
              {paying && swishPulse ? (
                <>
                  <Loader2 size={16} className="animate-spin relative z-10" />
                  <span className="relative z-10">Opening Swish…</span>
                </>
              ) : (
                <>
                  <Smartphone size={16} className="relative z-10" />
                  <span className="relative z-10">
                    Betala med Swish · {Math.round(total)} SEK
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={paying}
              onClick={() => void completePurchase('card')}
              className="w-full h-11 min-h-[44px] rounded-xl border border-zinc-200 bg-white text-sm font-bold text-[#2c3340] flex items-center justify-center gap-2 hover:bg-zinc-50 disabled:opacity-60"
            >
              {paying && !swishPulse ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <CreditCard size={15} />
              )}
              Card / Apple Pay
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

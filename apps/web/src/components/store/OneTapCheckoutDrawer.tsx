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
import { useLanguage } from '@/lib/i18n';
import { listManagedCommunities } from '@/lib/mock-community-admin';
import { authClient } from '@/lib/auth-client';

type Props = {
  open: boolean;
  product: StoreProduct | null;
  communityId?: number | null;
  /** Active brand workspace — credits wallet + orders ledger */
  workspaceId?: string | null;
  /** Public bio handle used to resolve seller when workspace row is missing */
  handle?: string | null;
  /** Explicit seller (creator) user id when known */
  sellerUserId?: string | null;
  onClose: () => void;
  onSuccess?: (payload: {
    product: StoreProduct;
    values: Record<string, string>;
    bumpSelected: boolean;
    total: number;
  }) => void;
};

function validateField(
  field: CollectField,
  value: string,
  translate: (key: string) => string,
): string | null {
  const v = value.trim();
  if (field.required && !v) return translate('fieldRequired');
  if (!v) return null;
  if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
    return translate('validEmail');
  }
  if (field.type === 'phone' && v.replace(/\D/g, '').length < 8) {
    return translate('validPhone');
  }
  return null;
}

export default function OneTapCheckoutDrawer({
  open,
  product,
  communityId,
  workspaceId,
  handle,
  sellerUserId,
  onClose,
  onSuccess,
}: Props) {
  const { t } = useLanguage();
  const { data: session } = authClient.useSession();
  const fields = useMemo(
    () => (product ? visibleCollectFields(product.collect_fields ?? []) : []),
    [product]
  );
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bumpSelected, setBumpSelected] = useState(false);
  const [paying, setPaying] = useState(false);
  const [mobilePulse, setMobilePulse] = useState(false);
  const [done, setDone] = useState(false);
  const [redirectIn, setRedirectIn] = useState(3);
  const [accessEmailSent, setAccessEmailSent] = useState<{
    communityName: string;
    communityUrl: string;
  } | null>(null);

  useEffect(() => {
    if (!open || !product) return;
    const initial: Record<string, string> = {};
    for (const f of visibleCollectFields(product.collect_fields ?? [])) {
      initial[f.id] = '';
    }
    // Prefill from authenticated member session for 1-click checkout.
    if (session?.user) {
      initial.name = session.user.name || initial.name || '';
      initial.email = session.user.email || initial.email || '';
    }
    setValues(initial);
    setErrors({});
    setBumpSelected(false);
    setPaying(false);
    setMobilePulse(false);
    setDone(false);
    setRedirectIn(3);
    setAccessEmailSent(null);
  }, [open, product?.id, session?.user?.email, session?.user?.name]);

  useEffect(() => {
    if (!done || accessEmailSent) return;
    if (redirectIn <= 0) {
      onClose();
      return;
    }
    const timer = setTimeout(() => setRedirectIn((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [done, redirectIn, onClose, accessEmailSent]);

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
      const err = validateField(f, values[f.id] ?? '', t);
      if (err) next[f.id] = err;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const completePurchase = async (method: 'checkout' | 'card') => {
    if (!validateAll()) return;
    setPaying(true);
    if (method === 'checkout') {
      setMobilePulse(true);
      await new Promise((r) => setTimeout(r, 1400));
      setMobilePulse(false);
    } else {
      await new Promise((r) => setTimeout(r, 900));
    }

    // Prefer session identity for logged-in community members (1-click).
    const buyerName =
      values.name || session?.user?.name || values.email || 'Member';
    const buyerEmail = values.email || session?.user?.email || undefined;

    // Sync buyer into Email CRM (demo).
    const accessCommunityId =
      product.grants_community_access && product.access_community_id
        ? product.access_community_id
        : product.type === 'community'
          ? (communityId ?? product.community_id)
          : null;
    const source =
      accessCommunityId
        ? 'vip_access'
        : product.type === 'ebook'
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
          name: buyerName,
          email: buyerEmail,
          community_id: accessCommunityId ?? communityId ?? product.community_id,
          tags: [
            product.type === 'ebook'
              ? 'E-Book Purchaser'
              : accessCommunityId || product.type === 'community'
                ? 'VIP Access'
                : 'Store Purchase',
          ],
        }),
      });
    } catch {
      /* non-blocking */
    }

    // Automated email with a direct link into the unlocked community.
    if (accessCommunityId && buyerEmail) {
      const communityName =
        listManagedCommunities().find((c) => c.id === accessCommunityId)?.name ||
        t('community');
      try {
        const res = await fetch('/api/purchase/community-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: buyerEmail,
            name: buyerName,
            product_title: product.name,
            community_id: accessCommunityId,
            community_name: communityName,
            origin: window.location.origin,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            community_url?: string;
            community_name?: string;
          };
          setAccessEmailSent({
            communityName: data.community_name || communityName,
            communityUrl:
              data.community_url ||
              `${window.location.origin}/communities/${accessCommunityId}`,
          });
        }
      } catch {
        /* non-blocking */
      }
    }

    // Persist order + credit creator wallet (plan-based platform fee applied server-side).
    if (workspaceId && total > 0) {
      try {
        await fetch('/api/checkout/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId,
            handle: handle || null,
            sellerUserId: sellerUserId || null,
            productId: String(product.id),
            productTitle: product.name,
            productType: product.type,
            amountGrossSek: total,
            buyerEmail: buyerEmail || null,
            buyerName,
            provider: 'demo',
            externalId: `demo_${workspaceId}_${product.id}_${Date.now()}`,
            metadata: {
              bumpSelected,
              communityId: communityId ?? null,
              method,
              productType: product.type,
              kind: product.kind,
              google_calendar_enabled: product.google_calendar_enabled !== false,
            },
          }),
        });
      } catch {
        /* non-blocking — local bio-sales still recorded by parent */
      }
    }

    setPaying(false);
    setDone(true);
    onSuccess?.({
      product,
      values: {
        ...values,
        name: buyerName,
        email: buyerEmail || '',
      },
      bumpSelected,
      total,
    });
  };

  // Destination label for post-purchase redirect copy (chrome only).
  const redirectHint = accessEmailSent
    ? accessEmailSent.communityName
    : product.type === 'community'
      ? t('community')
      : product.type === 'course' || product.type === 'ebook'
        ? t('courseContentHint')
        : t('yourPurchaseHint');

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label={t('closeCheckout')}
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={() => !paying && onClose()}
      />

      <div
        className="relative z-10 w-full bg-white shadow-2xl flex flex-col
          max-h-[92vh] mt-auto rounded-t-3xl
          sm:mt-0 sm:max-h-none sm:h-full sm:max-w-md sm:rounded-none"
        role="dialog"
        aria-modal="true"
        aria-label={t('oneTapCheckout')}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              {t('oneTapCheckout')}
            </p>
            <p className="text-sm font-extrabold text-slate-900">
              {t('secureCheckout')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => !paying && onClose()}
            aria-label={t('closeCheckout')}
            className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl bg-slate-50 flex items-center justify-center"
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
                <p className="text-lg font-extrabold text-slate-900">
                  {t('paymentConfirmed')}
                </p>
                {accessEmailSent ? (
                  <p className="text-sm text-slate-500 mt-1">
                    {t('communityAccessEmailSent', {
                      community: accessEmailSent.communityName,
                    })}
                  </p>
                ) : (
                  <p className="text-sm text-slate-500 mt-1">
                    {t('redirectingTo', {
                      destination: redirectHint,
                      seconds: redirectIn,
                    })}
                  </p>
                )}
              </div>
              {accessEmailSent ? (
                <a
                  href={accessEmailSent.communityUrl}
                  className="inline-flex h-11 min-h-[44px] px-5 rounded-full bg-[var(--nc-coral)] text-white text-sm font-extrabold items-center justify-center"
                >
                  {t('openCommunity')}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="h-11 min-h-[44px] px-5 rounded-full bg-[var(--nc-coral)] text-white text-sm font-extrabold"
                >
                  {t('continueNow')}
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Product summary — name/description stay as product data */}
              <div className="flex gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={20} className="text-slate-300" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold text-slate-900 leading-snug">
                    {product.name}
                  </p>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">
                    {product.description}
                  </p>
                  <p className="text-base font-extrabold text-slate-900 mt-1 tabular-nums">
                    {product.price === 0
                      ? t('freeLabelShort')
                      : `${Math.round(product.price)} ${t('currencySek')}`}
                  </p>
                </div>
              </div>

              {/* Collect info — skipped for logged-in members when defaults are hidden */}
              <div className="space-y-3">
                {fields.length === 0 ? (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
                    <p className="text-xs font-extrabold text-emerald-800">
                      1-click member checkout
                    </p>
                    <p className="text-[11px] font-medium text-emerald-700/90 mt-0.5">
                      {session?.user?.email
                        ? `Paying as ${session.user.name || session.user.email} — contact details already on file.`
                        : 'Sign in as a community member to buy without re-entering contact info.'}
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                      {t('yourInfo')}
                    </p>
                    {fields.map((field) => (
                  <label key={field.id} className="block space-y-1">
                    <span className="text-xs font-bold text-slate-600">
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
                          errors[field.id] ? 'border-red-400' : 'border-slate-200'
                        }`}
                      />
                    ) : field.type === 'dropdown' ? (
                      <select
                        value={values[field.id] ?? ''}
                        onChange={(e) => setValue(field.id, e.target.value)}
                        className={`w-full h-11 min-h-[44px] rounded-xl border bg-white px-3 text-sm focus:outline-none focus:border-[var(--nc-coral)] ${
                          errors[field.id] ? 'border-red-400' : 'border-slate-200'
                        }`}
                      >
                        <option value="">{t('selectOption')}</option>
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
                          errors[field.id] ? 'border-red-400' : 'border-slate-200'
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
                  </>
                )}
              </div>

              {/* Order bump — title/description are product data */}
              {bump && (
                <label className="flex items-start gap-3 p-3.5 rounded-2xl border-2 border-amber-200 bg-amber-50/60 cursor-pointer min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={bumpSelected}
                    onChange={(e) => setBumpSelected(e.target.checked)}
                    className="mt-1 rounded border-amber-300"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-extrabold text-slate-900">
                      {bump.title}
                    </span>
                    {bump.description && (
                      <span className="block text-xs text-slate-500 mt-0.5">
                        {bump.description}
                      </span>
                    )}
                  </span>
                </label>
              )}

              <div className="flex items-center justify-between text-sm font-bold text-slate-600 pt-1">
                <span>{t('totalLabel').replace(/:$/, '')}</span>
                <span className="text-lg font-extrabold text-slate-900 tabular-nums">
                  {Math.round(total)} {t('currencySek')}
                </span>
              </div>
            </>
          )}
        </div>

        {!done && (
          <div className="px-5 py-4 border-t border-slate-100 space-y-2 flex-shrink-0 bg-white">
            <button
              type="button"
              disabled={paying}
              onClick={() => void completePurchase('checkout')}
              className={`relative w-full h-12 min-h-[48px] rounded-xl text-white text-sm font-extrabold flex items-center justify-center gap-2 overflow-hidden disabled:opacity-70 transition-transform active:scale-[0.98] ${
                mobilePulse ? 'scale-[1.02]' : ''
              }`}
              style={{ background: '#002244' }}
            >
              {mobilePulse && (
                <span
                  className="absolute inset-0 bg-white/15"
                  style={{ animation: 'livePulse 0.8s ease-in-out infinite' }}
                />
              )}
              {paying && mobilePulse ? (
                <>
                  <Loader2 size={16} className="animate-spin relative z-10" />
                  <span className="relative z-10">{t('openingCheckout')}</span>
                </>
              ) : (
                <>
                  <Smartphone size={16} className="relative z-10" />
                  <span className="relative z-10">
                    {t('payInstantly', { amount: Math.round(total) })}
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={paying}
              onClick={() => void completePurchase('card')}
              className="w-full h-11 min-h-[44px] rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900 flex items-center justify-center gap-2 hover:bg-slate-50 disabled:opacity-60"
            >
              {paying && !mobilePulse ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <CreditCard size={15} />
              )}
              {t('cardApplePay')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

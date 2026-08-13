'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/i18n';
import { authClient } from '@/lib/auth-client';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

type InstantCheckoutDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityName: string;
  communityId: number;
  priceSek: number;
  /** Admin workspace that receives join revenue. */
  workspaceId?: string | null;
  /** Community creator / seller user id. */
  sellerUserId?: string | null;
  onSuccess?: () => void;
};

/**
 * 1-tap community join checkout.
 * Credits the community's admin workspace via /api/checkout/complete, then joins.
 */
export function InstantCheckoutDrawer({
  open,
  onOpenChange,
  communityName,
  communityId,
  priceSek,
  workspaceId,
  sellerUserId,
  onSuccess,
}: InstantCheckoutDrawerProps) {
  const { t } = useLanguage();
  const { data: session } = authClient.useSession();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const reset = () => {
    setLoading(false);
    setDone(false);
    setPhone('');
  };

  const creditWorkspaceId =
    String(workspaceId || '').trim() ||
    String(sellerUserId || '').trim() ||
    '';

  const pay = async () => {
    setLoading(true);
    try {
      const buyerEmail = session?.user?.email || '';
      const buyerName = session?.user?.name || 'Member';

      // Paid joins → record order against the community admin workspace.
      if (priceSek > 0) {
        if (!creditWorkspaceId) {
          throw new Error(
            'This community has no admin workspace — contact the creator.'
          );
        }
        const orderRes = await fetch('/api/checkout/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId: creditWorkspaceId,
            sellerUserId: sellerUserId || null,
            productId: `community_${communityId}`,
            productTitle: `${communityName} membership`,
            productType: 'community',
            amountGrossSek: priceSek,
            buyerEmail: buyerEmail || null,
            buyerName,
            provider: 'demo',
            externalId: `community_${communityId}_${session?.user?.id || phone}_${Date.now()}`,
            metadata: {
              communityId,
              communityName,
              kind: 'community_membership',
              phone: phone.trim(),
            },
          }),
        });
        const orderJson = (await orderRes.json().catch(() => ({}))) as {
          ok?: boolean;
          recorded?: boolean;
          message?: string;
          error?: string;
        };
        if (!orderRes.ok || orderJson.ok === false) {
          throw new Error(
            orderJson.message ||
              orderJson.error ||
              'Could not record payment to creator account'
          );
        }
      }

      // Grant membership after payment (or immediately when free).
      const joinRes = await fetch('/api/communities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          community_id: communityId,
          action: 'join',
        }),
      });
      if (!joinRes.ok) {
        const joinJson = (await joinRes.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(joinJson.error || 'Join failed after payment');
      }

      setDone(true);
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DrawerContent className="mx-auto max-w-md rounded-t-3xl">
        <DrawerHeader className="text-left px-6 pt-4">
          <DrawerTitle className="font-display text-xl font-extrabold text-zinc-900">
            {priceSek > 0 ? 'Betala direkt' : 'Gå med gratis'}
          </DrawerTitle>
          <DrawerDescription className="text-sm text-zinc-500 font-medium">
            {communityName}
            {priceSek > 0
              ? ` · ${priceSek.toLocaleString('sv-SE')} kr/mån`
              : ' · Gratis medlemskap'}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-6 pb-2 space-y-4">
          {done ? (
            <div className="rounded-2xl border border-[#b6e9df] bg-[#d8f5ef] p-5 flex items-start gap-3">
              <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={22} />
              <div>
                <p className="text-sm font-black text-emerald-900">
                  {priceSek > 0 ? 'Betalning registrerad' : 'Du är med!'}
                </p>
                <p className="text-xs text-[#0f766e] font-medium mt-1">
                  {priceSek > 0
                    ? 'Intäkten bokförs på community-ägarens admin-konto. Öppna communityt för att fortsätta.'
                    : 'Välkommen in — öppna communityt för att fortsätta.'}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-2xl bg-zinc-50 border border-zinc-100 p-4 flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[var(--nc-coral)] text-white flex items-center justify-center">
                  <Smartphone size={18} />
                </div>
                <div>
                  <p className="text-sm font-black text-zinc-900">
                    {priceSek > 0 ? 'Säker snabbcheckout' : 'Gratis att gå med'}
                  </p>
                  <p className="text-xs text-zinc-500 font-medium">
                    {priceSek > 0
                      ? 'Betalningen går till community-ägarens konto'
                      : 'Ingen betalning krävs'}
                  </p>
                </div>
              </div>
              {priceSek > 0 ? (
                <label className="flex flex-col gap-1.5 text-xs font-black text-zinc-500 uppercase tracking-wider">
                  Mobilnummer
                  <input
                    type="tel"
                    inputMode="tel"
                    placeholder="07X XXX XX XX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="min-h-12 rounded-xl border border-zinc-200 px-4 text-sm font-medium text-zinc-900 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                  />
                </label>
              ) : null}
            </>
          )}
        </div>

        <DrawerFooter className="px-6 pb-8 gap-2">
          {!done ? (
            <button
              type="button"
              disabled={
                loading || (priceSek > 0 && phone.trim().length < 8)
              }
              onClick={() => {
                void pay();
              }}
              className="min-h-12 rounded-full bg-[var(--nc-coral)] text-white text-sm font-black hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />{' '}
                  {priceSek > 0 ? 'Bearbetar…' : 'Går med…'}
                </>
              ) : priceSek > 0 ? (
                `Betala ${priceSek.toLocaleString('sv-SE')} kr direkt`
              ) : (
                'Gå med gratis'
              )}
            </button>
          ) : null}
          <DrawerClose asChild>
            <button
              type="button"
              className="min-h-11 rounded-2xl border border-zinc-200 text-sm font-bold text-zinc-600 hover:bg-zinc-50"
            >
              {done ? t('common.close') : t('common.cancel')}
            </button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

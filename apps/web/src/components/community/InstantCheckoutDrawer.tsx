'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, Smartphone } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
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
  priceSek: number;
  onSuccess?: () => void;
};

/** Demo 1-tap mobile checkout drawer for community join. */
export function InstantCheckoutDrawer({
  open,
  onOpenChange,
  communityName,
  priceSek,
  onSuccess,
}: InstantCheckoutDrawerProps) {
  const { t } = useLanguage();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const reset = () => {
    setLoading(false);
    setDone(false);
    setPhone('');
  };

  const pay = async () => {
    setLoading(true);
    // Demo checkout flow — replace with real payment provider later.
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setDone(true);
    onSuccess?.();
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
            Betala direkt
          </DrawerTitle>
          <DrawerDescription className="text-sm text-zinc-500 font-medium">
            {communityName} · {priceSek.toLocaleString('sv-SE')} kr/mån
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-6 pb-2 space-y-4">
          {done ? (
            <div className="rounded-2xl border border-[#b6e9df] bg-[#d8f5ef] p-5 flex items-start gap-3">
              <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={22} />
              <div>
                <p className="text-sm font-black text-emerald-900">Betalning skickad</p>
                <p className="text-xs text-[#0f766e] font-medium mt-1">
                  Godkänn begäran på din telefon. Du får tillgång så fort betalningen är klar.
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
                  <p className="text-sm font-black text-zinc-900">Säker snabbcheckout</p>
                  <p className="text-xs text-zinc-500 font-medium">
                    Vanligtvis klar på under 10 sekunder
                  </p>
                </div>
              </div>
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
            </>
          )}
        </div>

        <DrawerFooter className="px-6 pb-8 gap-2">
          {!done ? (
            <button
              type="button"
              disabled={loading || phone.trim().length < 8}
              onClick={() => {
                void pay();
              }}
              className="min-h-12 rounded-full bg-[var(--nc-coral)] text-white text-sm font-black hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Skickar betalningsbegäran…
                </>
              ) : (
                `Betala ${priceSek.toLocaleString('sv-SE')} kr direkt`
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

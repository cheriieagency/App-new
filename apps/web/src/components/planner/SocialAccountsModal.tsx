'use client';

import { Settings2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import SocialAccountsPanel from '@/components/planner/SocialAccountsPanel';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';

export default function SocialAccountsModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { locale } = useLocale();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(560px,94vw)] max-h-[min(860px,90vh)] overflow-y-auto rounded-3xl border-slate-200/80 bg-[#FAFAFA] p-0 gap-0 shadow-xl">
        <DialogHeader className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-200/80 bg-white text-left rounded-t-3xl">
          <DialogTitle className="flex items-center gap-2.5 font-clikd-wordmark font-extrabold text-lg text-slate-900 tracking-tight">
            <span className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-600">
              <Settings2 size={15} strokeWidth={1.75} />
            </span>
            {t('accounts', locale)}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 font-medium mt-1">
            {t('socialAccountsHint', locale)}
          </DialogDescription>
        </DialogHeader>
        <div className="px-4 sm:px-5 py-5">
          <SocialAccountsPanel compact />
        </div>
      </DialogContent>
    </Dialog>
  );
}

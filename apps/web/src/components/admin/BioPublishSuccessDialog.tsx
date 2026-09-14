'use client';

import { useState } from 'react';
import { Check, Copy, ExternalLink, PartyPopper } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ClikdMark } from '@/components/brand/ClikdLogo';
import { useLanguage } from '@/lib/i18n';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** First-time publish vs subsequent save */
  firstPublish: boolean;
  /** Display host path e.g. clikd.app/@ebbabrobeck */
  publicDisplay: string;
  /** Absolute URL for open / copy */
  publicUrl: string;
};

/** Success modal after Publish Changes — shows unique link-in-bio address. */
export default function BioPublishSuccessDialog({
  open,
  onOpenChange,
  firstPublish,
  publicDisplay,
  publicUrl,
}: Props) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(440px,94vw)] rounded-xl border border-[#E6E3DB] bg-[#FFFFFF] p-0 gap-0 overflow-hidden shadow-none">
        <div className="bg-[#F0EFEA] px-6 pt-6 pb-5 border-b border-[#E6E3DB]">
          <div className="flex items-center gap-3 mb-4">
            <ClikdMark size={36} className="rounded-[11px] shadow-sm" />
            <p className="font-playfair font-medium text-lg text-[#2C2621] leading-none">
              Clikd<span className="text-[#B85C38]">.</span>
            </p>
          </div>
          <DialogHeader className="text-left space-y-2">
            <DialogTitle className="font-playfair font-medium text-2xl text-[#2C2621] tracking-tight flex items-center gap-2">
              {firstPublish ? (
                <>
                  <PartyPopper size={22} className="text-[#B85C38]" />
                  {t('bio.yourLinkLive')}
                </>
              ) : (
                <>
                  <Check size={22} className="text-[#2C3B2E]" strokeWidth={2.75} />
                  {t('bio.changesPublished')}
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-sm text-[#8A857D] font-medium leading-relaxed">
              {firstPublish ? t('bio.firstPublishBody') : t('bio.updatePublishBody')}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-3">
          <p className="text-[10px] font-inter font-medium uppercase tracking-[0.14em] text-[#8A857D]">
            {t('bio.yourPublicLink')}
          </p>
          <div className="flex items-center gap-2 rounded-xl border border-[#E6E3DB] bg-[#F0EFEA] px-3.5 py-3 min-h-[52px]">
            <p className="flex-1 min-w-0 font-mono text-sm font-medium text-[#2C2621] truncate">
              {publicDisplay}
            </p>
            <button
              type="button"
              onClick={() => void copyLink()}
              className="h-10 min-h-[40px] px-3 rounded-xl bg-white border border-[#E6E3DB] text-xs font-medium text-[#2C2621] inline-flex items-center gap-1.5 hover:bg-[#F0EFEA] flex-shrink-0"
            >
              {copied ? (
                <>
                  <Check size={13} className="text-[#2C3B2E]" /> {t('bio.copied')}
                </>
              ) : (
                <>
                  <Copy size={13} /> {t('bio.copy')}
                </>
              )}
            </button>
          </div>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2C3B2E] hover:text-[#243228] transition-colors min-h-[44px]"
          >
            <ExternalLink size={14} />
            {t('bio.openLivePage')}
          </a>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-[#E6E3DB]">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full min-h-[44px] rounded-xl bg-[#2C3B2E] hover:bg-[#243228] text-[#F9F8F6] text-sm font-medium transition-colors"
          >
            {t('bio.done')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

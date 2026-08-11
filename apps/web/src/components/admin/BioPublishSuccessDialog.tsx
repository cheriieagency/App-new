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
      <DialogContent className="max-w-[min(440px,94vw)] rounded-3xl border-slate-200/80 bg-white p-0 gap-0 overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-br from-[#E9D5FF]/50 via-white to-[#FCE7F3]/40 px-6 pt-6 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <ClikdMark size={36} className="rounded-[11px] shadow-sm" />
            <p className="font-clikd-wordmark font-extrabold text-lg text-slate-900 leading-none">
              clikd<span className="text-[#F472B6]">:</span>
            </p>
          </div>
          <DialogHeader className="text-left space-y-2">
            <DialogTitle className="font-outfit font-extrabold text-2xl text-slate-900 tracking-tight flex items-center gap-2">
              {firstPublish ? (
                <>
                  <PartyPopper size={22} className="text-[#F472B6]" />
                  {t('bio.yourLinkLive')}
                </>
              ) : (
                <>
                  <Check size={22} className="text-[#10B981]" strokeWidth={2.75} />
                  {t('bio.changesPublished')}
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 font-medium leading-relaxed">
              {firstPublish ? t('bio.firstPublishBody') : t('bio.updatePublishBody')}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-3">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400">
            {t('bio.yourPublicLink')}
          </p>
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 min-h-[52px]">
            <p className="flex-1 min-w-0 font-mono text-sm font-bold text-slate-800 truncate">
              {publicDisplay}
            </p>
            <button
              type="button"
              onClick={() => void copyLink()}
              className="h-10 min-h-[40px] px-3 rounded-xl bg-white border border-slate-200 text-xs font-extrabold text-slate-700 inline-flex items-center gap-1.5 hover:bg-slate-50 flex-shrink-0"
            >
              {copied ? (
                <>
                  <Check size={13} className="text-[#10B981]" /> {t('bio.copied')}
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
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#F472B6] hover:text-[#2B2568] transition-colors min-h-[44px]"
          >
            <ExternalLink size={14} />
            {t('bio.openLivePage')}
          </a>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full min-h-[44px] rounded-2xl bg-[#2B2568] hover:bg-[#1a1848] text-white text-sm font-extrabold transition-colors"
          >
            {t('bio.done')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useState } from 'react';
import { ChevronDown, Lightbulb } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

/**
 * Guidance for binding different social accounts to different Team Workspaces.
 * Shown above the Meta / YouTube connect strips on Social Settings.
 */
export default function WorkspaceOAuthGuideBanner() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-xl border border-[#E6E3DB] bg-[#FFFFFF] backdrop-blur-sm p-4 sm:p-5 text-[#2C2621] ">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-3 text-left min-h-[44px]"
        aria-expanded={open}
      >
        <span className="mt-0.5 w-9 h-9 rounded-xl bg-[#F0EFEA] border border-[#E6E3DB] flex items-center justify-center flex-shrink-0">
          <Lightbulb size={16} className="text-[#2C3B2E]" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[#2C2621] leading-snug">
            {t('socials.workspaceGuideTitle')}
          </p>
          {!open ? (
            <p className="text-xs font-medium text-[#8A857D] mt-1">
              {t('socials.workspaceGuidePerWorkspace')}
            </p>
          ) : null}
        </div>
        <ChevronDown
          size={18}
          className={`mt-2 text-[#8A857D] flex-shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </button>

      {open ? (
        <ol className="mt-3.5 ml-12 space-y-2.5 list-decimal list-outside marker:font-medium marker:text-[#2C3B2E]">
          <li className="text-xs sm:text-[13px] font-medium text-[#8A857D] leading-relaxed pl-1">
            {t('socials.workspaceGuideStep1')}
          </li>
          <li className="text-xs sm:text-[13px] font-medium text-[#8A857D] leading-relaxed pl-1">
            {t('socials.workspaceGuideStep2')}
          </li>
          <li className="text-xs sm:text-[13px] font-medium text-[#8A857D] leading-relaxed pl-1">
            {t('socials.workspaceGuideStep3')}
          </li>
        </ol>
      ) : null}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';

export const IG_BUSINESS_REQUIRED_MESSAGE =
  'Please convert your Instagram account to a Creator/Business account and link it to a Facebook Page to fetch analytics.';

/**
 * Shown when Meta OAuth connected Facebook Pages but no IG Business account
 * was linked — Analytics / Inbox cannot sync until this is fixed in Meta.
 */
export default function IgBusinessRequiredBanner({
  className = '',
  showSettingsLink = false,
}: {
  className?: string;
  showSettingsLink?: boolean;
}) {
  const { locale } = useLocale();
  return (
    <div
      role="status"
      className={`rounded-xl border border-[rgba(184,92,56,0.28)] bg-[rgba(184,92,56,0.08)] px-4 py-4 sm:px-5 flex items-start gap-3 ${className}`}
    >
      <span className="mt-0.5 inline-flex h-9 w-9 min-h-[36px] min-w-[36px] items-center justify-center rounded-xl bg-[#FFFFFF] text-[#B85C38] flex-shrink-0">
        <AlertTriangle size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[#2C2621]">
          {t('igBusinessRequiredTitle', locale)}
        </p>
        <p className="text-xs sm:text-[13px] text-[#8A857D] font-medium mt-1 leading-relaxed">
          {t('igBusinessRequiredBody', locale)}
        </p>
        {showSettingsLink ? (
          <Link
            href="/admin/settings/socials"
            className="inline-flex items-center min-h-[44px] mt-2 text-xs font-medium text-[#2C2621] underline underline-offset-2 hover:text-[#2C3B2E]"
          >
            {t('igBusinessOpenSettings', locale)}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

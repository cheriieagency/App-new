'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

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
  return (
    <div
      role="status"
      className={`rounded-2xl border border-amber-200/90 bg-amber-50/90 px-4 py-4 sm:px-5 flex items-start gap-3 ${className}`}
    >
      <span className="mt-0.5 inline-flex h-9 w-9 min-h-[36px] min-w-[36px] items-center justify-center rounded-xl bg-amber-100 text-amber-700 flex-shrink-0">
        <AlertTriangle size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold text-amber-950">
          Instagram Business account required
        </p>
        <p className="text-xs sm:text-[13px] text-amber-900/90 font-medium mt-1 leading-relaxed">
          {IG_BUSINESS_REQUIRED_MESSAGE}
        </p>
        {showSettingsLink ? (
          <Link
            href="/admin/settings/socials"
            className="inline-flex items-center min-h-[44px] mt-2 text-xs font-bold text-amber-950 underline underline-offset-2 hover:text-amber-800"
          >
            Open connected accounts →
          </Link>
        ) : null}
      </div>
    </div>
  );
}

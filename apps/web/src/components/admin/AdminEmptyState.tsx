'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type AdminEmptyStateProps = {
  icon: LucideIcon;
  headline: string;
  description?: string;
  ctaLabel: string;
  onCta?: () => void;
  href?: string;
  secondary?: ReactNode;
};

/**
 * Shared Clikd empty state for admin tabs with no user-created data.
 */
export default function AdminEmptyState({
  icon: Icon,
  headline,
  description,
  ctaLabel,
  onCta,
  href,
  secondary,
}: AdminEmptyStateProps) {
  const ctaClass =
    'inline-flex items-center justify-center h-11 min-h-[44px] px-5 rounded-xl bg-[#2B2568] text-white text-xs font-extrabold hover:bg-[#1a1848] transition-colors';

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-8 text-center">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-[#E9D5FF]/50 text-[#2B2568] flex items-center justify-center mb-4">
        <Icon size={22} strokeWidth={2.25} />
      </div>
      <h3 className="font-clikd-wordmark font-extrabold text-lg text-slate-900 tracking-tight">
        {headline}
      </h3>
      {description ? (
        <p className="text-sm text-slate-500 font-medium mt-2 max-w-md mx-auto leading-relaxed">
          {description}
        </p>
      ) : null}
      <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-2">
        {href ? (
          <a href={href} className={ctaClass}>
            {ctaLabel}
          </a>
        ) : (
          <button type="button" onClick={onCta} className={ctaClass}>
            {ctaLabel}
          </button>
        )}
        {secondary}
      </div>
    </div>
  );
}

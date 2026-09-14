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
 * Editorial empty state — italic serif headline, calm sand border, forest CTA.
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
    'inline-flex items-center justify-center h-11 min-h-[44px] px-5 rounded-xl bg-[#2C3B2E] text-[#F9F8F6] text-xs font-medium hover:bg-[#243228] transition-colors shadow-none';

  return (
    <div className="bg-[#FFFFFF] rounded-xl border border-[#E6E3DB] shadow-none p-10 sm:p-12 text-center">
      <div className="mx-auto w-12 h-12 rounded-xl border border-[#E6E3DB] text-[#2C3B2E] flex items-center justify-center mb-6">
        <Icon size={20} strokeWidth={1.5} />
      </div>
      <h3 className="font-playfair italic font-normal text-xl text-[#2C2621] tracking-tight">
        {headline}
      </h3>
      {description ? (
        <p className="font-inter text-sm text-[#8A857D] font-normal mt-3 max-w-md mx-auto leading-relaxed">
          {description}
        </p>
      ) : null}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
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

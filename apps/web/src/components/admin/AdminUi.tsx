'use client';

import type { ReactNode } from 'react';

/** Editorial admin surface — paper card, 1px sand border, soft radius. */
export const adminCardClass =
  'bg-[#FFFFFF] border border-[#E6E3DB] rounded-xl shadow-none';

export const adminKpiClass =
  'bg-[#FFFFFF] border border-[#E6E3DB] rounded-xl p-6 sm:p-8 hover:bg-[#F0EFEA]/40 transition-colors';

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-2">
      <div className="min-w-0">
        <p className="font-inter text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A857D]">
          {eyebrow}
        </p>
        <h1 className="font-playfair font-medium text-[28px] sm:text-[34px] leading-tight text-[#2C2621] tracking-[-0.02em] mt-2">
          {title}
        </h1>
        {description ? (
          <p className="font-inter text-sm text-[#8A857D] font-normal mt-2 max-w-xl leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">{actions}</div>
      ) : null}
    </div>
  );
}

'use client';

import type { ReactNode } from 'react';

/** Editorial admin surface — paper card, 1px sand border (matches planner/create-post). */
export const adminCardClass =
  'bg-[#FFFFFF] border border-[#E6E3DB] rounded-sm shadow-none';

export const adminKpiClass =
  'bg-[#FFFFFF] border border-[#E6E3DB] rounded-sm p-6 sm:p-8 hover:bg-[#F0EFEA]/40 transition-colors';

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
  /** Smaller type scale — matches Post Studio / create-post density. */
  compact = false,
}: {
  eyebrow: string;
  title?: ReactNode;
  description?: string;
  actions?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-end sm:justify-between min-w-0 ${
        compact ? 'gap-3 sm:gap-4 mb-1' : 'gap-4 sm:gap-6 mb-2'
      }`}
    >
      <div className="min-w-0 flex-1">
        <p
          className={`font-inter uppercase text-[#8A857D] ${
            compact
              ? 'text-[9px] font-semibold tracking-[0.14em]'
              : 'text-[10px] font-medium tracking-[0.16em]'
          }`}
        >
          {eyebrow}
        </p>
        {title ? (
          <h1
            className={`font-playfair font-medium text-[#2C2621] tracking-[-0.02em] break-words ${
              compact
                ? 'text-[20px] sm:text-[24px] leading-tight mt-1.5'
                : 'text-[28px] sm:text-[34px] leading-tight mt-2'
            }`}
          >
            {title}
          </h1>
        ) : null}
        {description ? (
          <p
            className={`font-inter text-[#8A857D] font-normal max-w-xl leading-relaxed ${
              compact
                ? `text-[11px] ${title ? 'mt-1.5' : 'mt-1'}`
                : 'text-sm mt-2'
            }`}
          >
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:max-w-[50%] sm:justify-end sm:flex-shrink-0 min-w-0">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

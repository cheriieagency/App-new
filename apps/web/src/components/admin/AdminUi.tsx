'use client';

import type { ReactNode } from 'react';

/** Shared Clikd admin surface — white card, hairline border, soft radius. */
export const adminCardClass =
  'bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.03)]';

export const adminKpiClass =
  'bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 hover:border-slate-300/90 transition-colors';

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
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-1">
      <div className="min-w-0">
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-slate-400">
          {eyebrow}
        </p>
        <h1 className="font-clikd-wordmark font-extrabold text-[28px] sm:text-[32px] leading-tight text-slate-900 tracking-tight mt-1">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-slate-500 font-medium mt-1">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">{actions}</div>
      ) : null}
    </div>
  );
}

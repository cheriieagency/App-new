'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Link2 } from 'lucide-react';
import { useConnectedSocials } from '@/hooks/useConnectedSocials';

/** Empty state prompting creators to connect social accounts before data appears. */
export default function ConnectSocialsEmpty({
  title = 'Connect a social account',
  description = 'This section stays empty until you connect Instagram or Facebook. Data fills in automatically after OAuth.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E9D5FF]/60 text-[#2B2568] mb-4">
        <Link2 size={22} />
      </span>
      <h3 className="text-base font-extrabold text-slate-900 tracking-tight">{title}</h3>
      <p className="mt-2 text-sm text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
        {description}
      </p>
      <Link
        href="/admin/settings/socials"
        className="inline-flex items-center justify-center min-h-[44px] mt-6 px-5 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white text-sm font-bold"
      >
        Connect Instagram & Facebook
      </Link>
    </div>
  );
}

/** Gate any admin surface until at least one social account is connected. */
export function RequireConnectedSocials({
  children,
  title,
  description,
}: {
  children: ReactNode;
  title?: string;
  description?: string;
}) {
  const { hasConnectedSocials, isLoading } = useConnectedSocials();

  if (isLoading) {
    return (
      <div className="py-16 text-center text-sm font-semibold text-slate-400">
        Loading…
      </div>
    );
  }

  if (!hasConnectedSocials) {
    return <ConnectSocialsEmpty title={title} description={description} />;
  }

  return <>{children}</>;
}

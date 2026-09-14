'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Link2 } from 'lucide-react';
import { useConnectedSocials } from '@/hooks/useConnectedSocials';

const DEFAULT_TITLE = 'Connect your social media';
const DEFAULT_DESCRIPTION =
  'This section stays empty until you connect a social media account. Analytics, inbox, community, email, bio, and media fill in automatically after OAuth.';

/** Empty state prompting creators to connect social accounts before data appears. */
export default function ConnectSocialsEmpty({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[#E6E3DB] bg-[#FFFFFF] px-6 py-16 text-center ">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#F0EFEA] text-[#2C3B2E] mb-4">
        <Link2 size={22} />
      </span>
      <h3 className="font-playfair text-xl font-medium text-[#2C2621] tracking-tight">{title}</h3>
      <p className="mt-2 text-sm text-[#8A857D] font-medium max-w-md mx-auto leading-relaxed">
        {description}
      </p>
      <Link
        href="/admin/settings/socials"
        className="inline-flex items-center justify-center min-h-[44px] mt-6 px-5 rounded-xl bg-[#2C3B2E] hover:bg-[#243228] text-[#F9F8F6] text-sm font-medium"
      >
        Connect now
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
      <div className="py-16 text-center text-sm font-medium text-[#8A857D]">
        Loading…
      </div>
    );
  }

  if (!hasConnectedSocials) {
    return <ConnectSocialsEmpty title={title} description={description} />;
  }

  return <>{children}</>;
}

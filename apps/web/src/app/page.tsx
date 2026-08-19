import type { Metadata } from 'next';
import { WaitlistPageClient } from '@/components/landing/WaitlistPageClient';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'clikd: VIP Waitlist — Early Access',
  description:
    'Join the VIP waitlist for early access to clikd: your all-in-one studio for social planning, bio storefronts, community, ads and checkout.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    url: SITE_URL,
  },
};

/** Home route — VIP waitlist (Landing replaced, backup preserved). */
export default function PlatformHome() {
  return <WaitlistPageClient />;
}

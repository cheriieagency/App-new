import type { Metadata } from 'next';
import { LandingPageClient } from '@/components/landing/LandingPageClient';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'clikd: — Build, Sell & Scale Community, Bio & Socials',
  description:
    'Nordic all-in-one creator platform for community, bio store, courses, social planner and checkout.',
  alternates: { canonical: '/' },
  openGraph: { url: SITE_URL },
};

/** Public home — full marketing landing (launch). */
export default function PlatformHome() {
  return <LandingPageClient />;
}

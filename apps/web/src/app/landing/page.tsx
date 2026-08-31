import type { Metadata } from 'next';
import { LandingPageClient } from '@/components/landing/LandingPageClient';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'clikd: — Build, Sell & Scale Community, Bio & Socials',
  description:
    'Nordic all-in-one creator platform for community, bio store, courses, social planner and checkout.',
  alternates: {
    canonical: '/landing',
  },
  openGraph: {
    url: `${SITE_URL}/landing`,
  },
  robots: {
    // Preview of the launch landing — keep out of search until `/` goes live.
    index: false,
    follow: false,
  },
};

/**
 * Saved full marketing landing (preview).
 * Public `/` uses the waitlist until NEXT_PUBLIC_SHOW_FULL_LANDING=true.
 */
export default function LandingPreviewPage() {
  return <LandingPageClient />;
}

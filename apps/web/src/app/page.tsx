import type { Metadata } from 'next';
import { WaitlistPageClient } from '@/components/landing/WaitlistPageClient';
import { LandingPageClient } from '@/components/landing/LandingPageClient';
import { SITE_URL } from '@/lib/site';

/** Flip to true when ready to launch the full marketing landing on `/`. */
const SHOW_FULL_LANDING =
  process.env.NEXT_PUBLIC_SHOW_FULL_LANDING === 'true';

export const metadata: Metadata = SHOW_FULL_LANDING
  ? {
      title: 'clikd: — Build, Sell & Scale Community, Bio & Socials',
      description:
        'Nordic all-in-one creator platform for community, bio store, courses, social planner and checkout.',
      alternates: { canonical: '/' },
      openGraph: { url: SITE_URL },
    }
  : {
      title: 'clikd: — Join the VIP waitlist',
      description:
        'Join the VIP waitlist for early access to clikd: — Nordic all-in-one creator platform for community, bio store, courses, social planner and checkout.',
      alternates: { canonical: '/' },
      openGraph: { url: SITE_URL },
    };

/**
 * Public home — waitlist until launch.
 * Full marketing landing is preserved in LandingPageClient and previewable at /landing.
 * Set NEXT_PUBLIC_SHOW_FULL_LANDING=true to put the full landing back on `/`.
 */
export default function PlatformHome() {
  if (SHOW_FULL_LANDING) return <LandingPageClient />;
  return <WaitlistPageClient />;
}

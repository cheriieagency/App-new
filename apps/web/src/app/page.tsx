import type { Metadata } from 'next';
import { LandingPageClient } from '@/components/landing/LandingPageClient';
import { WaitlistPageClient } from '@/components/landing/WaitlistPageClient';
import { SITE_URL } from '@/lib/site';

/**
 * Pre-launch gate.
 * - Default: waitlist on `/` (full LandingPageClient stays in the codebase).
 * - Launch later: set NEXT_PUBLIC_SHOW_FULL_LANDING=true in `.env.local` and restart.
 */
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
        'Join the VIP waitlist for early access to clikd: — Nordic all-in-one creator platform for community, bio, courses and socials.',
      alternates: { canonical: '/' },
      openGraph: { url: SITE_URL },
    };

/** Public home — waitlist until launch flag is enabled. */
export default function PlatformHome() {
  if (SHOW_FULL_LANDING) return <LandingPageClient />;
  return <WaitlistPageClient />;
}

import type { Metadata } from 'next';
import { LandingPageClient } from '@/components/landing/LandingPageClient';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'clikd: — Build, Sell & Scale Community, Bio & Socials',
  description:
    'Nordisk all-in-one creator-plattform. Community, Bio Store, kurser, social planner och snabbcheckout — allt i en app.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    url: SITE_URL,
  },
};

/** Landing page — Clikd. brand system (Syren-Rosa, Midnight Periwinkle, Light Canvas). */
export default function PlatformHome() {
  return <LandingPageClient />;
}

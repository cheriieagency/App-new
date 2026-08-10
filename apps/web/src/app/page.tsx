import type { Metadata } from 'next';
import { LandingPageClient } from '@/components/landing/LandingPageClient';

export const metadata: Metadata = {
  title: 'clikd: — Build, Sell & Scale Community, Bio & Socials',
  description:
    'Nordisk all-in-one creator-plattform. Community, Bio Store, kurser, social planner och Swish — allt i en app.',
};

/** Landing page — Clikd. brand system (Syren-Rosa, Midnight Periwinkle, Light Canvas). */
export default function PlatformHome() {
  return <LandingPageClient />;
}

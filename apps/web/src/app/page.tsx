import type { Metadata } from 'next';
import { LandingPageClient } from '@/components/landing/LandingPageClient';

export const metadata: Metadata = {
  title: 'Nordic Creator — Build, Sell & Scale Community, Bio & Socials',
  description:
    'Stan Store alternative and Skool alternative for Sweden and the Nordics. All-in-one creator platform with community, Swish Link-in-Bio, courses, social planner, and Vipps payments.',
};

export default function PlatformHome() {
  return <LandingPageClient />;
}

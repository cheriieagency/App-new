import type { Metadata } from 'next';
import { PricingPageClient } from '@/components/landing/PricingPageClient';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'clikd: — Pricing',
  description:
    'Simple & transparent pricing for clikd: — social planning, bio storefront, community, courses, and email CRM in one dashboard.',
  alternates: { canonical: '/pricing' },
  openGraph: { url: `${SITE_URL}/pricing` },
};

/** Standalone pricing page — opened from landing nav/footer Pricing. */
export default function PricingPage() {
  return <PricingPageClient />;
}

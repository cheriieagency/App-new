import type { Metadata } from 'next';
import VillkorContent from './content';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Terms of Service for clikd: (clikd.app) — account rules, payments, creator storefronts, API integrations, and liability.',
  alternates: { canonical: '/legal/villkor' },
};

export default function Page() {
  return <VillkorContent />;
}

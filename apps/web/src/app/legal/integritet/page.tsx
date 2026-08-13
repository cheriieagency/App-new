import type { Metadata } from 'next';
import IntegritetContent from './content';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How Cheriie AB / clikd: collects, uses, stores, and protects personal data on clikd.app — GDPR and UK GDPR.',
  alternates: { canonical: '/legal/integritet' },
};

export default function Page() {
  return <IntegritetContent />;
}

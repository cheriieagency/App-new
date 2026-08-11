import type { Metadata } from 'next';
import IntegritetContent from './content';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How clikd: collects, uses, stores, and protects personal data on clikd.app — GDPR, UK GDPR, and CCPA disclosures.',
  alternates: { canonical: '/legal/integritet' },
};

export default function Page() {
  return <IntegritetContent />;
}

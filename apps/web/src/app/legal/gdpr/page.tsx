import type { Metadata } from 'next';
import GdprContent from './content';

export const metadata: Metadata = {
  title: 'GDPR Compliance',
  description:
    'GDPR Compliance Statement & Data Processing Summary for Creators on clikd: — Controller vs Processor roles, DPA, security, and sub-processors.',
  alternates: { canonical: '/legal/gdpr' },
};

export default function Page() {
  return <GdprContent />;
}

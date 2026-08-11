import type { Metadata } from 'next';
import CookiesContent from './content';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description:
    'Cookie Policy for clikd: (clikd.app) — how we use cookies, local storage, analytics, and third-party tracking technologies.',
  alternates: { canonical: '/legal/cookies' },
};

export default function Page() {
  return <CookiesContent />;
}

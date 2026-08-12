import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import './global.css';
import { Providers } from './providers';
import { SITE_URL } from '@/lib/site';

const defaultTitle = 'clikd: — Creator OS';
const defaultDescription =
  'All-in-one creator platform for the Nordics. Community, Link-in-Bio, courses, social planner, and instant payments — where creators and fans click.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: defaultTitle,
    template: '%s · clikd:',
  },
  description: defaultDescription,
  applicationName: 'clikd:',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'clikd:',
    title: defaultTitle,
    description: defaultDescription,
  },
  twitter: {
    card: 'summary_large_image',
    title: defaultTitle,
    description: defaultDescription,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon.png', type: 'image/png', sizes: '1024x1024' },
      { url: '/icon.png', type: 'image/png', sizes: '1024x1024' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: '/favicon.ico',
  },
};

/**
 * Load brand fonts via CSS (not next/font/google) so Turbopack/Vercel builds
 * do not fail when Google Fonts cannot be fetched at compile time.
 */
const GOOGLE_FONTS_HREF =
  'https://fonts.googleapis.com/css2?' +
  [
    'family=Plus+Jakarta+Sans:wght@400;500;600;700;800',
    'family=Space+Grotesk:wght@500;600;700',
    'family=Outfit:wght@500;600;700;800',
    'family=Fira+Code:wght@400;500;600;700',
  ].join('&') +
  '&display=swap';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="stylesheet" href={GOOGLE_FONTS_HREF} />
        <link
          rel="stylesheet"
          href="/fontawesome/releases/v6.3.0/css/pro.min.css?token=2c15cc0cc7"
        />
      </head>
      <body className="font-sans antialiased bg-clikd-light text-slate-900">
        {/* Mobile bottom nav + pb-20 spacer are mounted in Providers for app routes. */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './global.css';
import { Providers } from './providers';
import ConsentAwareAnalytics from '@/components/ConsentAwareAnalytics';
import { isPlatformHost } from '@/lib/domains/host';
import { getCustomDomainFaviconUrl } from '@/lib/domains/persist';
import { SITE_URL } from '@/lib/site';

const defaultTitle = 'clikd: — Creator OS';
const defaultDescription =
  'All-in-one creator platform for the Nordics. Community, Link-in-Bio, courses, social planner, and instant payments — where creators and fans click.';

const DEFAULT_ICONS: Metadata['icons'] = {
  icon: [
    { url: '/favicon.svg', type: 'image/svg+xml' },
    { url: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
    { url: '/favicon.png', type: 'image/png', sizes: '1024x1024' },
  ],
  apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  shortcut: '/favicon.svg',
};

export async function generateMetadata(): Promise<Metadata> {
  const headerStore = await headers();
  const host = headerStore.get('host') || '';

  let icons = DEFAULT_ICONS;
  if (!isPlatformHost(host)) {
    try {
      const faviconUrl = await getCustomDomainFaviconUrl(host);
      if (faviconUrl) {
        icons = {
          icon: [{ url: faviconUrl }],
          shortcut: faviconUrl,
          apple: [{ url: faviconUrl }],
        };
      }
    } catch {
      /* keep platform icons */
    }
  }

  return {
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
    icons,
  };
}

/**
 * Load brand fonts via CSS (not next/font/google) so Turbopack/Vercel builds
 * do not fail when Google Fonts cannot be fetched at compile time.
 */
const GOOGLE_FONTS_HREF =
  'https://fonts.googleapis.com/css2?' +
  [
    'family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600',
    'family=Great+Vibes',
    'family=Inter:wght@400;500;600;700',
    'family=Roboto:wght@400;500;700',
    'family=Plus+Jakarta+Sans:wght@400;500;600;700;800',
    'family=Space+Grotesk:wght@500;600;700',
    'family=Outfit:wght@500;600;700;800',
    'family=Fira+Code:wght@400;500;600;700',
    // Post Studio media editor — IG / TikTok-style overlay fonts
    'family=Courier+Prime:wght@400;700',
    'family=Special+Elite',
    'family=Anton',
    'family=Oswald:wght@500;600;700',
    'family=Caveat:wght@500;600;700',
    'family=Pacifico',
    'family=Comic+Neue:wght@400;700',
    'family=Poppins:wght@400;500;600;700',
    'family=Barlow+Condensed:wght@500;600;700',
    'family=Libre+Baskerville:ital,wght@0,400;0,700;1,400',
    'family=Dancing+Script:wght@500;600;700',
    'family=Fredoka:wght@400;500;600;700',
    'family=Permanent+Marker',
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
      <body className="font-sans antialiased bg-[#F9F8F6] text-[#2C2621]">
        {/* Mobile bottom nav + pb-20 spacer are mounted in Providers for app routes. */}
        <Providers>{children}</Providers>
        <ConsentAwareAnalytics />
      </body>
    </html>
  );
}

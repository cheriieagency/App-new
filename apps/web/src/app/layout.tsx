import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Fira_Code, Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google';
import './global.css';
import { Providers } from './providers';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const firaCode = Fira_Code({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-fira-code',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'clikd: — Build, Sell & Scale Community, Bio & Socials',
  description:
    'All-in-one creator platform for the Nordics. Community, Swish Link-in-Bio, courses, social planner, and Vipps payments — where creators and fans click.',
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${spaceGrotesk.variable} ${firaCode.variable}`}
    >
      <head>
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

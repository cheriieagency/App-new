import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import './global.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Nordic Creator Community',
  description: 'Allt-i-ett plattform för nordiska kreatörer – community, kurser och live events.',
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="sv">
      <head>
        <link
          rel="stylesheet"
          href="/fontawesome/releases/v6.3.0/css/pro.min.css?token=2c15cc0cc7"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@500;600;700;800&family=Outfit:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

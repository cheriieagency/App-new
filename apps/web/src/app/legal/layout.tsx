import type { ReactNode } from 'react';
import Link from 'next/link';
import { ClikdWordmark } from '@/components/brand/ClikdLogo';
import LegalBackLink from '@/components/legal/LegalBackLink';

/** Shared light-canvas shell for legal / policy pages. */
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 font-sans">
      <header className="sticky top-0 z-40 h-16 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <Link href="/" className="min-h-11 inline-flex items-center">
            <ClikdWordmark markSize={28} className="gap-2 min-h-0" />
          </Link>
          <LegalBackLink />
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">{children}</main>
    </div>
  );
}

'use client';

import { usePathname } from 'next/navigation';
import LanguageSwitcher from '@/components/LanguageSwitcher';

/**
 * Shows a persistent language control on routes that do not already embed one
 * in page chrome. Same LocaleProvider — locale changes update the whole app.
 */
export function GlobalLanguageMenu() {
  const pathname = usePathname() || '';
  // Landing, admin, and planner embed LanguageSwitcher in their own chrome.
  const hasEmbeddedSwitcher =
    pathname === '/' ||
    pathname.startsWith('/admin') ||
    pathname.includes('/planner');

  if (hasEmbeddedSwitcher) return null;

  return (
    <div className="fixed z-[100] top-3 right-3 pointer-events-none">
      <div className="pointer-events-auto">
        <LanguageSwitcher className="[&>button]:bg-white/95 [&>button]:backdrop-blur-md [&>button]:border [&>button]:border-zinc-200/80 [&>button]:shadow-md" />
      </div>
    </div>
  );
}

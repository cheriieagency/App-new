'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  CalendarDays,
  GraduationCap,
  MessageSquare,
  ShoppingBag,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

const TABS: {
  href: string;
  match: (path: string, tab: string | null) => boolean;
  label: string;
  icon: LucideIcon;
}[] = [
  {
    href: '/dashboard?tab=store',
    match: (path, tab) => path.startsWith('/dashboard') && tab === 'store',
    label: 'Store',
    icon: ShoppingBag,
  },
  {
    href: '/dashboard?tab=community',
    match: (path, tab) =>
      (path.startsWith('/dashboard') && (tab === 'community' || !tab)) ||
      path.startsWith('/communities'),
    label: 'Feed',
    icon: MessageSquare,
  },
  {
    href: '/dashboard?tab=events',
    match: (path, tab) =>
      (path.startsWith('/dashboard') && tab === 'events') || path.startsWith('/events'),
    label: 'Events',
    icon: CalendarDays,
  },
  {
    href: '/dashboard?tab=classroom',
    match: (path, tab) =>
      (path.startsWith('/dashboard') && tab === 'classroom') || path.startsWith('/classroom'),
    label: 'Class',
    icon: GraduationCap,
  },
  {
    href: '/admin',
    match: (path) => path.startsWith('/admin') || path.startsWith('/planner'),
    label: 'Admin',
    icon: UserRound,
  },
];

/** Routes where the member/creator bottom bar should appear. */
export function shouldShowMobileBottomNav(pathname: string) {
  if (!pathname) return false;
  if (pathname === '/') return false;
  if (pathname.startsWith('/account')) return false;
  if (pathname.startsWith('/seed')) return false;
  return (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/events') ||
    pathname.startsWith('/classroom') ||
    pathname.startsWith('/communities') ||
    pathname.startsWith('/planner') ||
    pathname.startsWith('/live')
  );
}

export function MobileBottomNav() {
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');

  if (!shouldShowMobileBottomNav(pathname)) return null;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 h-16 flex items-center justify-around"
      aria-label="Primary mobile"
    >
      {TABS.map((item) => {
        const active = item.match(pathname, tab);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] min-w-[56px] px-2 transition-colors ${
              active ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={20} strokeWidth={active ? 2.4 : 2} aria-hidden />
            <span className="text-[10px] font-bold">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Adds bottom padding on mobile when the persistent bar is visible. */
export function MobileBottomNavSpacer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const show = shouldShowMobileBottomNav(pathname);
  return <div className={show ? 'pb-20 md:pb-0' : undefined}>{children}</div>;
}

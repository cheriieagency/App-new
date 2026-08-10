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
import { usePlatformRole } from '@/lib/use-platform-role';
import { useLanguage } from '@/lib/locale-context';
import { t, type TranslationKey } from '@/lib/i18n';

const MEMBER_TABS: {
  href: string;
  match: (path: string, tab: string | null) => boolean;
  key: TranslationKey;
  icon: LucideIcon;
}[] = [
  {
    href: '/dashboard?tab=store',
    match: (path, tab) => path.startsWith('/dashboard') && tab === 'store',
    key: 'store',
    icon: ShoppingBag,
  },
  {
    href: '/dashboard?tab=community',
    match: (path, tab) =>
      (path.startsWith('/dashboard') && (tab === 'community' || !tab)) ||
      path.startsWith('/communities'),
    key: 'feed',
    icon: MessageSquare,
  },
  {
    href: '/dashboard?tab=events',
    match: (path, tab) =>
      (path.startsWith('/dashboard') && tab === 'events') || path.startsWith('/events'),
    key: 'events',
    icon: CalendarDays,
  },
  {
    href: '/dashboard?tab=classroom',
    match: (path, tab) =>
      (path.startsWith('/dashboard') && tab === 'classroom') || path.startsWith('/classroom'),
    key: 'classShort',
    icon: GraduationCap,
  },
];

const CREATOR_TABS: {
  href: string;
  match: (path: string, tab: string | null) => boolean;
  key: TranslationKey;
  icon: LucideIcon;
}[] = [
  {
    href: '/admin',
    match: (path) => path.startsWith('/admin') || path.startsWith('/planner'),
    key: 'adminShort',
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
  const { isCreator, loading } = usePlatformRole();
  const { locale } = useLanguage();

  if (!shouldShowMobileBottomNav(pathname)) return null;
  if (loading) return null;

  const tabs = isCreator ? CREATOR_TABS : MEMBER_TABS;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 flex items-center justify-around bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(15,23,42,0.04)]"
      aria-label={t('primaryMobileNav', locale)}
    >
      {tabs.map((item) => {
        const active = item.match(pathname, tab);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] min-w-[56px] px-2 rounded-xl transition-colors ${
              active ? 'text-[#2B2568]' : 'text-slate-400 hover:text-slate-700'
            }`}
            aria-current={active ? 'page' : undefined}
          >
            <Icon
              size={20}
              strokeWidth={active ? 2.4 : 2}
              className={active ? 'text-[#F472B6]' : undefined}
              aria-hidden
            />
            <span className="text-[10px] font-bold tracking-tight">{t(item.key, locale)}</span>
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

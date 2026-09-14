'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  CalendarDays,
  Ellipsis,
  GraduationCap,
  MessageSquare,
  ShoppingBag,
  type LucideIcon,
} from 'lucide-react';
import { usePlatformRole } from '@/lib/use-platform-role';
import { useLanguage as useLocaleLanguage } from '@/lib/locale-context';
import { useLanguage, t, type TranslationKey } from '@/lib/i18n';
import {
  getAdminMobileMoreItems,
  getAdminMobilePrimaryItems,
  isAdminNavItemActive,
} from '@/components/admin/adminNavItems';

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
    pathname.startsWith('/ads') ||
    pathname.startsWith('/live')
  );
}

function CreatorBottomNav({
  pathname,
  tab,
  locale,
}: {
  pathname: string;
  tab: string | null;
  locale: Parameters<typeof t>[1];
}) {
  const { t: tNested } = useLanguage();
  const [moreOpen, setMoreOpen] = useState(false);
  const primaryItems = getAdminMobilePrimaryItems();
  const moreItems = getAdminMobileMoreItems();
  const moreActive = moreItems.some((item) =>
    isAdminNavItemActive(item.key, pathname, tab)
  );

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname, tab]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  const tabClass = (active: boolean) =>
    `flex flex-col items-center justify-center gap-0.5 min-h-[44px] flex-1 px-1 rounded-xl transition-colors ${
      active ? 'text-[#2C3B2E]' : 'text-[#8A857D] hover:text-[#2C2621]'
    }`;

  return (
    <>
      {moreOpen ? (
        <div className="lg:hidden fixed inset-0 z-[60]" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-[#2C2621]/25"
            aria-label="Close"
            onClick={() => setMoreOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('navMore', locale)}
            className="absolute bottom-16 left-0 right-0 mx-2 mb-2 rounded-xl border border-[#E6E3DB] bg-[#FFFFFF] shadow-[0_12px_30px_-12px_rgba(44,38,33,0.08)] overflow-hidden"
          >
            <div className="px-4 pt-4 pb-3 border-b border-[#E6E3DB]">
              <p className="text-[10px] font-inter font-medium uppercase tracking-[0.14em] text-[#8A857D]">
                {t('navMore', locale)}
              </p>
            </div>
            <ul className="py-1.5 max-h-[min(52vh,360px)] overflow-y-auto">
              {moreItems.map((item) => {
                const active = isAdminNavItemActive(item.key, pathname, tab);
                const Icon = item.icon;
                const label = tNested(item.labelKey);
                return (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={`flex items-center gap-3 min-h-[48px] px-4 transition-colors ${
                        active
                          ? 'bg-[#F0EFEA] text-[#2C2621] font-medium'
                          : 'text-[#8A857D] hover:bg-[#F0EFEA]/60 hover:text-[#2C2621] font-normal'
                      }`}
                      aria-current={active ? 'page' : undefined}
                    >
                      <Icon
                        size={18}
                        strokeWidth={1.5}
                        className={active ? 'text-[#2C3B2E]' : 'text-[#8A857D]'}
                        aria-hidden
                      />
                      <span className="text-sm tracking-tight">{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}

      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 h-16 flex items-center justify-around bg-[#F9F8F6]/95 border-t border-[#E6E3DB]"
        aria-label={t('primaryMobileNav', locale)}
      >
        {primaryItems.map((item) => {
          const active = isAdminNavItemActive(item.key, pathname, tab);
          const Icon = item.icon;
          const label = tNested(item.labelKey);
          return (
            <Link
              key={item.key}
              href={item.href}
              className={tabClass(active)}
              aria-current={active ? 'page' : undefined}
              title={label}
            >
              <Icon
                size={20}
                strokeWidth={1.5}
                className={active ? 'text-[#2C3B2E]' : undefined}
                aria-hidden
              />
              <span className="text-[10px] font-medium tracking-tight truncate max-w-full px-0.5">
                {label}
              </span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setMoreOpen((open) => !open)}
          className={tabClass(moreOpen || moreActive)}
          aria-expanded={moreOpen}
          aria-haspopup="dialog"
        >
          <Ellipsis
            size={20}
            strokeWidth={1.5}
            className={moreOpen || moreActive ? 'text-[#2C3B2E]' : undefined}
            aria-hidden
          />
          <span className="text-[10px] font-medium tracking-tight">{t('navMore', locale)}</span>
        </button>
      </nav>
    </>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const { isCreator, dualAccess, loading } = usePlatformRole();
  const { locale } = useLocaleLanguage();

  if (!shouldShowMobileBottomNav(pathname)) return null;
  if (loading) return null;

  // Dual-access accounts: chrome follows the surface you're on.
  const onCreatorSurface =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/planner') ||
    pathname.startsWith('/ads');
  const showCreatorNav = dualAccess ? onCreatorSurface : isCreator;

  if (showCreatorNav) {
    return <CreatorBottomNav pathname={pathname} tab={tab} locale={locale} />;
  }

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 h-16 flex items-center justify-around bg-[#F9F8F6]/95 border-t border-[#E6E3DB]"
      aria-label={t('primaryMobileNav', locale)}
    >
      {MEMBER_TABS.map((item) => {
        const active = item.match(pathname, tab);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] min-w-[56px] px-2 rounded-xl transition-colors ${
              active ? 'text-[#2C3B2E]' : 'text-[#8A857D] hover:text-[#2C2621]'
            }`}
            aria-current={active ? 'page' : undefined}
          >
            <Icon
              size={20}
              strokeWidth={1.5}
              className={active ? 'text-[#2C3B2E]' : undefined}
              aria-hidden
            />
            <span className="text-[10px] font-medium tracking-tight">{t(item.key, locale)}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Adds bottom padding on mobile/tablet when the persistent bar is visible. */
export function MobileBottomNavSpacer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const show = shouldShowMobileBottomNav(pathname);
  return <div className={show ? 'pb-20 lg:pb-0' : undefined}>{children}</div>;
}

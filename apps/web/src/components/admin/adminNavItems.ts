import type { ElementType } from 'react';
import {
  BarChart3,
  CalendarDays,
  FolderKanban,
  Home,
  Image as ImageIcon,
  Inbox,
  Link2,
  Mail,
  Megaphone,
  Settings,
  Users,
} from 'lucide-react';
import type { AdminSection } from '@/components/admin/AdminNavContext';
import type { NestedKey } from '@/lib/i18n';

export type AdminNavItem = {
  key: AdminSection;
  labelKey: NestedKey;
  /** Shorter label for the mobile/tablet bottom row when the full name is long. */
  shortLabelKey?: NestedKey;
  icon: ElementType;
  href: string;
};

/** Canonical admin rail — desktop sidebar + phone/iPad menu row share this list. */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { key: 'home', labelKey: 'admin.home', icon: Home, href: '/admin?tab=home' },
  { key: 'calendar', labelKey: 'admin.planner', icon: CalendarDays, href: '/planner' },
  {
    key: 'media',
    labelKey: 'admin.mediaLibrary',
    shortLabelKey: 'admin.mediaLibrary',
    icon: ImageIcon,
    href: '/admin?tab=media',
  },
  {
    key: 'projects',
    labelKey: 'admin.projects',
    icon: FolderKanban,
    href: '/admin?tab=projects',
  },
  {
    key: 'inbox',
    labelKey: 'admin.socialInbox',
    icon: Inbox,
    href: '/admin?tab=inbox',
  },
  {
    key: 'analytics',
    labelKey: 'admin.analytics',
    icon: BarChart3,
    href: '/admin?tab=analytics',
  },
  { key: 'ads', labelKey: 'admin.ads', icon: Megaphone, href: '/ads' },
  {
    key: 'biobuilder',
    labelKey: 'admin.bioBuilder',
    icon: Link2,
    href: '/admin?tab=biobuilder',
  },
  {
    key: 'community',
    labelKey: 'admin.community',
    icon: Users,
    href: '/admin?tab=community',
  },
  {
    key: 'email',
    labelKey: 'admin.emailCrm',
    icon: Mail,
    href: '/admin?tab=email',
  },
  {
    key: 'settings',
    labelKey: 'admin.settings',
    icon: Settings,
    href: '/admin?tab=settings',
  },
];

/** Phone bottom bar — primary slots (left → right before More). */
export const ADMIN_MOBILE_PRIMARY_KEYS: AdminSection[] = [
  'home',
  'calendar',
  'inbox',
  'analytics',
];

export function getAdminMobilePrimaryItems(): AdminNavItem[] {
  return ADMIN_MOBILE_PRIMARY_KEYS.map(
    (key) => ADMIN_NAV_ITEMS.find((item) => item.key === key)!
  );
}

export function getAdminMobileMoreItems(): AdminNavItem[] {
  const primary = new Set(ADMIN_MOBILE_PRIMARY_KEYS);
  return ADMIN_NAV_ITEMS.filter((item) => !primary.has(item.key));
}

/** Active state for an admin nav item from pathname + ?tab=. */
export function isAdminNavItemActive(
  key: AdminSection,
  pathname: string,
  tab: string | null
): boolean {
  if (key === 'calendar') return pathname.startsWith('/planner');
  if (key === 'ads') return pathname.startsWith('/ads');
  if (!pathname.startsWith('/admin')) return false;

  const normalized = (() => {
    if (!tab) return 'home';
    if (tab === 'bio' || tab === 'biobuilder') return 'biobuilder';
    if (tab === 'content' || tab === 'event' || tab === 'broadcast') return 'community';
    if (tab === 'planner') return 'calendar';
    if (tab === 'dashboard' || tab === 'command') return 'home';
    if (tab === 'meta-ads' || tab === 'metaads') return 'ads';
    return tab;
  })();

  return normalized === key;
}

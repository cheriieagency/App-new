/**
 * Admin Home quick-access shortcut catalog + defaults.
 */

import type { AdminSection } from '@/components/admin/AdminNavContext';
import type { NestedKey } from '@/lib/i18n';

/** Sections eligible for home quick-access (everything except Home itself). */
export const HOME_SHORTCUT_KEYS = [
  'calendar',
  'media',
  'projects',
  'inbox',
  'analytics',
  'ads',
  'biobuilder',
  'community',
  'email',
  'settings',
] as const satisfies readonly AdminSection[];

export type HomeShortcutKey = (typeof HOME_SHORTCUT_KEYS)[number];

export const DEFAULT_HOME_SHORTCUTS: HomeShortcutKey[] = [
  'calendar',
  'analytics',
  'biobuilder',
];

export const MAX_HOME_SHORTCUTS = 3;

export function isHomeShortcutKey(value: string): value is HomeShortcutKey {
  return (HOME_SHORTCUT_KEYS as readonly string[]).includes(value);
}

/** Normalize + dedupe + clamp to max slots. */
export function normalizeHomeShortcuts(
  raw: unknown,
  fallback: HomeShortcutKey[] = DEFAULT_HOME_SHORTCUTS
): HomeShortcutKey[] {
  const list = Array.isArray(raw) ? raw : [];
  const out: HomeShortcutKey[] = [];
  for (const item of list) {
    const key = String(item || '').trim();
    if (!isHomeShortcutKey(key)) continue;
    if (out.includes(key)) continue;
    out.push(key);
    if (out.length >= MAX_HOME_SHORTCUTS) break;
  }
  return out.length > 0 ? out : [...fallback];
}

/** Shared editorial accent — soft forest wash + deep green ink. */
const EDITORIAL_ACCENT = 'bg-[rgba(44,59,46,0.08)] text-[#2C3B2E]';

/** Display + accent metadata for each shortcut option. */
export const HOME_SHORTCUT_META: Record<
  HomeShortcutKey,
  { labelKey: NestedKey; openKey: NestedKey; accent: string }
> = {
  calendar: {
    labelKey: 'admin.shortcutPlanner',
    openKey: 'admin.shortcutPlannerOpen',
    accent: EDITORIAL_ACCENT,
  },
  media: {
    labelKey: 'admin.mediaLibrary',
    openKey: 'admin.shortcutOpen',
    accent: EDITORIAL_ACCENT,
  },
  projects: {
    labelKey: 'admin.projects',
    openKey: 'admin.shortcutOpen',
    accent: EDITORIAL_ACCENT,
  },
  inbox: {
    labelKey: 'admin.socialInbox',
    openKey: 'admin.shortcutOpen',
    accent: EDITORIAL_ACCENT,
  },
  analytics: {
    labelKey: 'admin.shortcutAnalytics',
    openKey: 'admin.shortcutAnalyticsOpen',
    accent: EDITORIAL_ACCENT,
  },
  ads: {
    labelKey: 'admin.ads',
    openKey: 'admin.shortcutOpen',
    accent: EDITORIAL_ACCENT,
  },
  biobuilder: {
    labelKey: 'admin.shortcutBio',
    openKey: 'admin.shortcutBioOpen',
    accent: EDITORIAL_ACCENT,
  },
  community: {
    labelKey: 'admin.community',
    openKey: 'admin.shortcutOpen',
    accent: EDITORIAL_ACCENT,
  },
  email: {
    labelKey: 'admin.emailCrm',
    openKey: 'admin.shortcutOpen',
    accent: EDITORIAL_ACCENT,
  },
  settings: {
    labelKey: 'admin.settings',
    openKey: 'admin.shortcutOpen',
    accent: EDITORIAL_ACCENT,
  },
};

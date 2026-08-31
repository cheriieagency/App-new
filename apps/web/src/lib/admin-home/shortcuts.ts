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

/** Display + accent metadata for each shortcut option. */
export const HOME_SHORTCUT_META: Record<
  HomeShortcutKey,
  { labelKey: NestedKey; openKey: NestedKey; accent: string }
> = {
  calendar: {
    labelKey: 'admin.shortcutPlanner',
    openKey: 'admin.shortcutPlannerOpen',
    accent: 'bg-[#E9D5FF]/70 text-[#2B2568]',
  },
  media: {
    labelKey: 'admin.mediaLibrary',
    openKey: 'admin.shortcutOpen',
    accent: 'bg-sky-50 text-sky-700',
  },
  projects: {
    labelKey: 'admin.projects',
    openKey: 'admin.shortcutOpen',
    accent: 'bg-amber-50 text-amber-700',
  },
  inbox: {
    labelKey: 'admin.socialInbox',
    openKey: 'admin.shortcutOpen',
    accent: 'bg-violet-50 text-violet-700',
  },
  analytics: {
    labelKey: 'admin.shortcutAnalytics',
    openKey: 'admin.shortcutAnalyticsOpen',
    accent: 'bg-emerald-50 text-[#10B981]',
  },
  ads: {
    labelKey: 'admin.ads',
    openKey: 'admin.shortcutOpen',
    accent: 'bg-orange-50 text-orange-700',
  },
  biobuilder: {
    labelKey: 'admin.shortcutBio',
    openKey: 'admin.shortcutBioOpen',
    accent: 'bg-[#FCE7F3] text-[#F472B6]',
  },
  community: {
    labelKey: 'admin.community',
    openKey: 'admin.shortcutOpen',
    accent: 'bg-indigo-50 text-indigo-700',
  },
  email: {
    labelKey: 'admin.emailCrm',
    openKey: 'admin.shortcutOpen',
    accent: 'bg-rose-50 text-rose-700',
  },
  settings: {
    labelKey: 'admin.settings',
    openKey: 'admin.shortcutOpen',
    accent: 'bg-slate-100 text-slate-700',
  },
};

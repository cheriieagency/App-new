'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/** Later-style admin sections driven by the left icon rail. */
export type AdminSection =
  | 'calendar'
  | 'media'
  | 'inbox'
  | 'analytics'
  | 'biobuilder'
  | 'community'
  | 'email'
  | 'settings';

type AdminNavContextValue = {
  section: AdminSection;
  setSection: (s: AdminSection) => void;
};

const AdminNavContext = createContext<AdminNavContextValue | null>(null);

const VALID: AdminSection[] = [
  'calendar',
  'media',
  'inbox',
  'analytics',
  'biobuilder',
  'community',
  'email',
  'settings',
];

function normalizeTabParam(raw: string | null): AdminSection | null {
  if (!raw) return null;
  if (raw === 'bio' || raw === 'biobuilder') return 'biobuilder';
  if (raw === 'content' || raw === 'event' || raw === 'broadcast') return 'community';
  if (raw === 'planner') return 'calendar';
  if (VALID.includes(raw as AdminSection)) return raw as AdminSection;
  return null;
}

export function AdminNavProvider({ children }: { children: ReactNode }) {
  const [section, setSectionState] = useState<AdminSection>('analytics');

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get('tab');
    const next = normalizeTabParam(raw);
    if (next) setSectionState(next);
  }, []);

  const setSection = useCallback((s: AdminSection) => {
    setSectionState(s);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', s);
      window.history.replaceState({}, '', url.toString());
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ section, setSection }), [section, setSection]);

  return <AdminNavContext.Provider value={value}>{children}</AdminNavContext.Provider>;
}

export function useAdminNav() {
  const ctx = useContext(AdminNavContext);
  if (!ctx) {
    throw new Error('useAdminNav must be used within AdminNavProvider');
  }
  return ctx;
}

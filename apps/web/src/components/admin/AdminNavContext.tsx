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
  | 'home'
  | 'calendar'
  | 'media'
  | 'projects'
  | 'inbox'
  | 'analytics'
  | 'ads'
  | 'biobuilder'
  | 'community'
  | 'email'
  | 'settings';

type AdminNavContextValue = {
  section: AdminSection;
  setSection: (s: AdminSection) => void;
  /** Selected campaign / project label under Projects. */
  activeCampaignId: string | null;
  setActiveCampaignId: (id: string | null) => void;
  /** Opens the create-project form in the Projects main panel. */
  createProjectOpen: boolean;
  setCreateProjectOpen: (open: boolean) => void;
  /** Selected media folder under Media Library. */
  activeMediaFolderId: string | null;
  setActiveMediaFolderId: (id: string | null) => void;
  /** Opens the create-folder form in the Media Library panel. */
  createMediaFolderOpen: boolean;
  setCreateMediaFolderOpen: (open: boolean) => void;
};

const AdminNavContext = createContext<AdminNavContextValue | null>(null);

const VALID: AdminSection[] = [
  'home',
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
];

function normalizeTabParam(raw: string | null): AdminSection | null {
  if (!raw) return null;
  if (raw === 'bio' || raw === 'biobuilder') return 'biobuilder';
  if (raw === 'content' || raw === 'event' || raw === 'broadcast') return 'community';
  if (raw === 'planner') return 'calendar';
  if (raw === 'dashboard' || raw === 'command') return 'home';
  if (raw === 'meta-ads' || raw === 'metaads') return 'ads';
  if (VALID.includes(raw as AdminSection)) return raw as AdminSection;
  return null;
}

/** Build an /admin deep-link so Projects state survives /planner ↔ /admin remounts. */
export function adminProjectsHref(opts?: {
  campaignId?: string | null;
  create?: boolean;
}): string {
  const params = new URLSearchParams();
  params.set('tab', 'projects');
  if (opts?.campaignId) params.set('campaign', opts.campaignId);
  if (opts?.create) params.set('create', '1');
  return `/admin?${params.toString()}`;
}

/** Build an /admin deep-link into a Media Library folder. */
export function adminMediaHref(opts?: { folderId?: string | null }): string {
  const params = new URLSearchParams();
  params.set('tab', 'media');
  if (opts?.folderId) params.set('folder', opts.folderId);
  return `/admin?${params.toString()}`;
}

function writeUrl(
  tab: AdminSection,
  opts: {
    campaignId?: string | null;
    folderId?: string | null;
    create?: boolean;
  }
) {
  try {
    // Only rewrite query when already on /admin — never pollute /planner or /ads URLs.
    if (!window.location.pathname.startsWith('/admin')) return;
    // Dedicated routes — never leave the user on /admin?tab=ads|calendar (empty shell).
    if (tab === 'ads') {
      queueMicrotask(() => window.location.assign('/ads'));
      return;
    }
    if (tab === 'calendar') {
      queueMicrotask(() => window.location.assign('/planner'));
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    if (tab === 'projects' && opts.campaignId) {
      url.searchParams.set('campaign', opts.campaignId);
    } else {
      url.searchParams.delete('campaign');
    }
    if (tab === 'projects' && opts.create) {
      url.searchParams.set('create', '1');
    } else {
      url.searchParams.delete('create');
    }
    if (tab === 'media' && opts.folderId) {
      url.searchParams.set('folder', opts.folderId);
    } else {
      url.searchParams.delete('folder');
    }
    const href = url.toString();
    if (href === window.location.href) return;
    // replaceState during React render updates Next.js Router — always defer.
    queueMicrotask(() => {
      window.history.replaceState({}, '', href);
    });
  } catch {
    /* ignore */
  }
}

export function AdminNavProvider({ children }: { children: ReactNode }) {
  const [section, setSectionState] = useState<AdminSection>('home');
  const [activeCampaignId, setActiveCampaignIdState] = useState<string | null>(null);
  const [createProjectOpen, setCreateProjectOpenState] = useState(false);
  const [activeMediaFolderId, setActiveMediaFolderIdState] = useState<string | null>(
    null
  );
  const [createMediaFolderOpen, setCreateMediaFolderOpenState] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname;
    // Dedicated studio routes set the active rail item without ?tab=.
    if (path.startsWith('/ads')) {
      setSectionState('ads');
      return;
    }
    if (path.startsWith('/planner')) {
      setSectionState('calendar');
      return;
    }
    const next = normalizeTabParam(params.get('tab'));
    if (next) setSectionState(next);
    const campaign = params.get('campaign');
    if (campaign) setActiveCampaignIdState(campaign);
    const folder = params.get('folder');
    if (folder) setActiveMediaFolderIdState(folder);
    // Deep-link create form (e.g. from /planner sidebar → /admin?tab=projects&create=1)
    if (params.get('create') === '1' && (next === 'projects' || !next)) {
      setSectionState('projects');
      setCreateProjectOpenState(true);
    }
  }, []);

  const setSection = useCallback((s: AdminSection) => {
    setSectionState(s);
    // Keep campaign only on Projects. Media folder selection is preserved while the
    // Media Library panel stays mounted (keep-alive) so leaving Media does not
    // null the folder and get yanked back by MediaLibraryPanel's auto-select effect.
    setActiveCampaignIdState((prev) => (s === 'projects' ? prev : null));
    if (s !== 'projects') setCreateProjectOpenState(false);
    if (s !== 'media') setCreateMediaFolderOpenState(false);
    queueMicrotask(() => {
      const params = new URLSearchParams(window.location.search);
      writeUrl(s, {
        campaignId: s === 'projects' ? params.get('campaign') : null,
        folderId: s === 'media' ? params.get('folder') : null,
      });
    });
  }, []);

  const setActiveCampaignId = useCallback((id: string | null) => {
    setActiveCampaignIdState(id);
    setSectionState('projects');
    setCreateProjectOpenState(false);
    setActiveMediaFolderIdState(null);
    setCreateMediaFolderOpenState(false);
    writeUrl('projects', { campaignId: id, folderId: null, create: false });
  }, []);

  const setCreateProjectOpen = useCallback((open: boolean) => {
    setCreateProjectOpenState(open);
    if (open) {
      setSectionState('projects');
      queueMicrotask(() => {
        const campaign = new URLSearchParams(window.location.search).get('campaign');
        writeUrl('projects', { campaignId: campaign, folderId: null, create: true });
      });
    } else {
      writeUrl('projects', {
        campaignId: activeCampaignId,
        folderId: null,
        create: false,
      });
    }
  }, [activeCampaignId]);

  const setActiveMediaFolderId = useCallback((id: string | null) => {
    setActiveMediaFolderIdState(id);
    setSectionState('media');
    setCreateMediaFolderOpenState(false);
    setActiveCampaignIdState(null);
    setCreateProjectOpenState(false);
    writeUrl('media', { campaignId: null, folderId: id });
  }, []);

  const setCreateMediaFolderOpen = useCallback((open: boolean) => {
    setCreateMediaFolderOpenState(open);
    if (open) {
      setSectionState('media');
      queueMicrotask(() => {
        const folder = new URLSearchParams(window.location.search).get('folder');
        writeUrl('media', { campaignId: null, folderId: folder });
      });
    }
  }, []);

  const value = useMemo(
    () => ({
      section,
      setSection,
      activeCampaignId,
      setActiveCampaignId,
      createProjectOpen,
      setCreateProjectOpen,
      activeMediaFolderId,
      setActiveMediaFolderId,
      createMediaFolderOpen,
      setCreateMediaFolderOpen,
    }),
    [
      section,
      setSection,
      activeCampaignId,
      setActiveCampaignId,
      createProjectOpen,
      setCreateProjectOpen,
      activeMediaFolderId,
      setActiveMediaFolderId,
      createMediaFolderOpen,
      setCreateMediaFolderOpen,
    ]
  );

  return <AdminNavContext.Provider value={value}>{children}</AdminNavContext.Provider>;
}

export function useAdminNav() {
  const ctx = useContext(AdminNavContext);
  if (!ctx) {
    throw new Error('useAdminNav must be used within AdminNavProvider');
  }
  return ctx;
}

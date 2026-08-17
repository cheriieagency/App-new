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
  | 'projects'
  | 'inbox'
  | 'analytics'
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
  'calendar',
  'media',
  'projects',
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
    // Only rewrite query when already on /admin — never pollute /planner URLs.
    if (!window.location.pathname.startsWith('/admin')) return;

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
    window.history.replaceState({}, '', url.toString());
  } catch {
    /* ignore */
  }
}

export function AdminNavProvider({ children }: { children: ReactNode }) {
  const [section, setSectionState] = useState<AdminSection>('analytics');
  const [activeCampaignId, setActiveCampaignIdState] = useState<string | null>(null);
  const [createProjectOpen, setCreateProjectOpenState] = useState(false);
  const [activeMediaFolderId, setActiveMediaFolderIdState] = useState<string | null>(
    null
  );
  const [createMediaFolderOpen, setCreateMediaFolderOpenState] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
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
    setActiveCampaignIdState((prevCampaign) => {
      const nextCampaign = s === 'projects' ? prevCampaign : null;
      setActiveMediaFolderIdState((prevFolder) => {
        const nextFolder = s === 'media' ? prevFolder : null;
        writeUrl(s, { campaignId: nextCampaign, folderId: nextFolder });
        return nextFolder;
      });
      return nextCampaign;
    });
    if (s !== 'projects') setCreateProjectOpenState(false);
    if (s !== 'media') setCreateMediaFolderOpenState(false);
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
      setActiveCampaignIdState((prev) => {
        writeUrl('projects', { campaignId: prev, folderId: null, create: true });
        return prev;
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
      setActiveMediaFolderIdState((prev) => {
        writeUrl('media', { campaignId: null, folderId: prev });
        return prev;
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

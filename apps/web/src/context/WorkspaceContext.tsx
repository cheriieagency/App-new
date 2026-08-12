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
import type { BrandWorkspace, SocialPlatform } from '@/lib/mock-content-planner';
import {
  blankWorkspaceProfile,
  createWorkspaceProfile,
  listWorkspaceProfiles,
  NC_WORKSPACE_STORAGE_KEY,
  profileAsBrandWorkspace,
  updateWorkspaceBio,
  type WorkspaceBioData,
  type WorkspaceProfile,
} from '@/lib/mock-workspace-profiles';

type WorkspaceContextValue = {
  workspaces: WorkspaceProfile[];
  brandWorkspaces: BrandWorkspace[];
  activeWorkspaceId: string;
  activeWorkspace: WorkspaceProfile;
  setActiveWorkspaceId: (id: string) => void;
  updateActiveBio: (patch: Partial<WorkspaceBioData>) => void;
  createWorkspace: (input: {
    name: string;
    handle?: string;
    channels?: SocialPlatform[];
  }) => WorkspaceProfile;
  refreshWorkspaces: () => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function readStoredId(fallback: string) {
  if (typeof window === 'undefined') return fallback;
  return localStorage.getItem(NC_WORKSPACE_STORAGE_KEY) || fallback;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<WorkspaceProfile[]>(() =>
    listWorkspaceProfiles()
  );
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState('');

  // Hydrate active id from localStorage after mount (SSR-safe).
  useEffect(() => {
    const stored = readStoredId(workspaces[0]?.id ?? '');
    if (stored && workspaces.some((w) => w.id === stored)) {
      setActiveWorkspaceIdState(stored);
      try {
        document.cookie = `nc_active_workspace_id=${encodeURIComponent(stored)}; path=/; max-age=31536000; samesite=lax`;
      } catch {
        /* ignore */
      }
    } else if (workspaces[0]) {
      setActiveWorkspaceIdState(workspaces[0].id);
      try {
        document.cookie = `nc_active_workspace_id=${encodeURIComponent(workspaces[0].id)}; path=/; max-age=31536000; samesite=lax`;
      } catch {
        /* ignore */
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setActiveWorkspaceId = useCallback(
    (id: string) => {
      setActiveWorkspaceIdState(id);
      try {
        localStorage.setItem(NC_WORKSPACE_STORAGE_KEY, id);
        // Mirror into a cookie so OAuth callbacks / API routes can bind workspace_id.
        document.cookie = `nc_active_workspace_id=${encodeURIComponent(id)}; path=/; max-age=31536000; samesite=lax`;
        const ws = workspaces.find((w) => w.id === id);
        if (ws) {
          localStorage.setItem('nc_active_workspace_name', ws.name);
          localStorage.setItem('nc_active_workspace_handle', ws.handle);
        }
      } catch {
        /* ignore quota */
      }
    },
    [workspaces]
  );

  const activeWorkspace = useMemo(() => {
    return (
      workspaces.find((w) => w.id === activeWorkspaceId) ||
      workspaces[0] ||
      blankWorkspaceProfile()
    );
  }, [workspaces, activeWorkspaceId]);

  const brandWorkspaces = useMemo(
    () => workspaces.map(profileAsBrandWorkspace),
    [workspaces]
  );

  const refreshWorkspaces = useCallback(() => {
    setWorkspaces(listWorkspaceProfiles());
  }, []);

  const updateActiveBio = useCallback(
    (patch: Partial<WorkspaceBioData>) => {
      if (!activeWorkspaceId) return;
      const updated = updateWorkspaceBio(activeWorkspaceId, patch);
      if (!updated) return;
      setWorkspaces(listWorkspaceProfiles());
    },
    [activeWorkspaceId]
  );

  const createWorkspace = useCallback(
    (input: { name: string; handle?: string; channels?: SocialPlatform[] }) => {
      const created = createWorkspaceProfile(input);
      setWorkspaces(listWorkspaceProfiles());
      setActiveWorkspaceId(created.id);
      return created;
    },
    [setActiveWorkspaceId]
  );

  const value = useMemo(
    () => ({
      workspaces,
      brandWorkspaces,
      activeWorkspaceId,
      activeWorkspace,
      setActiveWorkspaceId,
      updateActiveBio,
      createWorkspace,
      refreshWorkspaces,
    }),
    [
      workspaces,
      brandWorkspaces,
      activeWorkspaceId,
      activeWorkspace,
      setActiveWorkspaceId,
      updateActiveBio,
      createWorkspace,
      refreshWorkspaces,
    ]
  );

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return ctx;
}

/** Optional hook for surfaces that may render outside the provider. */
export function useWorkspaceOptional() {
  return useContext(WorkspaceContext);
}

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
import { usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
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
  /** Active subscription plan hydrated from /api/subscription on /admin/* */
  plan: string;
  subscriptionStatus: string;
  refreshPlan: () => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function readStoredId(fallback: string) {
  if (typeof window === 'undefined') return fallback;
  return localStorage.getItem(NC_WORKSPACE_STORAGE_KEY) || fallback;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [workspaces, setWorkspaces] = useState<WorkspaceProfile[]>(() =>
    listWorkspaceProfiles()
  );
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState('');
  const [plan, setPlan] = useState('starter');
  const [subscriptionStatus, setSubscriptionStatus] = useState('inactive');

  const refreshPlan = useCallback(() => {
    void (async () => {
      try {
        const r = await fetch('/api/subscription', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!r.ok) return;
        const json = (await r.json()) as {
          plan?: string;
          subscription_status?: string;
          pro_unlocked?: boolean;
        };
        setPlan(json.plan || 'starter');
        setSubscriptionStatus(
          json.subscription_status ||
            (json.pro_unlocked || json.plan === 'pro' ? 'active' : 'inactive')
        );
        void queryClient.invalidateQueries({ queryKey: ['admin-workspace-plan'] });
      } catch {
        /* ignore */
      }
    })();
  }, [queryClient]);

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

  // Refresh plan/status whenever the admin shell mounts or the route changes.
  useEffect(() => {
    if (!pathname?.startsWith('/admin')) return;
    refreshPlan();
  }, [pathname, refreshPlan]);

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
      plan,
      subscriptionStatus,
      refreshPlan,
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
      plan,
      subscriptionStatus,
      refreshPlan,
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

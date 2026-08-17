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
import { toast } from 'sonner';
import { useLanguage } from '@/lib/i18n';
import type { BrandWorkspace, SocialPlatform } from '@/lib/mock-content-planner';
import {
  blankWorkspaceProfile,
  createWorkspaceProfile,
  deleteWorkspaceProfile,
  ensureDefaultWorkspace,
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
  deleteWorkspace: (id: string) => void;
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

function mirrorActiveCookies(id: string, ws?: WorkspaceProfile | null) {
  try {
    localStorage.setItem(NC_WORKSPACE_STORAGE_KEY, id);
    document.cookie = `nc_active_workspace_id=${encodeURIComponent(id)}; path=/; max-age=31536000; samesite=lax`;
    document.cookie = `active_workspace_id=${encodeURIComponent(id)}; path=/; max-age=31536000; samesite=lax`;
    if (ws) {
      localStorage.setItem('nc_active_workspace_name', ws.name);
      localStorage.setItem('nc_active_workspace_handle', ws.handle);
    }
  } catch {
    /* ignore */
  }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
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

  const refreshWorkspaces = useCallback(() => {
    void (async () => {
      try {
        const r = await fetch('/api/admin/workspaces', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!r.ok) {
          setWorkspaces(listWorkspaceProfiles());
          return;
        }
        const json = (await r.json()) as {
          profiles?: WorkspaceProfile[];
          demo?: boolean;
        };
        if (Array.isArray(json.profiles) && json.profiles.length > 0) {
          // Dedupe by id (defensive) — server also consolidates stubs.
          const seen = new Set<string>();
          const unique = json.profiles.filter((p) => {
            if (!p?.id || seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
          });
          setWorkspaces(unique);
          try {
            localStorage.setItem(
              'nc_workspace_profiles_v2',
              JSON.stringify(unique)
            );
          } catch {
            /* ignore */
          }
          return;
        }
        // Empty DB list — clear stale local duplicates.
        if (Array.isArray(json.profiles) && json.profiles.length === 0 && json.demo === false) {
          setWorkspaces([]);
          try {
            localStorage.setItem('nc_workspace_profiles_v2', '[]');
          } catch {
            /* ignore */
          }
          return;
        }
      } catch {
        /* fall through */
      }
      setWorkspaces(listWorkspaceProfiles());
    })();
  }, []);

  // Hydrate from DB (or local demo) on first visit.
  useEffect(() => {
    const seeded = ensureDefaultWorkspace();
    const list = listWorkspaceProfiles();
    setWorkspaces(list);

    const stored = readStoredId(seeded.id);
    const activeId =
      stored && list.some((w) => w.id === stored)
        ? stored
        : list[0]?.id || seeded.id;

    setActiveWorkspaceIdState(activeId);
    mirrorActiveCookies(
      activeId,
      list.find((w) => w.id === activeId) || seeded
    );

    refreshWorkspaces();
  }, [refreshWorkspaces]);

  // When remote list arrives, keep active id valid.
  useEffect(() => {
    if (!workspaces.length || !activeWorkspaceId) return;
    if (workspaces.some((w) => w.id === activeWorkspaceId)) return;
    const next = workspaces[0].id;
    setActiveWorkspaceIdState(next);
    mirrorActiveCookies(next, workspaces[0]);
  }, [workspaces, activeWorkspaceId]);

  // Refresh plan/status whenever the admin shell mounts or the route changes.
  useEffect(() => {
    if (!pathname?.startsWith('/admin')) return;
    refreshPlan();
  }, [pathname, refreshPlan]);

  const setActiveWorkspaceId = useCallback(
    (id: string) => {
      setActiveWorkspaceIdState(id);
      mirrorActiveCookies(
        id,
        workspaces.find((w) => w.id === id)
      );
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

  const updateActiveBio = useCallback(
    (patch: Partial<WorkspaceBioData>) => {
      if (!activeWorkspaceId) return;
      const updated = updateWorkspaceBio(activeWorkspaceId, patch);
      if (!updated) return;
      setWorkspaces(listWorkspaceProfiles());
      void fetch('/api/admin/workspaces', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: activeWorkspaceId, bio: patch }),
      }).then(async (r) => {
        if (!r.ok) toast.error(t('toastBioSaveFailed'));
        else refreshWorkspaces();
      });
    },
    [activeWorkspaceId, refreshWorkspaces, t]
  );

  const createWorkspace = useCallback(
    (input: { name: string; handle?: string; channels?: SocialPlatform[] }) => {
      const created = createWorkspaceProfile(input);
      setWorkspaces(listWorkspaceProfiles());
      setActiveWorkspaceId(created.id);

      void fetch('/api/admin/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: input.name,
          handle: input.handle,
          channels: input.channels,
          clientWorkspaceId: created.id,
          existingCount: listWorkspaceProfiles().length,
        }),
      }).then(async (r) => {
        if (!r.ok) {
          toast.error(t('toastWorkspaceSaveFailed'));
          return;
        }
        refreshWorkspaces();
      });

      return created;
    },
    [setActiveWorkspaceId, refreshWorkspaces, t]
  );

  const deleteWorkspace = useCallback(
    (id: string) => {
      const { remaining } = deleteWorkspaceProfile(id);
      setWorkspaces(remaining);
      const nextId = remaining[0]?.id;
      if (nextId) setActiveWorkspaceId(nextId);

      void fetch(`/api/admin/workspaces?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      }).then(async (r) => {
        if (!r.ok) toast.error(t('toastWorkspaceDeleteFailed'));
        else refreshWorkspaces();
      });
    },
    [setActiveWorkspaceId, refreshWorkspaces, t]
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
      deleteWorkspace,
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
      deleteWorkspace,
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

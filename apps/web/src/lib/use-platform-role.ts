'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  homeForRole,
  isCreatorRole,
  normalizePlatformRole,
  type PlatformRole,
} from '@/lib/platform-role';

type PlatformRoleState = {
  role: PlatformRole | null;
  loading: boolean;
  isCreator: boolean;
  isMember: boolean;
  /** True when this account may open both member + creator routes. */
  dualAccess: boolean;
  home: string;
  refresh: () => Promise<void>;
};

/** Client hook — reads `/api/platform-role` for nav + CTA gating. */
export function usePlatformRole(): PlatformRoleState {
  const [role, setRole] = useState<PlatformRole | null>(null);
  const [dualAccess, setDualAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/platform-role', { credentials: 'include' });
      if (!res.ok) {
        setRole(null);
        setDualAccess(false);
        return;
      }
      const data = await res.json();
      setRole(normalizePlatformRole(data.role));
      setDualAccess(Boolean(data.dual_access));
    } catch {
      setRole(null);
      setDualAccess(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const resolved = role ?? 'member';
  const creator = isCreatorRole(resolved);

  return {
    role,
    loading,
    isCreator: creator,
    isMember: !creator,
    dualAccess,
    home: homeForRole(resolved),
    refresh,
  };
}

/** Persist role after a successful sign-in, then return the home path. */
export async function persistPlatformRole(role: PlatformRole): Promise<string> {
  const res = await fetch('/api/platform-role', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) return homeForRole(role);
  const data = await res.json();
  return typeof data.home === 'string' ? data.home : homeForRole(role);
}

/** Clear role cookie (call alongside signOut). */
export async function clearPlatformRole(): Promise<void> {
  try {
    await fetch('/api/platform-role', { method: 'DELETE', credentials: 'include' });
  } catch {
    // ignore
  }
}

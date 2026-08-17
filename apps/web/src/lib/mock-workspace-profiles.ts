/**
 * Per–Team Workspace / Brand Profile datasets for global Admin sync.
 * Each brand owns Bio, Analytics, Community, Email, and Planner slices.
 */

import { applyBioPreset, type BioTheme } from '@/lib/bio-theme';
import type { SocialPlatform } from '@/lib/mock-content-planner';
import type { UtmClickStat } from '@/lib/bio-utm';
import { computeBioAnalyticsSlice } from '@/lib/bio-sales';
import {
  clearPendingWorkspaceName,
  peekPendingWorkspaceName,
  resolveInitialWorkspaceName,
} from '@/lib/workspace-naming';

export const NC_WORKSPACE_STORAGE_KEY = 'nc_active_workspace_id';
/** v2 drops seeded Ebba / demo brand profiles from older local sessions. */
const NC_PROFILES_STORAGE_KEY = 'nc_workspace_profiles_v2';

export type WorkspaceBioBlock = {
  id: string;
  type: string;
  category: 'links' | 'store';
  title: string;
  subtitle: string;
  emoji: string;
  color: string;
  visible: boolean;
  destination_url?: string;
  utm_slug?: string;
  url?: string;
  price?: number | null;
  sale_price?: number | null;
  /** When true, purchase unlocks membership in access_community_id. */
  grants_community_access?: boolean;
  access_community_id?: number | null;
  /** Coaching / 1:1 — create Google Calendar + Meet on purchase. */
  google_calendar_enabled?: boolean;
};

export type WorkspaceBioData = {
  profile_photo: string | null;
  display_name: string;
  handle: string;
  bio_text: string;
  theme: BioTheme;
  theme_label: string;
  blocks: WorkspaceBioBlock[];
};

export type WorkspaceAnalyticsData = {
  revenue_sek: number;
  active_members: number;
  event_rsvps: number;
  products: number;
  revenue_chart: number[];
  utm_links: UtmClickStat[];
  utm_total_clicks: number;
  recent_emails: { name: string; email: string; created_at: string }[];
};

export type WorkspaceCommunityData = {
  community_id: number;
  community_name: string;
  total_members: number;
  posts: number;
  comments: number;
  active_moderators: number;
  recent_members: { id: string; name: string; email: string; role: string }[];
};

export type WorkspaceEmailData = {
  total_subscribers: number;
  average_open_rate: number;
  broadcasts_sent: number;
  subscriber_preview: { name: string; email: string; source_label: string }[];
};

export type WorkspacePlannerData = {
  kanban_count: number;
  calendar_events: number;
  scheduled_posts: number;
  project_name: string;
};

export type WorkspaceProfile = {
  id: string;
  name: string;
  handle: string;
  avatar_url: string | null;
  color: string;
  channels: SocialPlatform[];
  bio: WorkspaceBioData;
  analytics: WorkspaceAnalyticsData;
  community: WorkspaceCommunityData;
  email: WorkspaceEmailData;
  planner: WorkspacePlannerData;
};

function buildProfiles(): WorkspaceProfile[] {
  // Empty until hydrated from localStorage or ensureDefaultWorkspace().
  return [];
}

let profiles: WorkspaceProfile[] = buildProfiles();
let profilesHydrated = false;

const DEFAULT_WORKSPACE_ID = 'default-my-workspace';
const DEFAULT_WORKSPACE_NAME = 'My workspace';

/** In-memory blank profile so admin UI can render before the first social space exists. */
export function blankWorkspaceProfile(): WorkspaceProfile {
  const theme = applyBioPreset('nordic-minimal');
  return {
    id: '',
    name: 'Your brand',
    handle: '@',
    avatar_url: null,
    color: '#2B2568',
    channels: [],
    bio: {
      profile_photo: null,
      display_name: '',
      handle: '',
      bio_text: '',
      theme,
      theme_label: 'Nordic Minimal',
      blocks: [],
    },
    analytics: {
      revenue_sek: 0,
      active_members: 0,
      event_rsvps: 0,
      products: 0,
      revenue_chart: [0, 0, 0, 0, 0, 0, 0],
      utm_links: [],
      utm_total_clicks: 0,
      recent_emails: [],
    },
    community: {
      community_id: 0,
      community_name: '',
      total_members: 0,
      posts: 0,
      comments: 0,
      active_moderators: 0,
      recent_members: [],
    },
    email: {
      total_subscribers: 0,
      average_open_rate: 0,
      broadcasts_sent: 0,
      subscriber_preview: [],
    },
    planner: {
      kanban_count: 0,
      calendar_events: 0,
      scheduled_posts: 0,
      project_name: '',
    },
  };
}

function hydrateProfilesFromStorage() {
  if (profilesHydrated || typeof window === 'undefined') return;
  profilesHydrated = true;
  try {
    const raw = localStorage.getItem(NC_PROFILES_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as WorkspaceProfile[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      profiles = parsed;
    }
  } catch {
    /* ignore corrupt storage */
  }
}

function persistProfiles() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NC_PROFILES_STORAGE_KEY, JSON.stringify(profiles));
  } catch {
    /* ignore quota */
  }
}

export function listWorkspaceProfiles(): WorkspaceProfile[] {
  hydrateProfilesFromStorage();
  return profiles.map(cloneProfile);
}

/**
 * Ensure every account has at least one workspace.
 * Uses the signup-provided name when available (arg / sessionStorage).
 * Called on first admin load / after signup — idempotent.
 */
export function ensureDefaultWorkspace(preferredName?: string): WorkspaceProfile {
  hydrateProfilesFromStorage();
  const pending =
    (preferredName || '').trim() || peekPendingWorkspaceName() || '';
  const resolved = resolveInitialWorkspaceName({ workspaceName: pending });

  if (profiles.length > 0) {
    const current = profiles[0];
    const isGeneric =
      !current.name ||
      current.name === DEFAULT_WORKSPACE_NAME ||
      current.name === 'My Workspace';
    if (pending && isGeneric && current.name !== resolved) {
      profiles[0] = {
        ...current,
        name: resolved,
        bio: {
          ...current.bio,
          display_name: resolved,
        },
      };
      persistProfiles();
      clearPendingWorkspaceName();
      return cloneProfile(profiles[0]);
    }
    if (pending) clearPendingWorkspaceName();
    return cloneProfile(profiles[0]);
  }

  const created = createWorkspaceProfile({
    id: DEFAULT_WORKSPACE_ID,
    name: resolved,
    handle:
      resolved
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')
        .slice(0, 24) || 'myworkspace',
    channels: [],
    color: '#2B2568',
  });
  clearPendingWorkspaceName();
  return created;
}

export function getWorkspaceProfile(id: string): WorkspaceProfile | null {
  hydrateProfilesFromStorage();
  const found = profiles.find((p) => p.id === id);
  return found ? cloneProfile(found) : null;
}

/** Resolve a public bio page by @handle (case-insensitive). */
export function getWorkspaceProfileByHandle(handle: string): WorkspaceProfile | null {
  hydrateProfilesFromStorage();
  const h = handle.replace(/^@/, '').trim().toLowerCase();
  if (!h) return null;
  const found = profiles.find((p) => {
    const bioH = (p.bio.handle || '').replace(/^@/, '').toLowerCase();
    const pubH = (p.handle || '').replace(/^@/, '').toLowerCase();
    return bioH === h || pubH === h;
  });
  return found ? cloneProfile(found) : null;
}

export function cloneProfile(p: WorkspaceProfile): WorkspaceProfile {
  return {
    ...p,
    channels: [...p.channels],
    bio: {
      ...p.bio,
      theme: { ...p.bio.theme },
      blocks: p.bio.blocks.map((b) => ({ ...b })),
    },
    analytics: {
      ...p.analytics,
      revenue_chart: [...(p.analytics.revenue_chart || [0, 0, 0, 0, 0, 0, 0])],
      utm_links: p.analytics.utm_links.map((u) => ({ ...u })),
      recent_emails: p.analytics.recent_emails.map((e) => ({ ...e })),
    },
    community: {
      ...p.community,
      recent_members: p.community.recent_members.map((m) => ({ ...m })),
    },
    email: {
      ...p.email,
      subscriber_preview: p.email.subscriber_preview.map((s) => ({ ...s })),
    },
    planner: { ...p.planner },
  };
}

export function updateWorkspaceBio(
  id: string,
  patch: Partial<WorkspaceBioData>
): WorkspaceProfile | null {
  const idx = profiles.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  const current = profiles[idx];
  profiles[idx] = {
    ...current,
    bio: {
      ...current.bio,
      ...patch,
      theme: patch.theme ? { ...patch.theme } : current.bio.theme,
      blocks: patch.blocks
        ? patch.blocks.map((b) => ({ ...b }))
        : current.bio.blocks,
    },
    // Keep public handle in sync with bio handle.
    handle: patch.handle
      ? patch.handle.startsWith('@')
        ? patch.handle
        : `@${patch.handle}`
      : current.handle,
    name: patch.display_name ?? current.name,
    avatar_url:
      patch.profile_photo !== undefined ? patch.profile_photo : current.avatar_url,
  };
  // Keep Revenue / Link-in-bio analytics aligned with Bio Builder blocks.
  if (patch.blocks) {
    profiles[idx] = syncWorkspaceBioAnalytics(profiles[idx].id) || profiles[idx];
  } else {
    persistProfiles();
  }
  return cloneProfile(profiles[idx]);
}

/** Patch analytics fields for a workspace (Revenue / Link in bio). */
export function updateWorkspaceAnalytics(
  id: string,
  patch: Partial<WorkspaceAnalyticsData>
): WorkspaceProfile | null {
  hydrateProfilesFromStorage();
  const idx = profiles.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  profiles[idx] = {
    ...profiles[idx],
    analytics: {
      ...profiles[idx].analytics,
      ...patch,
      revenue_chart: patch.revenue_chart
        ? [...patch.revenue_chart]
        : [...profiles[idx].analytics.revenue_chart],
      utm_links: patch.utm_links
        ? patch.utm_links.map((u) => ({ ...u }))
        : profiles[idx].analytics.utm_links.map((u) => ({ ...u })),
      recent_emails: patch.recent_emails
        ? patch.recent_emails.map((e) => ({ ...e }))
        : profiles[idx].analytics.recent_emails.map((e) => ({ ...e })),
    },
  };
  persistProfiles();
  return cloneProfile(profiles[idx]);
}

/** Patch community slice for a workspace (Community create / bind). */
export function updateWorkspaceCommunity(
  id: string,
  patch: Partial<WorkspaceCommunityData>
): WorkspaceProfile | null {
  hydrateProfilesFromStorage();
  const idx = profiles.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  profiles[idx] = {
    ...profiles[idx],
    community: {
      ...profiles[idx].community,
      ...patch,
      recent_members: patch.recent_members
        ? patch.recent_members.map((m) => ({ ...m }))
        : profiles[idx].community.recent_members.map((m) => ({ ...m })),
    },
  };
  persistProfiles();
  return cloneProfile(profiles[idx]);
}

/** Recompute Revenue metrics from Bio Builder products + checkout sales. */
export function syncWorkspaceBioAnalytics(
  id: string,
  opts?: { from?: string; to?: string }
): WorkspaceProfile | null {
  hydrateProfilesFromStorage();
  const idx = profiles.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  const slice = computeBioAnalyticsSlice(profiles[idx], opts);
  profiles[idx] = {
    ...profiles[idx],
    analytics: {
      ...profiles[idx].analytics,
      ...slice,
    },
  };
  persistProfiles();
  return cloneProfile(profiles[idx]);
}

export function createWorkspaceProfile(input: {
  name: string;
  handle?: string;
  channels?: SocialPlatform[];
  color?: string;
  id?: string;
}): WorkspaceProfile {
  hydrateProfilesFromStorage();
  const id =
    input.id ??
    `ws_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  if (profiles.some((p) => p.id === id)) {
    return cloneProfile(profiles.find((p) => p.id === id)!);
  }
  let handle =
    (input.handle ?? '').trim() ||
    input.name.replace(/\s+/g, '').toLowerCase();
  handle = handle.replace(/^@/, '');
  const theme = applyBioPreset('nordic-minimal');
  const displayName = input.name.trim() || DEFAULT_WORKSPACE_NAME;
  const profile: WorkspaceProfile = {
    id,
    name: displayName,
    handle: `@${handle}`,
    avatar_url: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(displayName)}`,
    color: input.color || '#E11D48',
    channels: input.channels?.length ? input.channels : [],
    bio: {
      profile_photo: null,
      display_name: displayName,
      handle,
      bio_text: '',
      theme,
      theme_label: 'Nordic Minimal',
      blocks: [],
    },
    analytics: {
      revenue_sek: 0,
      active_members: 0,
      event_rsvps: 0,
      products: 0,
      revenue_chart: [0, 0, 0, 0, 0, 0, 0],
      utm_links: [],
      utm_total_clicks: 0,
      recent_emails: [],
    },
    community: {
      community_id: Number.parseInt(id.replace(/\D/g, '').slice(0, 9), 10) || Date.now(),
      community_name: displayName,
      total_members: 0,
      posts: 0,
      comments: 0,
      active_moderators: 0,
      recent_members: [],
    },
    email: {
      total_subscribers: 0,
      average_open_rate: 0,
      broadcasts_sent: 0,
      subscriber_preview: [],
    },
    planner: {
      kanban_count: 0,
      calendar_events: 0,
      scheduled_posts: 0,
      project_name: displayName,
    },
  };
  profiles = [...profiles, profile];
  persistProfiles();
  return cloneProfile(profile);
}

/** Remove a workspace. Keeps at least one (re-seeds "My workspace" if emptied). */
export function deleteWorkspaceProfile(id: string): {
  deleted: boolean;
  remaining: WorkspaceProfile[];
} {
  hydrateProfilesFromStorage();
  const next = profiles.filter((p) => p.id !== id);
  if (next.length === profiles.length) {
    return { deleted: false, remaining: listWorkspaceProfiles() };
  }
  profiles = next;
  if (profiles.length === 0) {
    persistProfiles();
    ensureDefaultWorkspace();
  } else {
    persistProfiles();
  }
  return { deleted: true, remaining: listWorkspaceProfiles() };
}

export function isDefaultWorkspaceId(id: string): boolean {
  return id === DEFAULT_WORKSPACE_ID;
}

/** Shape used by WorkspaceSelector dropdown. */
export function profileAsBrandWorkspace(p: WorkspaceProfile) {
  return {
    id: p.id,
    name: p.name,
    handle: p.handle,
    avatar_url: p.avatar_url,
    color: p.color,
    channels: [...p.channels],
    created_at: new Date().toISOString(),
  };
}

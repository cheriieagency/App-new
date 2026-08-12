/**
 * Per–Team Workspace / Brand Profile datasets for global Admin sync.
 * Each brand owns Bio, Analytics, Community, Email, and Planner slices.
 */

import { applyBioPreset, type BioTheme } from '@/lib/bio-theme';
import type { SocialPlatform } from '@/lib/mock-content-planner';
import type { UtmClickStat } from '@/lib/bio-utm';
import { buildTrackedShortUrl } from '@/lib/bio-utm';

export const NC_WORKSPACE_STORAGE_KEY = 'nc_active_workspace_id';
const NC_PROFILES_STORAGE_KEY = 'nc_workspace_profiles_v1';

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

function utm(
  slug: string,
  title: string,
  clicks: number,
  unique: number,
  destination: string
): UtmClickStat {
  return {
    slug,
    title,
    clicks,
    unique,
    destination_url: destination,
    tracked_url: buildTrackedShortUrl(slug),
  };
}

const creatorLabBlocks: WorkspaceBioBlock[] = [
  {
    id: '101-1',
    type: 'lead_magnet',
    category: 'links',
    title: 'Gratis E-bok',
    subtitle: 'Ladda ned gratis PDF-guide • 312 nedladdningar',
    emoji: '📘',
    color: '#3B82F6',
    visible: true,
    price: 0,
  },
  {
    id: '101-2',
    type: 'course',
    category: 'links',
    title: 'Kurs: Clikd Studio',
    subtitle: 'Onlinekurs · 12 lektioner • Masterclass',
    emoji: '🎓',
    color: '#9b8afb',
    visible: true,
    price: 1499,
  },
  {
    id: '101-3',
    type: 'coaching',
    category: 'links',
    title: '1:1 Coaching',
    subtitle: 'Boka ett samtal • 45 min Zoom',
    emoji: '🤝',
    color: '#10B981',
    visible: true,
    price: 599,
  },
  {
    id: '101-s1',
    type: 'store',
    category: 'store',
    title: 'Creator Starter Pack',
    subtitle: 'Extern butik',
    emoji: '🛒',
    color: '#9b8afb',
    visible: true,
    destination_url: 'https://example.com/starter-pack',
    utm_slug: 'starter-pack-lab',
    price: 1499,
  },
];

const liveStudioBlocks: WorkspaceBioBlock[] = [
  {
    id: '102-1',
    type: 'lead_magnet',
    category: 'links',
    title: 'Live Hook Checklist',
    subtitle: 'Ladda ned gratis PDF-guide • 142 nedladdningar',
    emoji: '📋',
    color: '#0369a1',
    visible: true,
    price: 0,
  },
  {
    id: '102-2',
    type: 'community',
    category: 'links',
    title: 'Live Studio Community',
    subtitle: 'Webbinarier & RSVP • Free & open',
    emoji: '📡',
    color: '#0f766e',
    visible: true,
    price: 0,
    grants_community_access: true,
    access_community_id: 102,
  },
  {
    id: '102-3',
    type: 'coaching',
    category: 'links',
    title: 'Live Coaching Slot',
    subtitle: '45 min · Zoom',
    emoji: '🎥',
    color: '#E11D48',
    visible: true,
    price: 599,
    grants_community_access: true,
    access_community_id: 102,
  },
  {
    id: '102-s1',
    type: 'store',
    category: 'store',
    title: 'Live Studio Hook Pack',
    subtitle: 'Digital produkt',
    emoji: '📦',
    color: '#0f766e',
    visible: true,
    destination_url: 'https://example.com/hook-pack',
    utm_slug: 'hook-pack-live',
    price: 299,
  },
];

function buildProfiles(): WorkspaceProfile[] {
  const nordic = applyBioPreset('nordic-minimal');
  const midnight = applyBioPreset('midnight-glass');

  const labUtm = [
    utm('starter-pack-lab', 'Creator Starter Pack', 186, 142, 'https://example.com/starter-pack'),
    utm('coaching-lab', '1:1 Coaching', 64, 51, 'https://example.com/coaching'),
    utm('ebook-lab', 'Gratis E-bok', 312, 248, 'https://example.com/ebook'),
  ];
  const liveUtm = [
    utm('hook-pack-live', 'Live Studio Hook Pack', 94, 71, 'https://example.com/hook-pack'),
    utm('webinar-replay', 'Webinar Replay Pack', 128, 97, 'https://example.com/replay'),
  ];

  return [
    {
      id: '101',
      name: 'Ebba Creator Lab',
      handle: '@ebbacreator',
      avatar_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=ebba-creator-lab',
      color: '#0f766e',
      channels: ['instagram', 'tiktok', 'linkedin', 'youtube'],
      bio: {
        profile_photo:
          'https://api.dicebear.com/7.x/avataaars/svg?seed=EbbaCreator',
        display_name: 'Ebba Creator Lab',
        handle: 'ebbacreator',
        bio_text: 'Nordic creator tools, kurser och community för tillväxt.',
        theme: nordic,
        theme_label: 'Nordic Minimal',
        blocks: creatorLabBlocks,
      },
      analytics: {
        revenue_sek: 0,
        active_members: 0,
        event_rsvps: 0,
        products: 0,
        revenue_chart: [0, 0, 0, 0, 0, 0, 0],
        utm_links: labUtm,
        utm_total_clicks: 0,
        recent_emails: [],
      },
      community: {
        community_id: 101,
        community_name: 'Ebba Creator Lab',
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
        project_name: 'Ebba Creator Lab',
      },
    },
    {
      id: '102',
      name: 'Ebba Live Studio',
      handle: '@ebbalive',
      avatar_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=ebba-live-studio',
      color: '#0369a1',
      channels: ['instagram', 'linkedin', 'youtube'],
      bio: {
        profile_photo:
          'https://api.dicebear.com/7.x/avataaars/svg?seed=EbbaLive',
        display_name: 'Ebba Live Studio',
        handle: 'ebbalive',
        bio_text: 'Live-webbinarier, RSVP och realtidschatt för creators.',
        theme: midnight,
        theme_label: 'Midnight Glass',
        blocks: liveStudioBlocks,
      },
      analytics: {
        revenue_sek: 0,
        active_members: 0,
        event_rsvps: 0,
        products: 0,
        revenue_chart: [0, 0, 0, 0, 0, 0, 0],
        utm_links: liveUtm,
        utm_total_clicks: 0,
        recent_emails: [],
      },
      community: {
        community_id: 102,
        community_name: 'Ebba Live Studio',
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
        project_name: 'Ebba Live Studio',
      },
    },
  ];
}

let profiles: WorkspaceProfile[] = buildProfiles();
let profilesHydrated = false;

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
      revenue_chart: [0, 0, 0, 0, 0, 0, 0],
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
  const id = input.id ?? String(Date.now() % 100000);
  if (profiles.some((p) => p.id === id)) {
    return cloneProfile(profiles.find((p) => p.id === id)!);
  }
  let handle = (input.handle ?? '').trim() || input.name.replace(/\s+/g, '').toLowerCase();
  handle = handle.replace(/^@/, '');
  const theme = applyBioPreset('nordic');
  const profile: WorkspaceProfile = {
    id,
    name: input.name.trim() || 'Ny Team-yta',
    handle: `@${handle}`,
    avatar_url: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(input.name)}`,
    color: input.color || '#E11D48',
    channels: input.channels?.length
      ? input.channels
      : ['instagram', 'tiktok', 'linkedin'],
    bio: {
      profile_photo: null,
      display_name: input.name.trim() || 'Ny Team-yta',
      handle,
      bio_text: '',
      theme,
      theme_label: 'Nordic Minimal',
      blocks: [],
    },
    analytics: {
      revenue_sek: 0,
      active_members: 1,
      event_rsvps: 0,
      products: 0,
      revenue_chart: [0, 0, 0, 0, 0, 0, 0],
      utm_links: [],
      utm_total_clicks: 0,
      recent_emails: [],
    },
    community: {
      community_id: Number(id) || Date.now(),
      community_name: input.name.trim() || 'Ny Team-yta',
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
      project_name: input.name.trim() || 'Ny Team-yta',
    },
  };
  profiles = [...profiles, profile];
  persistProfiles();
  return cloneProfile(profile);
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

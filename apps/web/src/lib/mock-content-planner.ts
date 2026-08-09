/** In-memory Social Media Content Planner (demo) — Kanban + Studio. */

export type SocialPlatform = 'instagram' | 'tiktok' | 'linkedin' | 'youtube';

export type ContentTone = 'inspirerande' | 'professionell' | 'saljig' | 'casual';

/** Legacy status used by older admin composer. */
export type PlannerPostStatus = 'draft' | 'scheduled' | 'published';

/** Trello-style workflow columns. */
export type WorkflowStatus =
  | 'IDEA'
  | 'IN_PROGRESS'
  | 'READY'
  | 'SCHEDULED'
  | 'PUBLISHED';

export type MediaKind = 'image' | 'video' | 'carousel';

export type PlannerMediaItem = {
  id: string;
  url: string;
  type: 'image' | 'video';
};

export type YoutubePrivacy = 'public' | 'unlisted' | 'private';

export type YoutubeMeta = {
  title: string;
  privacy: YoutubePrivacy;
  is_shorts: boolean;
  category: string;
  tags: string[];
};

export type PlannerAssignee = {
  id: string;
  name: string;
  avatar_url: string;
};

export type PlannerSubtask = {
  id: string;
  title: string;
  done: boolean;
};

export type PlannerActivity = {
  id: string;
  text: string;
  created_at: string;
  visibility: 'public' | 'private';
};

export type PlannerComment = {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar: string;
  text: string;
  image_url?: string | null;
  created_at: string;
  visibility: 'public' | 'private';
};

export type PlannerPost = {
  id: string;
  title: string;
  caption: string;
  hashtags: string;
  platforms: SocialPlatform[];
  /** Kanban workflow column. */
  workflow: WorkflowStatus;
  /** Legacy mirror for older UI. */
  status: PlannerPostStatus;
  scheduled_at: string | null;
  published_at: string | null;
  media_url: string | null;
  media_type: MediaKind | null;
  media_items: PlannerMediaItem[];
  youtube?: YoutubeMeta | null;
  idea_title?: string;
  project: string;
  assignees: PlannerAssignee[];
  subtasks: PlannerSubtask[];
  auto_post: boolean;
  activity: PlannerActivity[];
  comments: PlannerComment[];
  created_at: string;
  created_by: string;
};

export type ConnectedSocialAccount = {
  platform: SocialPlatform;
  connected: boolean;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  connected_at: string | null;
  subscriber_count?: number | null;
};

export type AiContentIdea = {
  id: string;
  title: string;
  hook: string;
  template: string;
  captions: Partial<Record<SocialPlatform, string>>;
};

/** @deprecated Use BrandWorkspace — kept for legacy project name lookups. */
export type PlannerProject = {
  id: string;
  name: string;
};

/** Team Workspace / Brand Profile. */
export type BrandWorkspace = {
  id: string;
  name: string;
  handle: string;
  avatar_url: string | null;
  color: string;
  channels: SocialPlatform[];
  created_at: string;
};

export type TeamRole = 'owner' | 'editor' | 'viewer' | 'approver';

export type WorkspacePlan = 'starter' | 'creator' | 'pro';

export type PlannerTeamMember = {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  /** Team-yta / varumärke this member belongs to (workspace name). */
  project: string;
  avatar_url: string;
  /** True when Pro plan grants Content Planner workspace access. */
  planner_access: boolean;
  status: 'active' | 'pending';
  invited_at: string;
};

export const TEAM_ROLE_OPTIONS: { value: TeamRole; label: string }[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'editor', label: 'Editor' },
  { value: 'approver', label: 'Approver' },
  { value: 'viewer', label: 'Viewer' },
];

const now = Date.now();
const day = 24 * 60 * 60 * 1000;
const hour = 60 * 60 * 1000;

let postSeq = 20;
let mediaSeq = 100;
let subtaskSeq = 50;
let activitySeq = 200;
let commentSeq = 300;
let teamSeq = 10;
let workspaceSeq = 10;

const brandWorkspaces: BrandWorkspace[] = [
  {
    id: '101',
    name: 'Ebba Creator Lab',
    handle: '@ebbacreator',
    avatar_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=ebba-creator-lab',
    color: '#0f766e',
    channels: ['instagram', 'tiktok', 'linkedin', 'youtube'],
    created_at: new Date(now - 90 * day).toISOString(),
  },
  {
    id: '102',
    name: 'Ebba Live Studio',
    handle: '@ebbalive',
    avatar_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=ebba-live-studio',
    color: '#0369a1',
    channels: ['instagram', 'linkedin', 'youtube'],
    created_at: new Date(now - 60 * day).toISOString(),
  },
  {
    id: 'ws-nordic',
    name: 'Nordic Creator Launch',
    handle: '@nordiccreator',
    avatar_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=nordic',
    color: '#E11D48',
    channels: ['instagram', 'tiktok', 'linkedin', 'youtube'],
    created_at: new Date(now - 90 * day).toISOString(),
  },
  {
    id: 'ws-cherii',
    name: 'Cherii Media Agency',
    handle: '@cheriimedia',
    avatar_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=cherii',
    color: '#0F766E',
    channels: ['instagram', 'tiktok', 'linkedin'],
    created_at: new Date(now - 45 * day).toISOString(),
  },
  {
    id: 'ws-evergreen',
    name: 'Evergreen Content',
    handle: '@evergreen.nc',
    avatar_url: null,
    color: '#4F46E5',
    channels: ['instagram', 'linkedin'],
    created_at: new Date(now - 30 * day).toISOString(),
  },
];

/** Legacy alias — names mirror brand workspaces. */
export const PLANNER_PROJECTS: PlannerProject[] = brandWorkspaces.map((w) => ({
  id: w.id,
  name: w.name,
}));

function syncProjectsExport() {
  PLANNER_PROJECTS.length = 0;
  for (const w of brandWorkspaces) {
    PLANNER_PROJECTS.push({ id: w.id, name: w.name });
  }
}

export function listBrandWorkspaces(): BrandWorkspace[] {
  return brandWorkspaces.map((w) => ({ ...w, channels: [...w.channels] }));
}

export function getBrandWorkspace(idOrName: string): BrandWorkspace | null {
  const key = idOrName.trim().toLowerCase();
  return (
    brandWorkspaces.find(
      (w) => w.id === idOrName || w.name.toLowerCase() === key || w.handle.toLowerCase() === key
    ) ?? null
  );
}

export function createBrandWorkspace(input: {
  name: string;
  handle: string;
  channels: SocialPlatform[];
  color?: string;
}): BrandWorkspace {
  const name = input.name.trim() || 'Nytt varumärke';
  let handle = input.handle.trim() || name.replace(/\s+/g, '').toLowerCase();
  if (!handle.startsWith('@')) handle = `@${handle.replace(/^@/, '')}`;
  const colors = ['#E11D48', '#0F766E', '#4F46E5', '#EA580C', '#0891B2', '#7C3AED'];
  const ws: BrandWorkspace = {
    id: `ws-${++workspaceSeq}`,
    name,
    handle,
    avatar_url: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(name)}`,
    color: input.color || colors[workspaceSeq % colors.length],
    channels: input.channels.length ? input.channels : ['instagram'],
    created_at: new Date().toISOString(),
  };
  brandWorkspaces.push(ws);
  syncProjectsExport();
  return { ...ws, channels: [...ws.channels] };
}

export function workspaceChannelLabel(ws: BrandWorkspace): string {
  const n = ws.channels.length;
  return `${ws.handle} • ${n} konto${n === 1 ? '' : 'n'}`;
}

/** Demo workspace subscription — Pro unlocks planner invites. */
let workspacePlan: WorkspacePlan = 'pro';

const teamMembers: PlannerTeamMember[] = [
  {
    id: 'u-ebba',
    name: 'Ebba',
    email: 'ebbabrobeck@test.se',
    role: 'owner',
    project: 'Ebba Creator Lab',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ebba',
    planner_access: true,
    status: 'active',
    invited_at: new Date(now - 60 * day).toISOString(),
  },
  {
    id: 'u-alex',
    name: 'Alex',
    email: 'alex@nordiccreator.app',
    role: 'editor',
    project: 'Ebba Creator Lab',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
    planner_access: true,
    status: 'active',
    invited_at: new Date(now - 40 * day).toISOString(),
  },
  {
    id: 'u-mira',
    name: 'Mira',
    email: 'mira@cherii.se',
    role: 'editor',
    project: 'Cherii Media Agency',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mira',
    planner_access: true,
    status: 'active',
    invited_at: new Date(now - 25 * day).toISOString(),
  },
  {
    id: 'u-sara',
    name: 'Sara',
    email: 'sara@nordiccreator.app',
    role: 'approver',
    project: 'Ebba Live Studio',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sara',
    planner_access: true,
    status: 'active',
    invited_at: new Date(now - 20 * day).toISOString(),
  },
  {
    id: 'u-noah',
    name: 'Noah',
    email: 'noah@cherii.se',
    role: 'editor',
    project: 'Cherii Media Agency',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=noah',
    planner_access: true,
    status: 'active',
    invited_at: new Date(now - 12 * day).toISOString(),
  },
];

/** Assignees derived from workspace team (used across studio / cards). */
export function getPlannerTeam(): PlannerAssignee[] {
  return teamMembers
    .filter((m) => m.status === 'active' || m.planner_access)
    .map((m) => ({ id: m.id, name: m.name, avatar_url: m.avatar_url }));
}

/** @deprecated Prefer getPlannerTeam() — kept as live array mirror for existing imports. */
export const PLANNER_TEAM: PlannerAssignee[] = getPlannerTeam();

function syncPlannerTeamExport() {
  PLANNER_TEAM.length = 0;
  PLANNER_TEAM.push(...getPlannerTeam());
}

export function getWorkspacePlan(): WorkspacePlan {
  return workspacePlan;
}

export function setWorkspacePlan(plan: WorkspacePlan): WorkspacePlan {
  workspacePlan = plan;
  for (const m of teamMembers) {
    if (m.role === 'owner') {
      m.planner_access = true;
      continue;
    }
    m.planner_access = plan === 'pro';
    if (plan === 'pro' && m.status === 'pending') m.status = 'active';
  }
  syncPlannerTeamExport();
  return workspacePlan;
}

export function listTeamMembers(project?: string): PlannerTeamMember[] {
  const list = project
    ? teamMembers.filter((m) => m.project === project)
    : [...teamMembers];
  return list.sort((a, b) => a.name.localeCompare(b.name, 'sv'));
}

export function addTeamMember(input: {
  name: string;
  email: string;
  role: TeamRole;
  project: string;
}): { member: PlannerTeamMember; plan: WorkspacePlan; granted_access: boolean } {
  const email = input.email.trim().toLowerCase();
  const existing = teamMembers.find((m) => m.email === email);
  if (existing) {
    return {
      member: existing,
      plan: workspacePlan,
      granted_access: existing.planner_access,
    };
  }
  const isPro = workspacePlan === 'pro';
  const member: PlannerTeamMember = {
    id: `u-${++teamSeq}`,
    name: input.name.trim() || email.split('@')[0],
    email,
    role: input.role === 'owner' ? 'editor' : input.role,
    project: input.project || PLANNER_PROJECTS[0].name,
    avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`,
    planner_access: isPro,
    status: isPro ? 'active' : 'pending',
    invited_at: new Date().toISOString(),
  };
  teamMembers.push(member);
  syncPlannerTeamExport();
  return { member, plan: workspacePlan, granted_access: isPro };
}

export function updateTeamMember(
  id: string,
  patch: Partial<Pick<PlannerTeamMember, 'name' | 'email' | 'role' | 'project' | 'status'>>
): PlannerTeamMember | null {
  const member = teamMembers.find((m) => m.id === id);
  if (!member) return null;
  if (patch.name !== undefined) member.name = patch.name.trim() || member.name;
  if (patch.email !== undefined) member.email = patch.email.trim().toLowerCase();
  if (patch.role !== undefined && member.role !== 'owner') {
    member.role = patch.role === 'owner' ? member.role : patch.role;
  }
  if (patch.project !== undefined) member.project = patch.project;
  if (patch.status !== undefined && member.role !== 'owner') member.status = patch.status;
  if (workspacePlan === 'pro' && member.role !== 'owner') member.planner_access = true;
  if (workspacePlan !== 'pro' && member.role !== 'owner') member.planner_access = false;
  syncPlannerTeamExport();
  return { ...member };
}

export function removeTeamMember(id: string): boolean {
  const idx = teamMembers.findIndex((m) => m.id === id);
  if (idx < 0) return false;
  if (teamMembers[idx].role === 'owner') return false;
  teamMembers.splice(idx, 1);
  syncPlannerTeamExport();
  return true;
}

export const WORKFLOW_COLUMNS: {
  key: WorkflowStatus;
  label: string;
  emoji: string;
  color: string;
  badge: string;
}[] = [
  {
    key: 'IDEA',
    label: 'Ideas',
    emoji: '💡',
    color: '#F59E0B',
    badge: 'bg-amber-50 text-amber-700',
  },
  {
    key: 'IN_PROGRESS',
    label: 'In Production',
    emoji: '📝',
    color: '#6366F1',
    badge: 'bg-indigo-50 text-indigo-700',
  },
  {
    key: 'READY',
    label: 'Review',
    emoji: '👀',
    color: '#8B5CF6',
    badge: 'bg-violet-50 text-violet-700',
  },
  {
    key: 'SCHEDULED',
    label: 'Scheduled',
    emoji: '📅',
    color: '#0EA5E9',
    badge: 'bg-sky-50 text-sky-700',
  },
  {
    key: 'PUBLISHED',
    label: 'Published',
    emoji: '🚀',
    color: '#10B981',
    badge: 'bg-emerald-50 text-emerald-700',
  },
];

export function workflowToLegacy(workflow: WorkflowStatus): PlannerPostStatus {
  if (workflow === 'PUBLISHED') return 'published';
  if (workflow === 'SCHEDULED') return 'scheduled';
  return 'draft';
}

export function legacyToWorkflow(status: PlannerPostStatus): WorkflowStatus {
  if (status === 'published') return 'PUBLISHED';
  if (status === 'scheduled') return 'SCHEDULED';
  return 'IDEA';
}

function normalizeMedia(
  media_items?: PlannerMediaItem[] | null,
  media_url?: string | null,
  media_type?: MediaKind | 'image' | 'video' | null
): { media_items: PlannerMediaItem[]; media_url: string | null; media_type: MediaKind | null } {
  if (media_items && media_items.length > 0) {
    const kind: MediaKind =
      media_items.length > 1
        ? 'carousel'
        : media_items[0].type === 'video'
          ? 'video'
          : 'image';
    return {
      media_items: media_items.slice(0, 10),
      media_url: media_items[0].url,
      media_type: kind,
    };
  }
  if (media_url) {
    const type = media_type === 'video' ? 'video' : 'image';
    return {
      media_items: [{ id: `legacy-${mediaSeq++}`, url: media_url, type }],
      media_url,
      media_type: type,
    };
  }
  return { media_items: [], media_url: null, media_type: null };
}

function act(
  text: string,
  visibility: 'public' | 'private' = 'public',
  at = new Date().toISOString()
): PlannerActivity {
  return { id: `act-${++activitySeq}`, text, created_at: at, visibility };
}

const posts: PlannerPost[] = [
  {
    id: 'post-1',
    title: '3 misstag i e-handel',
    caption:
      '3 misstag som kostar dig kunder online 👇\n\n1. Ingen tydlig CTA\n2. För långa videos\n3. Inget social proof',
    hashtags: '#ehandel #tips #nordiccreator',
    platforms: ['instagram', 'tiktok'],
    workflow: 'SCHEDULED',
    status: 'scheduled',
    scheduled_at: new Date(now + 1 * day).toISOString(),
    published_at: null,
    media_url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80',
    media_type: 'image',
    media_items: [
      {
        id: 'm-a1',
        url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80',
        type: 'image',
      },
    ],
    idea_title: '3 misstag i e-handel',
    project: 'Ebba Creator Lab',
    assignees: [PLANNER_TEAM[0], PLANNER_TEAM[1]],
    subtasks: [
      { id: 'st-1', title: 'Skriv hook', done: true },
      { id: 'st-2', title: 'Filma B-roll', done: true },
      { id: 'st-3', title: 'Lägg hashtags', done: false },
      { id: 'st-4', title: 'Godkänn caption', done: false },
    ],
    auto_post: true,
    activity: [
      act('Content was created by Ebba', 'public', new Date(now - 2 * day).toISOString()),
      act('Status was set to IDEA by Ebba', 'public', new Date(now - 2 * day + hour).toISOString()),
      act(
        'Status was set to SCHEDULED by Alex',
        'public',
        new Date(now - 1 * day).toISOString()
      ),
    ],
    comments: [
      {
        id: 'c-1',
        author_id: 'u-alex',
        author_name: 'Alex',
        author_avatar: PLANNER_TEAM[1].avatar_url,
        text: 'Hooken är stark — kör på!',
        created_at: new Date(now - 20 * hour).toISOString(),
        visibility: 'private',
      },
    ],
    created_at: new Date(now - 2 * day).toISOString(),
    created_by: 'Ebba',
  },
  {
    id: 'post-2',
    title: 'Community som konverterar',
    caption:
      'Så bygger du en community som faktiskt köper.\n\nVärde först. Erbjudande sen. Relation alltid.',
    hashtags: '#community #creator #linkedin',
    platforms: ['linkedin'],
    workflow: 'READY',
    status: 'draft',
    scheduled_at: new Date(now + 3 * day).toISOString(),
    published_at: null,
    media_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&q=80',
    media_type: 'image',
    media_items: [
      {
        id: 'm-b1',
        url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&q=80',
        type: 'image',
      },
    ],
    idea_title: 'Community som konverterar',
    project: 'Ebba Creator Lab',
    assignees: [PLANNER_TEAM[2]],
    subtasks: [
      { id: 'st-5', title: 'Draft LinkedIn text', done: true },
      { id: 'st-6', title: 'Välj cover', done: true },
      { id: 'st-7', title: 'Peer review', done: false },
    ],
    auto_post: false,
    activity: [
      act('Content was created by Sara', 'public', new Date(now - 1 * day).toISOString()),
      act('Status was set to READY by Sara', 'public', new Date(now - 8 * hour).toISOString()),
    ],
    comments: [],
    created_at: new Date(now - 1 * day).toISOString(),
    created_by: 'Sara',
  },
  {
    id: 'post-3',
    title: 'BTS från livesändning',
    caption:
      'Behind the scenes från dagens livesändning 🎥\nVilken del vill ni se mer av?',
    hashtags: '#bts #live #creatorlife',
    platforms: ['instagram'],
    workflow: 'PUBLISHED',
    status: 'published',
    scheduled_at: new Date(now - 1 * day).toISOString(),
    published_at: new Date(now - 1 * day).toISOString(),
    media_url: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=800&q=80',
    media_type: 'image',
    media_items: [
      {
        id: 'm1',
        url: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=800&q=80',
        type: 'image',
      },
    ],
    project: 'Nordic Creator Launch',
    assignees: [PLANNER_TEAM[0]],
    subtasks: [
      { id: 'st-8', title: 'Klipp highlight', done: true },
      { id: 'st-9', title: 'Publicera', done: true },
    ],
    auto_post: true,
    activity: [
      act('Content was created by Ebba', 'public', new Date(now - 3 * day).toISOString()),
      act(
        'Status was set to PUBLISHED by Ebba',
        'public',
        new Date(now - 1 * day).toISOString()
      ),
    ],
    comments: [],
    created_at: new Date(now - 3 * day).toISOString(),
    created_by: 'Ebba',
  },
  {
    id: 'post-4',
    title: 'Lansering digital produkt',
    caption: 'Utkast: lansering av nya digitala produkten…',
    hashtags: '#launch #digitalprodukt',
    platforms: ['instagram', 'linkedin'],
    workflow: 'IN_PROGRESS',
    status: 'draft',
    scheduled_at: null,
    published_at: null,
    media_url: null,
    media_type: null,
    media_items: [],
    project: 'Nordic Creator Launch',
    assignees: [PLANNER_TEAM[1], PLANNER_TEAM[3]],
    subtasks: [
      { id: 'st-10', title: 'Brief', done: true },
      { id: 'st-11', title: 'Design assets', done: false },
      { id: 'st-12', title: 'Copy', done: false },
      { id: 'st-13', title: 'QA', done: false },
    ],
    auto_post: false,
    activity: [
      act('Content was created by Alex', 'public', new Date(now - 4 * hour).toISOString()),
      act(
        'Status was set to IN_PROGRESS by Alex',
        'public',
        new Date(now - 3 * hour).toISOString()
      ),
    ],
    comments: [],
    created_at: new Date(now - 4 * hour).toISOString(),
    created_by: 'Alex',
  },
  {
    id: 'post-5',
    title: 'Batcha 5 reels',
    caption:
      'Quick tip: Batcha 5 reels på en eftermiddag.\nDin framtida jag kommer tacka dig 🙌',
    hashtags: '#contentcreator #productivity',
    platforms: ['tiktok', 'instagram', 'youtube'],
    workflow: 'SCHEDULED',
    status: 'scheduled',
    scheduled_at: new Date(now + 5 * day).toISOString(),
    published_at: null,
    media_url: 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=600&q=80',
    media_type: 'image',
    media_items: [
      {
        id: 'm-c1',
        url: 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=600&q=80',
        type: 'image',
      },
    ],
    youtube: {
      title: 'Batcha 5 reels på en eftermiddag',
      privacy: 'public',
      is_shorts: true,
      category: 'Education',
      tags: ['contentcreator', 'productivity', 'shorts'],
    },
    project: 'Ebba Live Studio',
    assignees: [PLANNER_TEAM[3]],
    subtasks: [
      { id: 'st-14', title: 'Script', done: true },
      { id: 'st-15', title: 'Edit', done: true },
      { id: 'st-16', title: 'Thumbnail', done: false },
    ],
    auto_post: true,
    activity: [
      act('Content was created by Noah in Evergreen Content', 'public', new Date(now - 5 * day).toISOString()),
      act(
        'Status was set to SCHEDULED by Noah',
        'public',
        new Date(now - 2 * day).toISOString()
      ),
    ],
    comments: [],
    created_at: new Date(now - 5 * day).toISOString(),
    created_by: 'Noah',
  },
  {
    id: 'post-7',
    title: 'Cherii client reel — spring drop',
    caption: 'Spring drop för vår klient 🌸\nVilken look tar du?',
    hashtags: '#cherii #agency #reels',
    platforms: ['instagram', 'tiktok'],
    workflow: 'IN_PROGRESS',
    status: 'draft',
    scheduled_at: new Date(now + 2 * day).toISOString(),
    published_at: null,
    media_url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80',
    media_type: 'image',
    media_items: [
      {
        id: 'm-ch1',
        url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80',
        type: 'image',
      },
    ],
    project: 'Cherii Media Agency',
    assignees: [
      { id: 'u-mira', name: 'Mira', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mira' },
    ],
    subtasks: [
      { id: 'st-19', title: 'Klientgodkännande', done: false },
      { id: 'st-20', title: 'Final cut', done: false },
    ],
    auto_post: false,
    activity: [
      act('Content was created by Mira in Cherii Media Agency', 'public', new Date(now - 2 * day).toISOString()),
      act('Status was set to IN_PROGRESS by Mira', 'public', new Date(now - day).toISOString()),
    ],
    comments: [],
    created_at: new Date(now - 2 * day).toISOString(),
    created_by: 'Mira',
  },
  {
    id: 'post-6',
    title: 'Hook-idé: 15s scroll-stopper',
    caption: '',
    hashtags: '',
    platforms: ['instagram'],
    workflow: 'IDEA',
    status: 'draft',
    scheduled_at: null,
    published_at: null,
    media_url: null,
    media_type: null,
    media_items: [],
    project: 'Nordic Creator Launch',
    assignees: [PLANNER_TEAM[0]],
    subtasks: [
      { id: 'st-17', title: 'Brainstorm hooks', done: false },
      { id: 'st-18', title: 'Välj vinkel', done: false },
    ],
    auto_post: false,
    activity: [
      act('Content was created by Ebba', 'public', new Date(now - 6 * hour).toISOString()),
      act('Status was set to IDEA by Ebba', 'public', new Date(now - 6 * hour).toISOString()),
    ],
    comments: [],
    created_at: new Date(now - 6 * hour).toISOString(),
    created_by: 'Ebba',
  },
];

const socialAccounts: ConnectedSocialAccount[] = [
  {
    platform: 'instagram',
    connected: true,
    handle: '@nordic.creator',
    display_name: 'Nordic Creator',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nc-ig',
    connected_at: new Date(now - 30 * day).toISOString(),
  },
  {
    platform: 'tiktok',
    connected: false,
    handle: null,
    display_name: null,
    avatar_url: null,
    connected_at: null,
  },
  {
    platform: 'linkedin',
    connected: true,
    handle: 'Nordic Creator AB',
    display_name: 'Nordic Creator',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nc-li',
    connected_at: new Date(now - 12 * day).toISOString(),
  },
  {
    platform: 'youtube',
    connected: false,
    handle: null,
    display_name: null,
    avatar_url: null,
    connected_at: null,
    subscriber_count: null,
  },
];

const TONE_FLAVOR: Record<ContentTone, string> = {
  inspirerande: 'Du klarar det — börja idag.',
  professionell: 'Här är en konkret, beprövad approach.',
  saljig: 'Redo att ta nästa steg? Länken i bio.',
  casual: 'Okej, real talk — det här funkar faktiskt.',
};

const HASHTAGS: Record<SocialPlatform, string[]> = {
  instagram: ['#contentcreator', '#reels', '#nordiccreator', '#tips'],
  tiktok: ['#fyp', '#creator', '#tips', '#learnontiktok'],
  linkedin: ['#entreprenörskap', '#contentmarketing', '#leadership', '#b2b'],
  youtube: ['#youtube', '#creator', '#tutorial'],
};

export function mediaTypeBadge(items: PlannerMediaItem[]): string {
  if (!items.length) return 'Ingen media';
  if (items.length > 1) return `Karusell (${items.length} bilder)`;
  return items[0].type === 'video' ? 'Video' : 'Bild';
}

export function checklistProgress(subtasks: PlannerSubtask[]): string {
  const done = subtasks.filter((s) => s.done).length;
  return `${done}/${subtasks.length}`;
}

export function listPlannerPosts(project?: string): PlannerPost[] {
  const filtered = project
    ? posts.filter((p) => p.project === project)
    : posts;
  return [...filtered].sort((a, b) => {
    const aTime = a.scheduled_at || a.created_at;
    const bTime = b.scheduled_at || b.created_at;
    return new Date(aTime).getTime() - new Date(bTime).getTime();
  });
}

export function getPlannerPost(id: string): PlannerPost | null {
  return posts.find((p) => p.id === id) ?? null;
}

export function movePlannerPost(
  id: string,
  workflow: WorkflowStatus,
  actor = 'Ebba'
): PlannerPost | null {
  const post = posts.find((p) => p.id === id);
  if (!post) return null;
  if (post.workflow === workflow) return post;
  post.workflow = workflow;
  post.status = workflowToLegacy(workflow);
  if (workflow === 'PUBLISHED') {
    post.published_at = new Date().toISOString();
    post.scheduled_at = post.scheduled_at || new Date().toISOString();
  }
  if (workflow === 'SCHEDULED' && !post.scheduled_at) {
    post.scheduled_at = new Date(Date.now() + day).toISOString();
  }
  post.activity = [
    ...post.activity,
    act(`Status was set to ${workflow} by ${actor}`),
  ];
  return post;
}

export function upsertPlannerPost(
  input: Partial<PlannerPost> & { caption?: string; platforms: SocialPlatform[] },
  actor = 'Ebba'
): PlannerPost {
  const media = normalizeMedia(input.media_items, input.media_url, input.media_type);
  const existing = input.id ? posts.find((p) => p.id === input.id) : null;

  let workflow: WorkflowStatus =
    input.workflow ??
    (input.status ? legacyToWorkflow(input.status) : 'IDEA');
  if (!input.workflow && input.status) {
    workflow = legacyToWorkflow(input.status);
  }

  if (existing) {
    const prevWorkflow = existing.workflow;
    Object.assign(existing, {
      title: input.title ?? existing.title,
      caption: input.caption ?? existing.caption,
      hashtags: input.hashtags ?? existing.hashtags,
      platforms: input.platforms,
      workflow,
      status: workflowToLegacy(workflow),
      scheduled_at:
        input.scheduled_at !== undefined ? input.scheduled_at : existing.scheduled_at,
      published_at:
        input.published_at !== undefined ? input.published_at : existing.published_at,
      media_url: media.media_url,
      media_type: media.media_type,
      media_items: media.media_items,
      youtube: input.youtube !== undefined ? input.youtube : existing.youtube,
      idea_title: input.idea_title ?? input.title ?? existing.idea_title,
      project: input.project ?? existing.project,
      assignees: input.assignees ?? existing.assignees,
      subtasks: input.subtasks ?? existing.subtasks,
      auto_post: input.auto_post ?? existing.auto_post,
    });
    const wsName = existing.project;
    if (prevWorkflow !== workflow) {
      existing.activity = [
        ...existing.activity,
        act(`Status was set to ${workflow} by ${actor} in ${wsName}`),
      ];
    } else {
      existing.activity = [
        ...existing.activity,
        act(`Post was updated by ${actor} in ${wsName}`, 'private'),
      ];
    }
    return existing;
  }

  const title =
    input.title?.trim() ||
    input.idea_title?.trim() ||
    (input.caption || '').split('\n')[0].slice(0, 60) ||
    'Nytt inlägg';

  const wsName = input.project ?? brandWorkspaces[0]?.name ?? 'Nordic Creator Launch';

  const post: PlannerPost = {
    id: `post-${++postSeq}`,
    title,
    caption: input.caption ?? '',
    hashtags: input.hashtags ?? '',
    platforms: input.platforms,
    workflow,
    status: workflowToLegacy(workflow),
    scheduled_at: input.scheduled_at ?? null,
    published_at: input.published_at ?? null,
    media_url: media.media_url,
    media_type: media.media_type,
    media_items: media.media_items,
    youtube: input.youtube ?? null,
    idea_title: input.idea_title ?? title,
    project: wsName,
    assignees: input.assignees ?? [PLANNER_TEAM[0]],
    subtasks: input.subtasks ?? [],
    auto_post: input.auto_post ?? false,
    activity: [
      act(`Content was created by ${actor} in ${wsName}`),
      act(`Status was set to ${workflow} by ${actor} in ${wsName}`),
    ],
    comments: [],
    created_at: new Date().toISOString(),
    created_by: actor,
  };
  posts.push(post);
  return post;
}

export function addPlannerComment(
  postId: string,
  input: {
    text: string;
    author_name?: string;
    author_id?: string;
    author_avatar?: string;
    image_url?: string | null;
    visibility?: 'public' | 'private';
  }
): PlannerComment | null {
  const post = posts.find((p) => p.id === postId);
  if (!post) return null;
  const author =
    PLANNER_TEAM.find((t) => t.id === input.author_id) || PLANNER_TEAM[0];
  const comment: PlannerComment = {
    id: `c-${++commentSeq}`,
    author_id: input.author_id || author.id,
    author_name: input.author_name || author.name,
    author_avatar: input.author_avatar || author.avatar_url,
    text: input.text.trim(),
    image_url: input.image_url ?? null,
    created_at: new Date().toISOString(),
    visibility: input.visibility ?? 'private',
  };
  if (!comment.text && !comment.image_url) return null;
  post.comments = [...post.comments, comment];
  post.activity = [
    ...post.activity,
    act(`${comment.author_name} commented on the post`, comment.visibility),
  ];
  return comment;
}

export function deletePlannerPost(id: string): boolean {
  const idx = posts.findIndex((p) => p.id === id);
  if (idx < 0) return false;
  posts.splice(idx, 1);
  return true;
}

export function listSocialAccounts(): ConnectedSocialAccount[] {
  return socialAccounts.map((a) => ({ ...a }));
}

export function setSocialConnection(
  platform: SocialPlatform,
  connect: boolean
): ConnectedSocialAccount {
  const acc = socialAccounts.find((a) => a.platform === platform);
  if (!acc) throw new Error('Unknown platform');
  if (connect) {
    const handles: Record<SocialPlatform, string> = {
      instagram: '@nordic.creator',
      tiktok: '@nordiccreator',
      linkedin: 'Nordic Creator AB',
      youtube: '@NordicCreator',
    };
    const names: Record<SocialPlatform, string> = {
      instagram: 'Nordic Creator',
      tiktok: 'Nordic Creator',
      linkedin: 'Nordic Creator',
      youtube: 'Nordic Creator Channel',
    };
    acc.connected = true;
    acc.handle = handles[platform];
    acc.display_name = names[platform];
    acc.avatar_url = `https://api.dicebear.com/7.x/avataaars/svg?seed=nc-${platform}`;
    acc.connected_at = new Date().toISOString();
    acc.subscriber_count = platform === 'youtube' ? 12840 : null;
  } else {
    acc.connected = false;
    acc.handle = null;
    acc.display_name = null;
    acc.avatar_url = null;
    acc.connected_at = null;
    acc.subscriber_count = null;
  }
  return { ...acc };
}

function buildCaption(
  prompt: string,
  platform: SocialPlatform,
  tone: ContentTone,
  angle: string
): string {
  const tags = HASHTAGS[platform].join(' ');
  const flavor = TONE_FLAVOR[tone];
  if (platform === 'linkedin') {
    return `${angle}\n\nÄmne: ${prompt}\n\n${flavor}\n\nVad är din erfarenhet?\n\n${tags}`;
  }
  if (platform === 'tiktok') {
    return `${angle} 🔥\n\n${prompt}\n\n${flavor}\n\n${tags}`;
  }
  return `${angle}\n\n${prompt}\n\n${flavor}\n\n${tags}`;
}

export function generateContentIdeas(input: {
  prompt: string;
  platforms: SocialPlatform[];
  tone: ContentTone;
}): AiContentIdea[] {
  const topic = input.prompt.trim() || 'ditt ämne';
  const platforms = input.platforms.length
    ? input.platforms
    : (['instagram'] as SocialPlatform[]);
  const tone = input.tone;
  const angles = [
    {
      title: `Hook: "${topic}" på 15 sekunder`,
      hook: 'Öppna med ett starkt påstående som stoppar scrollen.',
      template: 'Hook → 3 punkter → CTA',
    },
    {
      title: `Checklist: Gör detta innan du ${topic.toLowerCase()}`,
      hook: 'Checklistor får sparningar och delningar.',
      template: 'Intro → Checklist (5 steg) → Soft CTA',
    },
    {
      title: `Misstag folk gör kring ${topic}`,
      hook: 'Negativ framing skapar nyfikenhet.',
      template: 'Misstag 1–3 → Fix → CTA',
    },
  ];
  return angles.map((a, i) => {
    const captions: Partial<Record<SocialPlatform, string>> = {};
    for (const p of platforms) captions[p] = buildCaption(topic, p, tone, a.hook);
    return {
      id: `idea-${Date.now()}-${i}`,
      title: a.title,
      hook: a.hook,
      template: a.template,
      captions,
    };
  });
}

export function polishCaption(caption: string, tone: ContentTone = 'inspirerande'): string {
  const base = caption.trim() || 'Dela ditt budskap här.';
  const flavor = TONE_FLAVOR[tone];
  const withoutTags = base.replace(/#[\wåäöÅÄÖ]+/gi, '').trim();
  const tags = (base.match(/#[\wåäöÅÄÖ]+/gi) ?? []).join(' ');
  return `${flavor}\n\n${withoutTags}\n\n${tags}`.trim();
}

export const PLATFORM_META: Record<
  SocialPlatform,
  { label: string; color: string; connectLabel: string }
> = {
  instagram: {
    label: 'Instagram',
    color: '#E1306C',
    connectLabel: 'Connect Instagram Business',
  },
  tiktok: {
    label: 'TikTok',
    color: '#010101',
    connectLabel: 'Connect TikTok Business',
  },
  linkedin: {
    label: 'LinkedIn',
    color: '#0A66C2',
    connectLabel: 'Connect LinkedIn Profile / Page',
  },
  youtube: {
    label: 'YouTube',
    color: '#FF0000',
    connectLabel: 'Connect YouTube Channel',
  },
};

export const TONE_OPTIONS: { value: ContentTone; label: string }[] = [
  { value: 'inspirerande', label: 'Inspirerande' },
  { value: 'professionell', label: 'Professionell' },
  { value: 'saljig', label: 'Säljig' },
  { value: 'casual', label: 'Casual / Humor' },
];

export const YOUTUBE_CATEGORIES = [
  'Education',
  'Entertainment',
  'Howto & Style',
  'People & Blogs',
  'Science & Technology',
  'Business',
  'Music',
] as const;

export const YOUTUBE_PRIVACY_OPTIONS: { value: YoutubePrivacy; label: string }[] = [
  { value: 'public', label: 'Offentlig (Public)' },
  { value: 'unlisted', label: 'Olistad (Unlisted)' },
  { value: 'private', label: 'Privat (Private)' },
];

export function nextMediaId() {
  return `media-${++mediaSeq}`;
}

export function nextSubtaskId() {
  return `st-${++subtaskSeq}`;
}

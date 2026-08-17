/** In-memory Social Media Content Planner (demo) — Kanban + Studio. */

import type { WorkspacePlan } from '@/lib/config/plans';
import { PLAN_LIMITS } from '@/lib/config/plans';

export type { WorkspacePlan } from '@/lib/config/plans';

export type SocialPlatform =
  | 'instagram'
  | 'tiktok'
  | 'linkedin'
  | 'youtube'
  | 'facebook'
  | 'pinterest';

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
  /** Brand workspace name (Team Workspace). */
  project: string;
  /** Campaign / project label ids this post is tagged with. */
  campaigns: string[];
  assignees: PlannerAssignee[];
  subtasks: PlannerSubtask[];
  auto_post: boolean;
  activity: PlannerActivity[];
  comments: PlannerComment[];
  created_at: string;
  created_by: string;
  /** Session user that owns this planner post (isolation). */
  owner_user_id?: string;
};

/** Campaign / project label used to group scheduled content by initiative. */
export type VisionPin = {
  id: string;
  url: string;
  title: string;
  note: string;
  created_at: string;
};

export type CampaignGoalMetric = 'views' | 'engagement';

export type CampaignLabel = {
  id: string;
  name: string;
  color: string;
  description: string;
  created_at: string;
  /** Session user that owns this campaign label (isolation). */
  owner_user_id?: string;
  /** Moodboard / visionboard pins for this project. */
  vision_pins?: VisionPin[];
  /** Manual sidebar / grid order (lower = earlier). */
  sort_order?: number;
  /** Views or engagement goal for this project (0 = unset). */
  goal_metric?: CampaignGoalMetric;
  goal_target?: number;
  goal_current?: number;
};

export type ConnectedSocialAccount = {
  platform: SocialPlatform;
  connected: boolean;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  connected_at: string | null;
  subscriber_count?: number | null;
  /** Instagram / TikTok follower count for connected cards */
  follower_count?: number | null;
  /** Page / brand name shown under the handle */
  page_name?: string | null;
  /** LinkedIn company page URL */
  company_url?: string | null;
  /** Meta / platform external id (for targeted disconnect). */
  external_id?: string | null;
  /** social_accounts.id (UUID) — preferred disconnect key. */
  id?: string | null;
  /** Alias for external_id / platform_user_id column. */
  platform_user_id?: string | null;
  /** Workspace this connection is bound to. */
  workspace_id?: string | null;
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

const brandWorkspaces: BrandWorkspace[] = [];

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

export function workspaceChannelLabel(
  ws: BrandWorkspace,
  accountWord = 'accounts'
): string {
  const n = ws.channels.length;
  return `${ws.handle} • ${n} ${accountWord}`;
}

/** Demo workspace subscription — Pro unlocks planner invites. */
let workspacePlan: WorkspacePlan = 'starter';

const teamMembers: PlannerTeamMember[] = [];

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
}): {
  member: PlannerTeamMember;
  plan: WorkspacePlan;
  granted_access: boolean;
  error?: 'SEAT_LIMIT';
  seat_limit?: number;
} {
  const email = input.email.trim().toLowerCase();
  const existing = teamMembers.find((m) => m.email === email);
  if (existing) {
    return {
      member: existing,
      plan: workspacePlan,
      granted_access: existing.planner_access,
    };
  }

  // Enforce teammate seat cap from PLAN_LIMITS (owner counts toward seats).
  const seatLimit = PLAN_LIMITS[workspacePlan].maxTeammateSeats;
  if (teamMembers.length >= seatLimit) {
    return {
      member: teamMembers[0],
      plan: workspacePlan,
      granted_access: false,
      error: 'SEAT_LIMIT',
      seat_limit: seatLimit,
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

let campaignSeq = 0;
const campaigns: CampaignLabel[] = [];

export function listCampaignLabels(ownerUserId?: string): CampaignLabel[] {
  const scoped = ownerUserId
    ? campaigns.filter((c) => c.owner_user_id === ownerUserId)
    : campaigns;
  return [...scoped].sort((a, b) => {
    const ao = a.sort_order ?? Number.MAX_SAFE_INTEGER;
    const bo = b.sort_order ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function getCampaignLabel(
  id: string,
  ownerUserId?: string
): CampaignLabel | null {
  const c = campaigns.find((x) => x.id === id) ?? null;
  if (!c) return null;
  if (ownerUserId && c.owner_user_id && c.owner_user_id !== ownerUserId) {
    return null;
  }
  return c;
}

export function createCampaignLabel(input: {
  name: string;
  color?: string;
  description?: string;
  ownerUserId?: string;
}): CampaignLabel {
  const owned = input.ownerUserId
    ? campaigns.filter((c) => c.owner_user_id === input.ownerUserId)
    : campaigns;
  const nextOrder =
    owned.reduce((max, c) => Math.max(max, c.sort_order ?? -1), -1) + 1;
  const label: CampaignLabel = {
    id: `camp-${++campaignSeq}`,
    name: input.name.trim() || 'Untitled project',
    color: input.color || '#9089F0',
    description: (input.description ?? '').trim(),
    created_at: new Date().toISOString(),
    owner_user_id: input.ownerUserId,
    sort_order: nextOrder,
    goal_metric: 'views',
    goal_target: 0,
    goal_current: 0,
  };
  campaigns.unshift(label);
  return label;
}

export function updateCampaignLabel(
  id: string,
  patch: Partial<
    Pick<
      CampaignLabel,
      | 'name'
      | 'color'
      | 'description'
      | 'vision_pins'
      | 'goal_metric'
      | 'goal_target'
      | 'goal_current'
    >
  >,
  ownerUserId?: string
): CampaignLabel | null {
  const c = campaigns.find((x) => x.id === id);
  if (!c) return null;
  if (ownerUserId && c.owner_user_id && c.owner_user_id !== ownerUserId) {
    return null;
  }
  if (patch.name !== undefined) c.name = patch.name.trim() || c.name;
  if (patch.color !== undefined) c.color = patch.color;
  if (patch.description !== undefined) c.description = patch.description.trim();
  if (patch.vision_pins !== undefined) c.vision_pins = patch.vision_pins;
  if (patch.goal_metric !== undefined) c.goal_metric = patch.goal_metric;
  if (patch.goal_target !== undefined) {
    c.goal_target = Math.max(0, Math.floor(Number(patch.goal_target) || 0));
  }
  if (patch.goal_current !== undefined) {
    c.goal_current = Math.max(0, Math.floor(Number(patch.goal_current) || 0));
  }
  return c;
}

export function deleteCampaignLabel(id: string, ownerUserId?: string): boolean {
  const idx = campaigns.findIndex((c) => c.id === id);
  if (idx < 0) return false;
  const target = campaigns[idx];
  if (
    ownerUserId &&
    target.owner_user_id &&
    target.owner_user_id !== ownerUserId
  ) {
    return false;
  }
  campaigns.splice(idx, 1);
  // Detach label from all posts owned by the same user (or all if unscoped).
  for (const p of posts) {
    if (ownerUserId && p.owner_user_id && p.owner_user_id !== ownerUserId) {
      continue;
    }
    p.campaigns = (p.campaigns ?? []).filter((cid) => cid !== id);
  }
  return true;
}

/** Persist a manual project order (sidebar drag-and-drop). */
export function reorderCampaignLabels(
  orderedIds: string[],
  ownerUserId?: string
): CampaignLabel[] {
  const scoped = listCampaignLabels(ownerUserId);
  const byId = new Map(scoped.map((c) => [c.id, c]));
  const seen = new Set<string>();
  let order = 0;
  for (const id of orderedIds) {
    const c = byId.get(id);
    if (!c || seen.has(id)) continue;
    c.sort_order = order;
    order += 1;
    seen.add(id);
  }
  for (const c of scoped) {
    if (seen.has(c.id)) continue;
    c.sort_order = order;
    order += 1;
  }
  return listCampaignLabels(ownerUserId);
}

/** Posts tagged with a campaign label (optionally scoped to a brand workspace). */
export function listPostsForCampaign(
  campaignId: string,
  workspaceName?: string,
  ownerUserId?: string
): PlannerPost[] {
  return listPlannerPosts(workspaceName, ownerUserId).filter((p) =>
    (p.campaigns ?? []).includes(campaignId)
  );
}

/** Fresh creator workspaces start with no planned posts. */
const posts: PlannerPost[] = [];

const socialAccounts: ConnectedSocialAccount[] = [
  {
    platform: 'instagram',
    connected: false,
    handle: null,
    display_name: null,
    avatar_url: null,
    connected_at: null,
    follower_count: null,
    page_name: null,
  },
  {
    platform: 'tiktok',
    connected: false,
    handle: null,
    display_name: null,
    avatar_url: null,
    connected_at: null,
    follower_count: null,
  },
  {
    platform: 'linkedin',
    connected: false,
    handle: null,
    display_name: null,
    avatar_url: null,
    connected_at: null,
    company_url: null,
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
  {
    platform: 'facebook',
    connected: false,
    handle: null,
    display_name: null,
    avatar_url: null,
    connected_at: null,
    follower_count: null,
    page_name: null,
  },
  {
    platform: 'pinterest',
    connected: false,
    handle: null,
    display_name: null,
    avatar_url: null,
    connected_at: null,
    follower_count: null,
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
  facebook: ['#creator', '#community', '#digitalmarketing', '#nordic'],
  pinterest: ['#pinterest', '#pinideas', '#inspiration', '#creator', '#diy'],
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

export function listPlannerPosts(
  project?: string,
  ownerUserId?: string
): PlannerPost[] {
  let filtered = posts;
  if (ownerUserId) {
    filtered = filtered.filter((p) => p.owner_user_id === ownerUserId);
  }
  if (project) {
    filtered = filtered.filter((p) => p.project === project);
  }
  return [...filtered].sort((a, b) => {
    const aTime = a.scheduled_at || a.created_at;
    const bTime = b.scheduled_at || b.created_at;
    return new Date(aTime).getTime() - new Date(bTime).getTime();
  });
}

export function getPlannerPost(
  id: string,
  ownerUserId?: string
): PlannerPost | null {
  const post = posts.find((p) => p.id === id) ?? null;
  if (!post) return null;
  if (ownerUserId && post.owner_user_id && post.owner_user_id !== ownerUserId) {
    return null;
  }
  return post;
}

function assertPostOwner(
  post: PlannerPost | undefined | null,
  ownerUserId?: string
): PlannerPost | null {
  if (!post) return null;
  if (ownerUserId && post.owner_user_id && post.owner_user_id !== ownerUserId) {
    return null;
  }
  return post;
}

export function movePlannerPost(
  id: string,
  workflow: WorkflowStatus,
  actor = 'Ebba',
  ownerUserId?: string
): PlannerPost | null {
  const post = assertPostOwner(
    posts.find((p) => p.id === id),
    ownerUserId
  );
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

/** Drag-and-drop: move a post to a new scheduled datetime. */
export function reschedulePlannerPost(
  id: string,
  scheduledAt: string,
  actor = 'Ebba',
  ownerUserId?: string
): PlannerPost | null {
  const post = assertPostOwner(
    posts.find((p) => p.id === id),
    ownerUserId
  );
  if (!post) return null;
  const prev = post.scheduled_at;
  post.scheduled_at = scheduledAt;
  // Promote draft-like items into the schedule when dropped on the calendar.
  if (post.workflow === 'IDEA' || post.workflow === 'IN_PROGRESS' || post.workflow === 'READY') {
    post.workflow = 'SCHEDULED';
    post.status = 'scheduled';
  } else if (post.workflow === 'SCHEDULED') {
    post.status = 'scheduled';
  }
  const when = new Date(scheduledAt).toLocaleString('sv-SE', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  post.activity = [
    ...post.activity,
    act(
      prev
        ? `Schedule was moved to ${when} by ${actor}`
        : `Post was scheduled for ${when} by ${actor}`
    ),
  ];
  return post;
}

export function upsertPlannerPost(
  input: Partial<PlannerPost> & { caption?: string; platforms: SocialPlatform[] },
  actor = 'Ebba',
  ownerUserId?: string
): PlannerPost | null {
  const media = normalizeMedia(input.media_items, input.media_url, input.media_type);
  const existingRaw = input.id ? posts.find((p) => p.id === input.id) : null;
  const existing = assertPostOwner(existingRaw, ownerUserId);
  if (input.id && existingRaw && !existing) {
    return null;
  }

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
      campaigns:
        input.campaigns !== undefined ? input.campaigns : existing.campaigns ?? [],
      assignees: input.assignees ?? existing.assignees,
      subtasks: input.subtasks ?? existing.subtasks,
      auto_post: input.auto_post ?? existing.auto_post,
      owner_user_id: existing.owner_user_id || ownerUserId,
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

  const wsName = input.project ?? brandWorkspaces[0]?.name ?? 'Clikd Launch';

  const post: PlannerPost = {
    id: input.id?.trim() || `post-${++postSeq}`,
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
    campaigns: input.campaigns ?? [],
    assignees: input.assignees ?? (PLANNER_TEAM[0] ? [PLANNER_TEAM[0]] : []),
    subtasks: input.subtasks ?? [],
    auto_post: input.auto_post ?? false,
    activity: [
      act(`Content was created by ${actor} in ${wsName}`),
      act(`Status was set to ${workflow} by ${actor} in ${wsName}`),
    ],
    comments: [],
    created_at: new Date().toISOString(),
    created_by: actor,
    owner_user_id: ownerUserId,
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
  },
  ownerUserId?: string
): PlannerComment | null {
  const post = assertPostOwner(
    posts.find((p) => p.id === postId),
    ownerUserId
  );
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

export function deletePlannerPost(id: string, ownerUserId?: string): boolean {
  const idx = posts.findIndex((p) => p.id === id);
  if (idx < 0) return false;
  const target = posts[idx];
  if (
    ownerUserId &&
    target.owner_user_id &&
    target.owner_user_id !== ownerUserId
  ) {
    return false;
  }
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
      instagram: '@ebbacreator',
      tiktok: '@ebbacreator',
      linkedin: 'Ebba Brobeck',
      youtube: '@ebbacreator',
      facebook: 'Ebba Creator Lab',
      pinterest: '@ebbacreator',
    };
    const names: Record<SocialPlatform, string> = {
      instagram: 'Ebba Creator Lab',
      tiktok: 'Ebba Creator Lab',
      linkedin: 'Ebba Brobeck',
      youtube: 'clikd: Channel',
      facebook: 'Ebba Creator Lab',
      pinterest: 'Ebba Creator Lab',
    };
    acc.connected = true;
    acc.handle = handles[platform];
    acc.display_name = names[platform];
    acc.avatar_url =
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop&q=80';
    acc.connected_at = new Date().toISOString();
    acc.subscriber_count = platform === 'youtube' ? 12840 : null;
    acc.follower_count =
      platform === 'instagram'
        ? 48200
        : platform === 'tiktok'
          ? 39100
          : platform === 'facebook'
            ? 22400
            : null;
    acc.page_name =
      platform === 'instagram' || platform === 'facebook'
        ? 'Ebba Creator Lab'
        : platform === 'linkedin'
          ? 'clikd: AB'
          : null;
    acc.company_url =
      platform === 'linkedin' ? 'https://www.linkedin.com/company/clikd' : null;
  } else {
    acc.connected = false;
    acc.handle = null;
    acc.display_name = null;
    acc.avatar_url = null;
    acc.connected_at = null;
    acc.subscriber_count = null;
    acc.follower_count = null;
    acc.page_name = null;
    acc.company_url = null;
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
  facebook: {
    label: 'Facebook',
    color: '#1877F2',
    connectLabel: 'Connect Facebook Page',
  },
  pinterest: {
    label: 'Pinterest',
    color: '#E60023',
    connectLabel: 'Connect Pinterest Account',
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

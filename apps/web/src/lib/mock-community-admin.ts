/** Demo data for admin Community tab when DATABASE_URL is missing. */

import { MOCK_COMMENTS, MOCK_POSTS } from '@/lib/mock-demo-content';
import {
  applyCommentPinOverride,
  applyPostPinOverride,
} from '@/lib/demo-pin-state';
import type { BrandWorkspace, SocialPlatform } from '@/lib/mock-content-planner';
import {
  createWorkspaceProfile,
  updateWorkspaceCommunity,
} from '@/lib/mock-workspace-profiles';
import {
  managedToSearchable,
  publishCommunityToPublicCatalog,
} from '@/lib/public-communities-store';

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

let managedCommunitySeq = 200;
const NC_MANAGED_COMMUNITIES_KEY = 'nc_managed_communities_v1';

export type CommunityAdminMember = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: 'owner' | 'moderator' | 'member';
  joined_at: string;
};

export type CommunityAdminComment = {
  id: number;
  post_id: number;
  user_id: string;
  user_name: string;
  content: string;
  parent_id: number | null;
  media_url: string | null;
  media_type: string | null;
  is_pinned?: boolean;
  pinned_at?: string | null;
  created_at: string;
};

export type CommunityAdminPost = {
  id: number;
  user_id: string;
  user_name: string;
  user_image: string | null;
  content: string;
  tag: string | null;
  image_url: string | null;
  is_pinned?: boolean;
  pinned_at?: string | null;
  created_at: string;
  like_count: number;
  comment_count: number;
  community_id: number;
  comments: CommunityAdminComment[];
};

export type ManagedCommunity = {
  id: number;
  name: string;
  slug: string;
  description: string;
  category: string;
  cover_color: string;
  member_count: number;
  is_published: boolean;
  /** Brand / social handle shown in workspace switcher. */
  handle: string;
  avatar_url: string | null;
  /** Connected social channels for this team workspace. */
  channels: SocialPlatform[];
  /** Active brand workspace this community belongs to. */
  workspace_id?: string | null;
  is_free?: boolean;
  monthly_price_sek?: number;
  cover_url?: string | null;
};

export const MOCK_MANAGED_COMMUNITIES: ManagedCommunity[] = [];

function hydrateManagedCommunities() {
  if (typeof window === 'undefined') return;
  if (MOCK_MANAGED_COMMUNITIES.length > 0) return;
  try {
    const raw = localStorage.getItem(NC_MANAGED_COMMUNITIES_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as ManagedCommunity[];
    if (!Array.isArray(parsed) || parsed.length === 0) return;
    MOCK_MANAGED_COMMUNITIES.splice(0, MOCK_MANAGED_COMMUNITIES.length, ...parsed);
    const maxId = parsed.reduce((n, c) => Math.max(n, Number(c.id) || 0), 0);
    if (maxId >= managedCommunitySeq) managedCommunitySeq = maxId + 1;
  } catch {
    /* ignore */
  }
}

function persistManagedCommunities() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      NC_MANAGED_COMMUNITIES_KEY,
      JSON.stringify(MOCK_MANAGED_COMMUNITIES)
    );
  } catch {
    /* ignore quota */
  }
}

/** Map a managed community to the planner workspace shape for the shared selector. */
export function managedCommunityAsWorkspace(c: ManagedCommunity): BrandWorkspace {
  return {
    id: String(c.id),
    name: c.name,
    handle: c.handle,
    avatar_url: c.avatar_url,
    color: c.cover_color,
    channels: [...c.channels],
    created_at: new Date().toISOString(),
  };
}

export function listManagedCommunities(): ManagedCommunity[] {
  hydrateManagedCommunities();
  return MOCK_MANAGED_COMMUNITIES.map((c) => ({
    ...c,
    channels: [...c.channels],
  }));
}

export function createManagedCommunity(input: {
  name: string;
  handle?: string;
  channels?: SocialPlatform[];
  cover_color?: string;
  description?: string;
  /** Bind to an existing brand workspace instead of creating a new one. */
  workspaceId?: string | null;
  /** Skip creating/updating any workspace profile (API provisional create). */
  skipWorkspaceProfile?: boolean;
}): ManagedCommunity {
  hydrateManagedCommunities();
  const name = input.name.trim() || 'New community';
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9åäö\s-]/gi, '')
    .trim()
    .replace(/\s+/g, '-');
  let handle = (input.handle ?? '').trim() || `@${slug.replace(/-/g, '')}`;
  if (!handle.startsWith('@')) handle = `@${handle.replace(/^@/, '')}`;
  const colors = ['#0f766e', '#0369a1', '#E11D48', '#4F46E5', '#EA580C', '#2B2568'];
  const id = ++managedCommunitySeq;
  const community: ManagedCommunity = {
    id,
    name,
    slug: slug || `community-${id}`,
    description: input.description?.trim() || 'Your creator community.',
    category: 'Other',
    cover_color: input.cover_color || colors[id % colors.length],
    member_count: 1,
    is_published: true,
    handle,
    avatar_url: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(name)}`,
    channels:
      input.channels && input.channels.length > 0
        ? input.channels
        : ['instagram', 'tiktok', 'linkedin'],
    workspace_id: input.workspaceId ?? null,
    is_free: true,
    monthly_price_sek: 0,
    cover_url: null,
  };
  MOCK_MANAGED_COMMUNITIES.push(community);
  persistManagedCommunities();
  // Make the community discoverable for site users (search / join / about page).
  publishCommunityToPublicCatalog(
    managedToSearchable(community, { creatorName: community.name, isJoined: true })
  );

  if (!input.skipWorkspaceProfile) {
    if (input.workspaceId) {
      // Attach to the active brand workspace (Community tab empty-state create).
      updateWorkspaceCommunity(input.workspaceId, {
        community_id: community.id,
        community_name: community.name,
        total_members: 1,
        posts: 0,
        comments: 0,
        active_moderators: 0,
        recent_members: [],
      });
    } else {
      // Keep global Admin workspace profiles in sync with new team-ytor.
      createWorkspaceProfile({
        id: String(community.id),
        name: community.name,
        handle: community.handle,
        channels: community.channels,
        color: community.cover_color,
      });
    }
  }
  return { ...community, channels: [...community.channels] };
}

/** Upsert a managed community into the local demo registry (client persistence). */
export function registerManagedCommunity(community: ManagedCommunity): void {
  hydrateManagedCommunities();
  const idx = MOCK_MANAGED_COMMUNITIES.findIndex((c) => c.id === community.id);
  if (idx >= 0) MOCK_MANAGED_COMMUNITIES[idx] = { ...community, channels: [...community.channels] };
  else MOCK_MANAGED_COMMUNITIES.push({ ...community, channels: [...community.channels] });
  if (community.id >= managedCommunitySeq) managedCommunitySeq = community.id + 1;
  persistManagedCommunities();
  publishCommunityToPublicCatalog(
    managedToSearchable(community, { creatorName: community.name, isJoined: true })
  );
}

const MOCK_MEMBERS_101: CommunityAdminMember[] = [];

const MOCK_MEMBERS_102: CommunityAdminMember[] = [];
function postsForCommunity(communityId: number): CommunityAdminPost[] {
  // Lab gets welcome/wins/questions; Live Studio gets announcement-style posts.
  const ids = communityId === 102 ? [9005, 9004] : [9001, 9002, 9003, 9006];
  return MOCK_POSTS.filter((p) => ids.includes(p.id)).map((p) => {
    const comments = (MOCK_COMMENTS[p.id] ?? []).map((c) =>
      applyCommentPinOverride({
        id: Number(c.id),
        post_id: Number(c.post_id),
        user_id: String(c.user_id),
        user_name: String(c.user_name),
        content: String(c.content),
        parent_id: (c.parent_id as number | null) ?? null,
        media_url: (c.media_url as string | null | undefined) ?? null,
        media_type: (c.media_type as string | null | undefined) ?? null,
        is_pinned: Boolean(c.is_pinned),
        pinned_at: (c.pinned_at as string | null | undefined) ?? null,
        created_at: String(c.created_at),
      })
    );
    return applyPostPinOverride({
      ...p,
      community_id: communityId,
      is_pinned: Boolean(p.is_pinned),
      pinned_at: (p.pinned_at as string | null | undefined) ?? null,
      comments,
    });
  });
}

function sortPostsPinnedFirst(posts: CommunityAdminPost[]) {
  return [...posts].sort((a, b) => {
    const ap = a.is_pinned ? 1 : 0;
    const bp = b.is_pinned ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function getMockCommunityAdminPayload(communityId?: number) {
  hydrateManagedCommunities();
  const communities = MOCK_MANAGED_COMMUNITIES;
  const selected =
    communities.find((c) => c.id === communityId) ?? communities[0] ?? null;

  if (!selected) {
    return {
      communities: [] as ManagedCommunity[],
      community: null,
      overview: {
        member_count: 0,
        post_count: 0,
        comment_count: 0,
        joined_this_week: 0,
        moderator_count: 0,
        like_count: 0,
      },
      members: [] as CommunityAdminMember[],
      posts: [] as CommunityAdminPost[],
      demo: true as const,
    };
  }

  const members =
    selected.id === 102 ? MOCK_MEMBERS_102 : MOCK_MEMBERS_101;
  const posts = sortPostsPinnedFirst(postsForCommunity(selected.id));
  const commentTotal = posts.reduce((n, p) => n + p.comments.length, 0);
  const joinedThisWeek = members.filter(
    (m) => Date.now() - new Date(m.joined_at).getTime() < 7 * 24 * 60 * 60 * 1000
  ).length;

  return {
    communities,
    community: selected,
    overview: {
      member_count: members.length,
      post_count: posts.length,
      comment_count: commentTotal,
      joined_this_week: joinedThisWeek,
      moderator_count: members.filter((m) => m.role === 'moderator').length,
      like_count: posts.reduce((n, p) => n + p.like_count, 0),
    },
    members,
    posts,
    demo: true as const,
  };
}

/** Demo data for admin Community tab when DATABASE_URL is missing. */

import { MOCK_COMMENTS, MOCK_POSTS } from '@/lib/mock-demo-content';
import {
  applyCommentPinOverride,
  applyPostPinOverride,
} from '@/lib/demo-pin-state';
import type { BrandWorkspace, SocialPlatform } from '@/lib/mock-content-planner';
import { createWorkspaceProfile } from '@/lib/mock-workspace-profiles';

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

let managedCommunitySeq = 200;

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
};

export const MOCK_MANAGED_COMMUNITIES: ManagedCommunity[] = [
  {
    id: 101,
    name: 'Ebba Creator Lab',
    slug: 'ebba-creator-lab',
    description: 'Feed, kurser, events och medlemsfunktioner.',
    category: 'Marknadsföring',
    cover_color: '#0f766e',
    member_count: 48,
    is_published: true,
    handle: '@ebbacreator',
    avatar_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=ebba-creator-lab',
    channels: ['instagram', 'tiktok', 'linkedin', 'youtube'],
  },
  {
    id: 102,
    name: 'Ebba Live Studio',
    slug: 'ebba-live-studio',
    description: 'Live-webbinarier, RSVP och realtidschatt.',
    category: 'Coaching',
    cover_color: '#0369a1',
    member_count: 32,
    is_published: true,
    handle: '@ebbalive',
    avatar_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=ebba-live-studio',
    channels: ['instagram', 'linkedin', 'youtube'],
  },
];

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
}): ManagedCommunity {
  const name = input.name.trim() || 'Ny Team-yta';
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9åäö\s-]/gi, '')
    .trim()
    .replace(/\s+/g, '-');
  let handle = (input.handle ?? '').trim() || `@${slug.replace(/-/g, '')}`;
  if (!handle.startsWith('@')) handle = `@${handle.replace(/^@/, '')}`;
  const colors = ['#0f766e', '#0369a1', '#E11D48', '#4F46E5', '#EA580C'];
  const id = ++managedCommunitySeq;
  const community: ManagedCommunity = {
    id,
    name,
    slug: slug || `workspace-${id}`,
    description: 'Ny team-yta / varumärke.',
    category: 'Övrigt',
    cover_color: input.cover_color || colors[id % colors.length],
    member_count: 1,
    is_published: true,
    handle,
    avatar_url: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(name)}`,
    channels:
      input.channels && input.channels.length > 0
        ? input.channels
        : ['instagram', 'tiktok', 'linkedin'],
  };
  MOCK_MANAGED_COMMUNITIES.push(community);
  // Keep global Admin workspace profiles in sync with new team-ytor.
  createWorkspaceProfile({
    id: String(community.id),
    name: community.name,
    handle: community.handle,
    channels: community.channels,
    color: community.cover_color,
  });
  return { ...community, channels: [...community.channels] };
}

const MOCK_MEMBERS_101: CommunityAdminMember[] = [
  {
    id: 'ebba-demo',
    name: 'Ebba Brobeck',
    email: 'ebbabrobeck@test.se',
    image: null,
    role: 'owner',
    joined_at: daysAgo(90),
  },
  {
    id: 'seed-1',
    name: 'Emma Lindqvist',
    email: 'emma@example.com',
    image: null,
    role: 'moderator',
    joined_at: daysAgo(40),
  },
  {
    id: 'seed-2',
    name: 'Marcus Björk',
    email: 'marcus@example.com',
    image: null,
    role: 'member',
    joined_at: daysAgo(28),
  },
  {
    id: 'seed-3',
    name: 'Astrid Karlsson',
    email: 'astrid@example.com',
    image: null,
    role: 'member',
    joined_at: daysAgo(21),
  },
  {
    id: 'seed-5',
    name: 'Linn Petersson',
    email: 'linn@example.com',
    image: null,
    role: 'member',
    joined_at: daysAgo(12),
  },
  {
    id: 'seed-6',
    name: 'Johan Holm',
    email: 'johan@example.com',
    image: null,
    role: 'member',
    joined_at: daysAgo(7),
  },
  {
    id: 'seed-7',
    name: 'Sara Magnusson',
    email: 'sara@example.com',
    image: null,
    role: 'member',
    joined_at: daysAgo(3),
  },
];

const MOCK_MEMBERS_102: CommunityAdminMember[] = [
  {
    id: 'ebba-demo',
    name: 'Ebba Brobeck',
    email: 'ebbabrobeck@test.se',
    image: null,
    role: 'owner',
    joined_at: daysAgo(60),
  },
  {
    id: 'seed-2',
    name: 'Marcus Björk',
    email: 'marcus@example.com',
    image: null,
    role: 'moderator',
    joined_at: daysAgo(20),
  },
  {
    id: 'seed-8',
    name: 'Nora Ek',
    email: 'nora@example.com',
    image: null,
    role: 'member',
    joined_at: daysAgo(10),
  },
  {
    id: 'seed-9',
    name: 'Felix Åberg',
    email: 'felix@example.com',
    image: null,
    role: 'member',
    joined_at: daysAgo(4),
  },
];

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
  const communities = MOCK_MANAGED_COMMUNITIES;
  const selected =
    communities.find((c) => c.id === communityId) ?? communities[0];
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

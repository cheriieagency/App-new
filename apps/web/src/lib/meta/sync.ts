/**
 * Sync Meta Graph data into clikd: after OAuth — Analytics, Inbox, Planner.
 */

import {
  fetchInstagramAudienceDemographics,
  fetchInstagramDmConversations,
  fetchInstagramInsights,
  fetchInstagramMedia,
  fetchInstagramMediaComments,
  fetchInstagramProfile,
  type InstagramAudienceDemographics,
  type InstagramComment,
  type InstagramMediaItem,
} from '@/lib/meta/graph-api';
import { listStoredMetaAccounts } from '@/lib/meta/social-accounts';
import { upsertPlannerPost } from '@/lib/mock-content-planner';

export type MetaInboxChannel = 'comment' | 'dm';

export type MetaInboxThread = {
  id: string;
  channel: MetaInboxChannel;
  name: string;
  handle: string;
  preview: string;
  time: string;
  unread: boolean;
  media_id?: string;
  /** Instagram-scoped user id — required to reply to DMs. */
  recipient_id?: string;
  page_id?: string;
  messages: Array<{
    id: string;
    from: 'them' | 'you';
    text: string;
    time: string;
  }>;
};

export type MetaSyncSnapshot = {
  user_id: string;
  synced_at: string;
  instagram?: {
    id: string;
    username?: string;
    name?: string;
    profile_picture_url?: string;
    followers_count: number;
    media_count: number;
    biography?: string;
  };
  facebook_pages: Array<{ id: string; name: string }>;
  insights: {
    reach: number;
    impressions: number;
    profile_views: number;
    likes: number;
    comments: number;
    followers: number;
  };
  media: InstagramMediaItem[];
  inbox_threads: MetaInboxThread[];
  planner_imported: number;
  demographics?: InstagramAudienceDemographics | null;
};

const snapshots = new Map<string, MetaSyncSnapshot>();

export function getMetaSyncSnapshot(userId: string): MetaSyncSnapshot | null {
  return snapshots.get(userId) ?? null;
}

export function setMetaSyncSnapshot(
  userId: string,
  snapshot: MetaSyncSnapshot
): void {
  snapshots.set(userId, snapshot);
}

function relativeTime(iso?: string): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.round(ms / 60_000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

function commentsToThreads(
  media: InstagramMediaItem[],
  commentsByMedia: Map<string, InstagramComment[]>
): MetaInboxThread[] {
  const threads: MetaInboxThread[] = [];
  for (const item of media) {
    const comments = commentsByMedia.get(item.id) ?? [];
    for (const c of comments) {
      if (!c.text?.trim()) continue;
      const handle = c.username ? `@${c.username.replace(/^@/, '')}` : '@user';
      threads.push({
        id: c.id,
        channel: 'comment',
        name: c.username || 'Instagram user',
        handle,
        preview: c.text.slice(0, 120),
        time: relativeTime(c.timestamp),
        unread: true,
        media_id: item.id,
        messages: [
          {
            id: `${c.id}-m1`,
            from: 'them',
            text: c.text,
            time: relativeTime(c.timestamp),
          },
        ],
      });
    }
  }
  return threads.slice(0, 40);
}

function dmConversationsToThreads(
  pageId: string,
  igUserId: string,
  conversations: Awaited<ReturnType<typeof fetchInstagramDmConversations>>
): MetaInboxThread[] {
  return conversations.slice(0, 30).map((conv) => {
    const msgs = [...(conv.messages?.data ?? [])].reverse();
    const last = msgs[msgs.length - 1] || conv.messages?.data?.[0];
    const handle = conv.recipient_username
      ? `@${conv.recipient_username.replace(/^@/, '')}`
      : '@user';
    return {
      id: `dm:${conv.id}`,
      channel: 'dm' as const,
      name: conv.recipient_name || conv.recipient_username || 'Instagram user',
      handle,
      preview: (last?.message || 'Direct message').slice(0, 120),
      time: relativeTime(last?.created_time || conv.updated_time),
      unread: true,
      recipient_id: conv.recipient_id,
      page_id: pageId,
      messages: msgs
        .filter((m) => m.message?.trim())
        .map((m) => {
          const fromId = m.from?.id;
          const fromThem =
            Boolean(fromId) &&
            fromId !== pageId &&
            fromId !== igUserId;
          return {
            id: m.id,
            from: (fromThem ? 'them' : 'you') as 'them' | 'you',
            text: m.message || '',
            time: relativeTime(m.created_time),
          };
        }),
    };
  });
}

function importMediaToPlanner(media: InstagramMediaItem[], projectName: string): number {
  let imported = 0;
  for (const item of media) {
    const caption = item.caption ?? '';
    const title =
      caption.split('\n')[0]?.slice(0, 60) ||
      `IG ${item.media_type || 'post'} · ${item.id.slice(-6)}`;
    const isVideo =
      item.media_type === 'VIDEO' || item.media_type === 'REELS';
    const mediaUrl = item.media_url || item.thumbnail_url || null;
    try {
      upsertPlannerPost(
        {
          id: `meta-ig-${item.id}`,
          title,
          caption,
          platforms: ['instagram'],
          workflow: 'PUBLISHED',
          published_at: item.timestamp || new Date().toISOString(),
          scheduled_at: item.timestamp || null,
          media_url: mediaUrl,
          media_type: isVideo ? 'video' : 'image',
          media_items: mediaUrl
            ? [
                {
                  id: `meta-m-${item.id}`,
                  url: mediaUrl,
                  type: isVideo ? 'video' : 'image',
                },
              ]
            : [],
          project: projectName,
          campaigns: [],
          assignees: [],
          subtasks: [],
          auto_post: false,
        },
        'Meta sync'
      );
      imported += 1;
    } catch (error) {
      console.warn('[meta/sync] planner import skipped', item.id, error);
    }
  }
  return imported;
}

/**
 * Pull profile, insights, media, and comments for the user’s connected IG account
 * and seed Analytics / Inbox / Planner surfaces.
 */
export async function syncMetaDataForUser(userId: string): Promise<MetaSyncSnapshot> {
  const accounts = await listStoredMetaAccounts(userId);
  const ig = accounts.find((a) => a.platform === 'instagram');
  const fbPages = accounts
    .filter((a) => a.platform === 'facebook')
    .map((a) => ({ id: a.external_id, name: a.display_name || a.page_name || a.external_id }));

  const empty: MetaSyncSnapshot = {
    user_id: userId,
    synced_at: new Date().toISOString(),
    facebook_pages: fbPages,
    insights: {
      reach: 0,
      impressions: 0,
      profile_views: 0,
      likes: 0,
      comments: 0,
      followers: 0,
    },
    media: [],
    inbox_threads: [],
    planner_imported: 0,
  };

  if (!ig?.access_token || !ig.external_id) {
    snapshots.set(userId, empty);
    return empty;
  }

  let profile;
  let insights;
  let media: InstagramMediaItem[] = [];

  try {
    profile = await fetchInstagramProfile(ig.external_id, ig.access_token);
    if (profile) {
      const { updateStoredInstagramProfile } = await import(
        '@/lib/meta/social-accounts'
      );
      await updateStoredInstagramProfile({
        userId,
        externalId: ig.external_id,
        username: profile.username,
        displayName: profile.name || profile.username,
        avatarUrl: profile.profile_picture_url,
        followersCount: profile.followers_count ?? null,
        mediaCount: profile.media_count ?? null,
      });
    }
  } catch (error) {
    console.warn('[meta/sync] profile failed', error);
  }

  try {
    insights = await fetchInstagramInsights(ig.external_id, ig.access_token);
  } catch (error) {
    console.warn('[meta/sync] insights failed', error);
  }

  let demographics: InstagramAudienceDemographics | null = null;
  try {
    demographics = await fetchInstagramAudienceDemographics(
      ig.external_id,
      ig.access_token
    );
  } catch (error) {
    console.warn('[meta/sync] demographics failed', error);
  }

  try {
    media = await fetchInstagramMedia(ig.external_id, ig.access_token, 25);
  } catch (error) {
    console.warn('[meta/sync] media failed', error);
  }

  const commentsByMedia = new Map<string, InstagramComment[]>();
  await Promise.all(
    media.slice(0, 8).map(async (item) => {
      const comments = await fetchInstagramMediaComments(item.id, ig.access_token, 15);
      commentsByMedia.set(item.id, comments);
    })
  );

  // Instagram DMs require a Page access token + messaging scopes.
  let dmThreads: MetaInboxThread[] = [];
  const pageId = ig.page_id;
  const pageToken =
    accounts.find((a) => a.platform === 'facebook' && a.page_id === pageId)
      ?.access_token ||
    (pageId ? ig.access_token : null);
  if (pageId && pageToken) {
    try {
      const conversations = await fetchInstagramDmConversations(
        pageId,
        pageToken,
        20
      );
      dmThreads = dmConversationsToThreads(
        pageId,
        ig.external_id,
        conversations
      );
    } catch (error) {
      console.warn(
        '[meta/sync] Instagram DMs unavailable — reconnect with instagram_manage_messages',
        error
      );
    }
  }

  const commentThreads = commentsToThreads(media, commentsByMedia);
  // DMs first, then comments (newest activity still reflected by relative times).
  const inbox_threads = [...dmThreads, ...commentThreads].slice(0, 60);

  const likes = media.reduce((n, m) => n + (m.like_count ?? 0), 0);
  const comments = media.reduce((n, m) => n + (m.comments_count ?? 0), 0);
  const projectName =
    ig.page_name || ig.display_name || ig.handle || 'Instagram';
  const plannerImported = importMediaToPlanner(media, projectName);

  const snapshot: MetaSyncSnapshot = {
    user_id: userId,
    synced_at: new Date().toISOString(),
    instagram: profile
      ? {
          id: profile.id,
          username: profile.username,
          name: profile.name,
          profile_picture_url: profile.profile_picture_url,
          followers_count: profile.followers_count ?? 0,
          media_count: profile.media_count ?? media.length,
          biography: profile.biography,
        }
      : {
          id: ig.external_id,
          username: ig.handle?.replace(/^@/, ''),
          name: ig.display_name || undefined,
          profile_picture_url: ig.avatar_url || undefined,
          followers_count: ig.followers_count ?? 0,
          media_count: ig.media_count ?? media.length,
        },
    facebook_pages: fbPages,
    insights: {
      reach: insights?.reach ?? 0,
      impressions: insights?.impressions ?? 0,
      profile_views: insights?.profile_views ?? 0,
      likes,
      comments,
      followers:
        profile?.followers_count ?? ig.followers_count ?? 0,
    },
    media,
    inbox_threads,
    planner_imported: plannerImported,
    demographics,
  };

  snapshots.set(userId, snapshot);
  return snapshot;
}

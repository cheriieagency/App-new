/**
 * Sync Meta Graph data into clikd: after OAuth — Analytics, Inbox, Planner.
 */

import {
  fetchInstagramInsights,
  fetchInstagramMedia,
  fetchInstagramMediaComments,
  fetchInstagramProfile,
  type InstagramComment,
  type InstagramMediaItem,
} from '@/lib/meta/graph-api';
import { listStoredMetaAccounts } from '@/lib/meta/social-accounts';
import { upsertPlannerPost } from '@/lib/mock-content-planner';

export type MetaInboxThread = {
  id: string;
  name: string;
  handle: string;
  preview: string;
  time: string;
  unread: boolean;
  media_id?: string;
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
};

const snapshots = new Map<string, MetaSyncSnapshot>();

export function getMetaSyncSnapshot(userId: string): MetaSyncSnapshot | null {
  return snapshots.get(userId) ?? null;
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
  } catch (error) {
    console.warn('[meta/sync] profile failed', error);
  }

  try {
    insights = await fetchInstagramInsights(ig.external_id, ig.access_token);
  } catch (error) {
    console.warn('[meta/sync] insights failed', error);
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
          followers_count: 0,
          media_count: media.length,
        },
    facebook_pages: fbPages,
    insights: {
      reach: insights?.reach ?? 0,
      impressions: insights?.impressions ?? 0,
      profile_views: insights?.profile_views ?? 0,
      likes,
      comments,
      followers: profile?.followers_count ?? 0,
    },
    media,
    inbox_threads: commentsToThreads(media, commentsByMedia),
    planner_imported: plannerImported,
  };

  snapshots.set(userId, snapshot);
  return snapshot;
}

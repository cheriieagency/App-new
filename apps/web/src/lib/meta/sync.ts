/**
 * Sync Meta Graph data into clikd: after OAuth — Analytics, Inbox, Planner.
 */

import {
  debugMetaTokenScopes,
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
import { META_INBOX_DM_SCOPES } from '@/lib/meta/oauth';
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
    /** True when the connected IG account liked this comment. */
    liked?: boolean;
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
  /** Why Inbox may be empty — used by SocialInboxPanel banners. */
  inbox_status?: {
    media_scanned: number;
    comments_found: number;
    dms_found: number;
    page_id: string | null;
    dm_error?: string | null;
    missing_scopes?: string[];
    needs_reconnect_for_dms?: boolean;
  };
};

const snapshots = new Map<string, MetaSyncSnapshot>();

/** Prevent overlapping Graph fan-outs for the same user (live poll storms). */
const syncInFlight = new Map<string, Promise<MetaSyncSnapshot>>();

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
  commentsByMedia: Map<string, InstagramComment[]>,
  ownerUsernames: string[] = []
): MetaInboxThread[] {
  const ownerSet = new Set(
    ownerUsernames
      .map((u) => u.trim().replace(/^@/, '').toLowerCase())
      .filter(Boolean)
  );

  const isOwnerComment = (c: InstagramComment) => {
    const username = (c.username || c.from?.username || '')
      .replace(/^@/, '')
      .toLowerCase();
    return Boolean(username) && ownerSet.has(username);
  };

  const toMessage = (
    c: InstagramComment,
    fallbackId: string
  ): MetaInboxThread['messages'][number] | null => {
    if (!c.text?.trim()) return null;
    return {
      id: c.id || fallbackId,
      from: isOwnerComment(c) ? 'you' : 'them',
      text: c.text,
      time: relativeTime(c.timestamp),
    };
  };

  const threads: MetaInboxThread[] = [];
  for (const item of media) {
    const comments = commentsByMedia.get(item.id) ?? [];
    for (const c of comments) {
      if (!c.text?.trim()) continue;
      const handle = c.username ? `@${c.username.replace(/^@/, '')}` : '@user';
      const root = toMessage(c, `${c.id}-m1`);
      if (!root) continue;

      // Graph returns replies newest-first — show oldest → newest in the pane.
      const replyMsgs = [...(c.replies?.data ?? [])]
        .slice()
        .reverse()
        .map((r, i) => toMessage(r, `${c.id}-r${i}`))
        .filter((m): m is NonNullable<typeof m> => Boolean(m));

      const messages = [root, ...replyMsgs];
      const last = messages[messages.length - 1] ?? root;

      threads.push({
        id: c.id,
        channel: 'comment',
        name: c.username || 'Instagram user',
        handle,
        preview: last.text.slice(0, 120),
        time: last.time,
        unread: true,
        media_id: item.id,
        messages,
      });
    }
  }
  return threads.slice(0, 100);
}

function dmConversationsToThreads(
  pageId: string,
  igUserId: string,
  conversations: Awaited<ReturnType<typeof fetchInstagramDmConversations>>,
  ownerUsernames: string[] = []
): MetaInboxThread[] {
  const ownerSet = new Set(
    ownerUsernames
      .map((u) => u.trim().replace(/^@/, '').toLowerCase())
      .filter(Boolean)
  );

  return conversations.slice(0, 40).map((conv) => {
    const enriched = conv as typeof conv & { _self_ids?: string[] };
    const recipientId = conv.recipient_id ? String(conv.recipient_id) : '';
    const recipientUsername = (conv.recipient_username || '')
      .replace(/^@/, '')
      .toLowerCase();

    // Self = Page + IG business + messaging IGSID(s) from participants.
    const selfIds = new Set(
      [pageId, igUserId, ...(enriched._self_ids || [])]
        .filter(Boolean)
        .map((id) => String(id))
    );
    // Anyone in participants who isn't the fan is also self.
    for (const p of conv.participants?.data ?? []) {
      if (p.id && String(p.id) !== recipientId) selfIds.add(String(p.id));
    }

    // Sort by created_time — Graph order alone is unreliable after field changes.
    const msgs = [...(conv.messages?.data ?? [])].sort((a, b) => {
      const ta = Date.parse(a.created_time || '') || 0;
      const tb = Date.parse(b.created_time || '') || 0;
      return ta - tb;
    });
    const last = msgs[msgs.length - 1] || conv.messages?.data?.[0];
    const handle = conv.recipient_username
      ? `@${conv.recipient_username.replace(/^@/, '')}`
      : '@user';

    const mapped = msgs
      .map((m) => {
        const text = String(m.message || '').trim();
        // Keep unsupported/media rows as a stub so threads don't look one-sided.
        const displayText = text || '(attachment)';
        if (!m.id) return null;

        const fromId = m.from?.id ? String(m.from.id) : '';
        const fromUsername = (m.from?.username || '')
          .replace(/^@/, '')
          .toLowerCase();

        let from: 'them' | 'you';
        if (recipientId && fromId && fromId === recipientId) {
          from = 'them';
        } else if (fromId && selfIds.has(fromId)) {
          from = 'you';
        } else if (
          recipientUsername &&
          fromUsername &&
          fromUsername === recipientUsername
        ) {
          from = 'them';
        } else if (fromUsername && ownerSet.has(fromUsername)) {
          from = 'you';
        } else if (fromId && recipientId && fromId !== recipientId) {
          // Not the fan → treat as business (covers unknown messaging IGSID).
          from = 'you';
        } else if (
          fromId &&
          fromId !== pageId &&
          fromId !== igUserId &&
          !selfIds.has(fromId)
        ) {
          from = 'them';
        } else {
          from = 'you';
        }

        return {
          id: m.id,
          from,
          text: displayText,
          time: relativeTime(m.created_time),
        };
      })
      .filter((m): m is NonNullable<typeof m> => Boolean(m));

    // Prefer last text preview that isn't a stub when possible.
    const previewSrc =
      [...mapped].reverse().find((m) => m.text && m.text !== '(attachment)') ||
      mapped[mapped.length - 1];

    return {
      id: `dm:${conv.id}`,
      channel: 'dm' as const,
      name: conv.recipient_name || conv.recipient_username || 'Instagram user',
      handle,
      preview: (previewSrc?.text || last?.message || 'Direct message').slice(
        0,
        120
      ),
      time: relativeTime(last?.created_time || conv.updated_time),
      unread: true,
      recipient_id: conv.recipient_id,
      page_id: pageId,
      messages: mapped,
    };
  });
}

/** Keep recently-sent outbound DMs that Graph hasn't returned yet after a force sync. */
function mergeInboxThreadsPreservingOutbound(
  previous: MetaInboxThread[] | undefined,
  next: MetaInboxThread[]
): MetaInboxThread[] {
  if (!previous?.length) return next;
  const prevById = new Map(previous.map((t) => [t.id, t]));
  return next.map((thread) => {
    if (thread.channel !== 'dm') return thread;
    const prev = prevById.get(thread.id);
    if (!prev?.messages?.length) return thread;

    const nextIds = new Set(thread.messages.map((m) => m.id));
    const missingOutbound = prev.messages.filter((m) => {
      if (m.from !== 'you' || nextIds.has(m.id)) return false;
      if (String(m.id).startsWith('local-') || m.time === 'now') return true;
      // Preserve Graph-lagged sends for ~15 minutes of relative age.
      const mins = /^(\d+)m$/.exec(m.time || '');
      if (mins && Number(mins[1]) <= 15) return true;
      return false;
    });
    // Avoid dupes when Graph assigned a new mid for the same body.
    const nextYouTexts = new Set(
      thread.messages
        .filter((m) => m.from === 'you')
        .map((m) => m.text.trim().toLowerCase())
    );
    const toAdd = missingOutbound.filter(
      (m) => !nextYouTexts.has(m.text.trim().toLowerCase())
    );
    if (toAdd.length === 0) return thread;

    const messages = [...thread.messages, ...toAdd];
    const last = messages[messages.length - 1];
    return {
      ...thread,
      messages,
      preview: last?.text?.slice(0, 120) || thread.preview,
      time: last?.time || thread.time,
      unread: false,
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
 * Single-flight: concurrent callers share one Graph sync per user.
 */
export async function syncMetaDataForUser(userId: string): Promise<MetaSyncSnapshot> {
  const existing = syncInFlight.get(userId);
  if (existing) return existing;

  const run = runSyncMetaDataForUser(userId).finally(() => {
    syncInFlight.delete(userId);
  });
  syncInFlight.set(userId, run);
  return run;
}

async function runSyncMetaDataForUser(userId: string): Promise<MetaSyncSnapshot> {
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
    inbox_status: {
      media_scanned: 0,
      comments_found: 0,
      dms_found: 0,
      page_id: null,
      dm_error: 'Instagram not connected',
      needs_reconnect_for_dms: true,
    },
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
    // 12 recent posts is enough for Inbox + Analytics without a 25× Graph fan-out.
    media = await fetchInstagramMedia(ig.external_id, ig.access_token, 12);
  } catch (error) {
    console.warn('[meta/sync] media failed', error);
  }

  const commentsByMedia = new Map<string, InstagramComment[]>();
  // Cap parallel comment fetches — biggest live-sync cost.
  await Promise.all(
    media.slice(0, 12).map(async (item) => {
      const comments = await fetchInstagramMediaComments(
        item.id,
        ig.access_token,
        30
      );
      commentsByMedia.set(item.id, comments);
    })
  );

  // Instagram DMs require a Page access token + messaging scopes.
  let dmThreads: MetaInboxThread[] = [];
  let dmError: string | null = null;
  let missingScopes: string[] = [];
  let needsReconnectForDms = false;

  const fb = accounts.find((a) => a.platform === 'facebook');
  const pageId =
    ig.page_id ||
    fb?.page_id ||
    fb?.external_id ||
    null;
  const pageToken =
    (pageId &&
      accounts.find(
        (a) =>
          a.platform === 'facebook' &&
          (a.page_id === pageId || a.external_id === pageId)
      )?.access_token) ||
    fb?.access_token ||
    (pageId ? ig.access_token : null);

  if (!pageId) {
    dmError =
      'No Facebook Page linked to this Instagram account — reconnect under Settings → Socials.';
    needsReconnectForDms = true;
  } else if (!pageToken) {
    dmError = 'Missing Page access token — reconnect Facebook + Instagram.';
    needsReconnectForDms = true;
  } else {
    // Detect missing messaging scopes before (or after) the conversations call.
    const tokenInfo = await debugMetaTokenScopes(pageToken);
    missingScopes = META_INBOX_DM_SCOPES.filter(
      (scope) => !tokenInfo.scopes.includes(scope)
    );
    if (missingScopes.length > 0) {
      needsReconnectForDms = true;
      dmError = `Missing Meta permissions: ${missingScopes.join(', ')}. Reconnect Instagram and approve messaging.`;
    }

    try {
      const conversations = await fetchInstagramDmConversations(
        pageId,
        pageToken,
        40,
        ig.external_id
      );
      const dmOwnerNames = [
        profile?.username,
        ig.handle,
        ig.display_name,
      ].filter((v): v is string => Boolean(v && String(v).trim()));
      dmThreads = dmConversationsToThreads(
        pageId,
        ig.external_id,
        conversations,
        dmOwnerNames
      );
      if (dmThreads.length > 0) {
        dmError = null;
        needsReconnectForDms = false;
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Instagram DMs unavailable';
      console.warn(
        '[meta/sync] Instagram DMs unavailable — reconnect with instagram_manage_messages',
        error
      );
      dmError = msg;
      if (
        /instagram_manage_messages|pages_messaging|permission|OAuthException|#230/i.test(
          msg
        )
      ) {
        needsReconnectForDms = true;
      }
    }
  }

  const ownerUsernames = [
    profile?.username,
    ig.handle,
    ig.display_name,
  ].filter((v): v is string => Boolean(v && String(v).trim()));

  const commentThreads = commentsToThreads(
    media,
    commentsByMedia,
    ownerUsernames
  );
  // DMs first, then comments — preserve just-sent outbound that Graph lags on.
  const previous = snapshots.get(userId);
  const inbox_threads = mergeInboxThreadsPreservingOutbound(
    previous?.inbox_threads,
    [...dmThreads, ...commentThreads]
  ).slice(0, 120);

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
    inbox_status: {
      media_scanned: media.length,
      comments_found: commentThreads.length,
      dms_found: dmThreads.length,
      page_id: pageId,
      dm_error: dmError,
      missing_scopes: missingScopes,
      needs_reconnect_for_dms: needsReconnectForDms,
    },
  };

  snapshots.set(userId, snapshot);
  return snapshot;
}

/**
 * Shared planner publish pipeline — used by /api/planner/publish and /api/cron/publish.
 */

import sql from '@/app/api/utils/sql';
import {
  publishFacebookPagePost,
  publishInstagramPost,
  type InstagramMediaKind,
} from '@/lib/meta/graph-api';
import { publishLinkedInPost } from '@/lib/linkedin/publish';
import { createPinterestPin, listPinterestBoards } from '@/lib/pinterest/pins';
import { ensurePublicHttpsMediaUrl } from '@/lib/supabase/storage';
import { ensureFreshTikTokAccessToken } from '@/lib/tiktok/oauth';
import { getTikTokAccessTokenForWorkspace } from '@/lib/tiktok/inbox-persist';
import { getTikTokTokenForWorkspace } from '@/lib/tiktok/tokens-persist';
import { TIKTOK_POSTING_SCOPE_HELP, tikTokHasPostingScope } from '@/lib/tiktok/scopes';
import { publishTikTokPost } from '@/lib/tiktok/publish';
import { getYouTubeAccessTokenForWorkspace } from '@/lib/youtube/tokens';
import { publishYouTubeVideo } from '@/lib/youtube/publish';
import type { YoutubeMeta } from '@/lib/mock-content-planner';
import {
  ensurePlannerPostsSchema,
  getDurablePlannerPost,
  markPlannerPostPublishOutcome,
} from '@/lib/planner/posts';
import {
  parsePublishMode,
  type PublishMode,
} from '@/lib/planner/publish-modes';
import { createPublishReminderJob } from '@/lib/planner/publish-reminders';
import {
  normalizeCollaborators,
  normalizeOptionalText,
  normalizeOptionalUrl,
  normalizePostTags,
} from '@/lib/planner/more-options';
import { updateLinkInBioOnPublish } from '@/lib/planner/link-in-bio-on-publish';

export type PlatformPublishResult = {
  platform: string;
  ok: boolean;
  id?: string;
  error?: string;
  skipped?: boolean;
  note?: string;
};

export type PublishPlannerPostInput = {
  userId: string;
  workspaceId: string;
  postId?: string | null;
  platforms: string[];
  caption?: string;
  hashtags?: string;
  title?: string;
  mediaUrl?: string;
  mediaType?: string;
  extraImageUrls?: string[];
  mediaUrls?: string[];
  youtube?: YoutubeMeta | null;
  pinterestBoardId?: string;
  link?: string;
  /** Rella-style publish workflow. */
  publishMode?: PublishMode;
  trendingSoundNote?: string;
  collaborators?: string[];
  firstComment?: string | null;
  locationName?: string | null;
  locationId?: string | null;
  linkInBioUrl?: string | null;
  postTags?: string[];
  campaignTag?: string | null;
};

export type PublishPlannerPostResult = {
  ok: boolean;
  results: PlatformPublishResult[];
  published_count: number;
  failed_count: number;
  message: string;
  error_log: string | null;
  publish_mode?: PublishMode;
  reminder?: {
    id: string;
    deepLinks: { instagram: string; tiktok: string };
    mediaUrls: string[];
    caption: string;
    trendingSoundNote: string | null;
  };
};

type SocialAccountRow = {
  platform_user_id: string | null;
  page_id: string | null;
  access_token: string;
  meta: Record<string, unknown>;
};

async function loadAccount(
  userId: string,
  workspaceId: string,
  platform: string
): Promise<SocialAccountRow | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  const rows = await sql`
    SELECT platform_user_id, page_id, access_token, meta, user_id
    FROM public.social_accounts
    WHERE user_id = ${userId}
      AND workspace_id = ${workspaceId}
      AND platform = ${platform}
      AND access_token IS NOT NULL
      AND access_token <> ''
    LIMIT 1
  `;
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row?.access_token) return null;
  return {
    platform_user_id: row.platform_user_id
      ? String(row.platform_user_id)
      : null,
    page_id: row.page_id != null ? String(row.page_id) : null,
    access_token: String(row.access_token),
    meta:
      row.meta && typeof row.meta === 'object'
        ? (row.meta as Record<string, unknown>)
        : {},
  };
}

/** Login Kit tokens can Direct Post; Business Marketing tokens cannot. */
async function loadTikTokPublishToken(
  userId: string,
  workspaceId: string
): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  scope: string | null;
} | null> {
  const stored = await getTikTokTokenForWorkspace({
    workspaceId,
    userId,
    tokenSource: 'login_kit',
  });
  const social = await getTikTokAccessTokenForWorkspace({ workspaceId, userId });

  const usable = (token?: string | null) =>
    Boolean(token?.trim()) && !token!.startsWith('mock_');

  if (stored && usable(stored.access_token)) {
    return {
      accessToken: stored.access_token,
      refreshToken: stored.refresh_token,
      expiresAt: stored.expires_at,
      scope: stored.scope,
    };
  }

  if (usable(social?.accessToken)) {
    return {
      accessToken: social!.accessToken,
      refreshToken: social!.refreshToken,
      expiresAt: social!.expiresAt,
      scope: stored?.scope ?? null,
    };
  }

  return null;
}

async function publishFacebookFeed(
  pageId: string,
  pageAccessToken: string,
  message: string
): Promise<{ id: string }> {
  const url = new URL(
    `https://graph.facebook.com/v19.0/${encodeURIComponent(pageId)}/feed`
  );
  url.searchParams.set('message', message);
  url.searchParams.set('access_token', pageAccessToken);
  const res = await fetch(url.toString(), { method: 'POST' });
  const data = (await res.json()) as {
    id?: string;
    error?: { message?: string };
  };
  if (!res.ok || data.error || !data.id) {
    throw new Error(data.error?.message || `Facebook feed failed (${res.status})`);
  }
  return { id: data.id };
}

function inferMediaKind(
  rawUrl: string,
  mediaTypeRaw: string
): InstagramMediaKind {
  if (mediaTypeRaw === 'video') return 'video';
  if (mediaTypeRaw === 'image') return 'image';
  return /\.(mp4|mov|m4v|webm)(\?|#|$)/i.test(rawUrl) ? 'video' : 'image';
}

function buildErrorLog(results: PlatformPublishResult[]): string | null {
  const failures = results.filter((r) => !r.ok && !r.skipped);
  if (failures.length === 0) return null;
  return failures
    .map((r) => `${r.platform}: ${r.error || 'unknown error'}`)
    .join('\n');
}

/** Publish to all requested platforms for a workspace. */
export async function publishPlannerPost(
  input: PublishPlannerPostInput
): Promise<PublishPlannerPostResult> {
  const platforms = input.platforms.map((p) => String(p).toLowerCase());
  const caption = String(input.caption || '').trim();
  const hashtags = String(input.hashtags || '').trim();
  const fullCaption = [caption, hashtags].filter(Boolean).join('\n\n');
  const title = String(input.title || '').trim();
  const rawMediaUrl = String(input.mediaUrl || '').trim();
  const mediaTypeRaw = String(input.mediaType || '').toLowerCase();

  if (!fullCaption && !rawMediaUrl && !platforms.includes('facebook')) {
    return {
      ok: false,
      results: [],
      published_count: 0,
      failed_count: 0,
      message: 'Caption or media is required to publish',
      error_log: 'Caption or media is required to publish',
    };
  }

  let publicMediaUrl = '';
  let mediaKind: InstagramMediaKind = 'image';
  if (rawMediaUrl) {
    try {
      publicMediaUrl = await ensurePublicHttpsMediaUrl(rawMediaUrl);
      mediaKind = inferMediaKind(publicMediaUrl, mediaTypeRaw);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Invalid media URL';
      return {
        ok: false,
        results: [],
        published_count: 0,
        failed_count: 0,
        message,
        error_log: message,
      };
    }
  }

  const publishMode = parsePublishMode(input.publishMode);
  const trendingSoundNote = String(input.trendingSoundNote || '').trim();
  const mediaUrls = Array.from(
    new Set(
      [
        ...(Array.isArray(input.mediaUrls) ? input.mediaUrls : []),
        ...(Array.isArray(input.extraImageUrls) ? input.extraImageUrls : []),
        publicMediaUrl,
      ]
        .map((u) => String(u || '').trim())
        .filter(Boolean)
    )
  );

  // Rella notification mode — create a reminder job, do not auto-publish.
  if (publishMode === 'notification_reminder') {
    try {
      const job = await createPublishReminderJob({
        workspaceId: input.workspaceId,
        userId: input.userId,
        postId: input.postId,
        caption: fullCaption || title,
        trendingSoundNote: trendingSoundNote || null,
        mediaUrls,
        platforms,
        scheduledAt: null,
      });
      return {
        ok: true,
        results: platforms.map((platform) => ({
          platform,
          ok: true,
          skipped: true,
          note: 'Manual push reminder created — use deep links to post with trending sound.',
        })),
        published_count: 0,
        failed_count: 0,
        message:
          'Reminder saved. Download your media, copy the caption, and open Instagram/TikTok to post with your trending sound.',
        error_log: null,
        publish_mode: publishMode,
        reminder: {
          id: job.id,
          deepLinks: job.deepLinks,
          mediaUrls: job.mediaUrls,
          caption: job.caption,
          trendingSoundNote: job.trendingSoundNote,
        },
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to create publish reminder';
      return {
        ok: false,
        results: [],
        published_count: 0,
        failed_count: 0,
        message,
        error_log: message,
        publish_mode: publishMode,
      };
    }
  }

  // TikTok Draft — only upload to TikTok inbox/drafts.
  if (publishMode === 'tiktok_draft') {
    const draftPlatforms = platforms.includes('tiktok')
      ? ['tiktok']
      : platforms;
    // Reuse the normal loop below with publishMode flag for TikTok asDraft.
    // Force platforms to tiktok when draft mode is selected.
    if (!draftPlatforms.includes('tiktok')) {
      return {
        ok: false,
        results: [],
        published_count: 0,
        failed_count: 0,
        message: 'TikTok Draft mode requires TikTok as a selected platform.',
        error_log: 'TikTok Draft mode requires TikTok as a selected platform.',
        publish_mode: publishMode,
      };
    }
  }

  const results: PlatformPublishResult[] = [];
  const effectivePlatforms =
    publishMode === 'tiktok_draft' ? ['tiktok'] : platforms;

  for (const platform of effectivePlatforms) {
    try {
      if (platform === 'pinterest') {
        if (!publicMediaUrl || mediaKind === 'video') {
          results.push({
            platform,
            ok: false,
            error:
              'Pinterest requires an image. Add a photo with a public HTTPS URL.',
          });
          continue;
        }

        const account = await loadAccount(
          input.userId,
          input.workspaceId,
          'pinterest'
        );
        if (!account) {
          results.push({
            platform,
            ok: false,
            error:
              'No connected Pinterest account for this workspace. Connect under Settings → Socials.',
          });
          continue;
        }

        let boardId = String(input.pinterestBoardId || '').trim();
        if (!boardId) {
          const boards = await listPinterestBoards(account.access_token);
          boardId = boards[0]?.id ?? '';
        }
        if (!boardId) {
          results.push({
            platform,
            ok: false,
            error: 'No Pinterest boards found for this account',
          });
          continue;
        }

        const pin = await createPinterestPin({
          accessToken: account.access_token,
          boardId,
          title: title || caption.slice(0, 100) || 'Pin',
          description: fullCaption || undefined,
          link: input.link?.trim() || null,
          imageUrl: publicMediaUrl,
        });
        results.push({ platform, ok: true, id: pin.id });
        continue;
      }

      if (platform === 'linkedin') {
        const account = await loadAccount(
          input.userId,
          input.workspaceId,
          'linkedin'
        );
        if (!account?.platform_user_id) {
          results.push({
            platform,
            ok: false,
            error:
              'No connected LinkedIn account for this workspace. Connect under Settings → Socials.',
          });
          continue;
        }

        const published = await publishLinkedInPost({
          accessToken: account.access_token,
          personId: account.platform_user_id,
          text: fullCaption || title,
          mediaUrl: publicMediaUrl || undefined,
          kind:
            publicMediaUrl && mediaKind === 'video'
              ? 'video'
              : publicMediaUrl
                ? 'image'
                : 'text',
        });
        results.push({ platform, ok: true, id: published.id });
        continue;
      }

      if (platform === 'youtube') {
        if (!publicMediaUrl || mediaKind !== 'video') {
          results.push({
            platform,
            ok: false,
            error:
              'YouTube requires a video with a public HTTPS URL.',
          });
          continue;
        }

        const accessToken = await getYouTubeAccessTokenForWorkspace({
          userId: input.userId,
          workspaceId: input.workspaceId,
        });
        if (!accessToken) {
          results.push({
            platform,
            ok: false,
            error:
              'No connected YouTube account for this workspace. Connect under Settings → Socials.',
          });
          continue;
        }

        const published = await publishYouTubeVideo({
          accessToken,
          videoUrl: publicMediaUrl,
          title: input.youtube?.title || title || caption.slice(0, 80) || 'Video',
          description: fullCaption,
          youtube: input.youtube ?? null,
        });
        results.push({ platform, ok: true, id: published.id });
        continue;
      }

      if (platform === 'tiktok') {
        if (!publicMediaUrl) {
          results.push({
            platform,
            ok: false,
            error:
              'TikTok requires media. Add a photo or video with a public HTTPS URL.',
          });
          continue;
        }

        const tokenRow = await loadTikTokPublishToken(
          input.userId,
          input.workspaceId
        );
        if (!tokenRow) {
          results.push({
            platform,
            ok: false,
            error:
              'No connected TikTok account with Content Posting. Connect TikTok under Settings → Socials (Login Kit with video.publish). Business Marketing tokens cannot publish organic posts.',
          });
          continue;
        }

        if (tokenRow.scope && !tikTokHasPostingScope(tokenRow.scope)) {
          results.push({
            platform,
            ok: false,
            error: TIKTOK_POSTING_SCOPE_HELP,
          });
          continue;
        }

        const accessToken = await ensureFreshTikTokAccessToken({
          userId: input.userId,
          workspaceId: input.workspaceId,
          accessToken: tokenRow.accessToken,
          refreshToken: tokenRow.refreshToken,
          expiresAt: tokenRow.expiresAt,
        });

        const extraImageUrls: string[] = [];
        for (const extra of input.extraImageUrls || []) {
          try {
            extraImageUrls.push(await ensurePublicHttpsMediaUrl(extra));
          } catch {
            /* skip non-public extras */
          }
        }

        const published = await publishTikTokPost({
          accessToken,
          mediaUrl: publicMediaUrl,
          caption: fullCaption || title,
          kind: mediaKind,
          extraImageUrls,
          asDraft: publishMode === 'tiktok_draft',
        });
        results.push({
          platform,
          ok: true,
          id: published.id,
          note:
            publishMode === 'tiktok_draft' || published.inbox
              ? 'Saved to TikTok drafts / inbox — open the TikTok app to finish posting.'
              : undefined,
        });
        continue;
      }

      if (!['instagram', 'facebook'].includes(platform)) {
        results.push({
          platform,
          ok: false,
          skipped: true,
          error: `${platform} live publish is not enabled yet`,
        });
        continue;
      }

      const account = await loadAccount(
        input.userId,
        input.workspaceId,
        platform
      );
      if (!account) {
        results.push({
          platform,
          ok: false,
          error: `No connected ${platform} account for this workspace. Connect under Settings → Socials.`,
        });
        continue;
      }

      const pageToken =
        (typeof account.meta.page_access_token === 'string' &&
          account.meta.page_access_token.trim()) ||
        account.access_token;

      if (platform === 'instagram') {
        if (!publicMediaUrl) {
          results.push({
            platform,
            ok: false,
            error:
              'Instagram requires media. Add a photo or video with a public HTTPS URL.',
          });
          continue;
        }
        const igId = account.platform_user_id;
        if (!igId) {
          results.push({
            platform,
            ok: false,
            error: 'Instagram Business account id missing — reconnect Meta.',
          });
          continue;
        }
        const published = await publishInstagramPost(
          igId,
          pageToken,
          publicMediaUrl,
          fullCaption || title,
          {
            mediaKind,
            collaborators: normalizeCollaborators(input.collaborators),
            locationId: normalizeOptionalText(input.locationId, 64),
            firstComment: normalizeOptionalText(input.firstComment, 2200),
          }
        );
        results.push({
          platform,
          ok: true,
          id: published.id,
          note: published.firstCommentError
            ? `Published; first comment failed: ${published.firstCommentError}`
            : published.firstCommentId
              ? 'Published with first comment'
              : undefined,
        });
        continue;
      }

      // Facebook Page
      const pageId = account.page_id || account.platform_user_id;
      if (!pageId) {
        results.push({
          platform,
          ok: false,
          error: 'Facebook Page id missing — reconnect Meta.',
        });
        continue;
      }

      if (publicMediaUrl) {
        const published = await publishFacebookPagePost(
          pageId,
          pageToken,
          publicMediaUrl,
          fullCaption || title
        );
        results.push({ platform, ok: true, id: published.id });
      } else {
        const published = await publishFacebookFeed(
          pageId,
          pageToken,
          fullCaption || title
        );
        results.push({ platform, ok: true, id: published.id });
      }
    } catch (error) {
      console.error(`[planner/publish] ${platform} failed`, error);
      results.push({
        platform,
        ok: false,
        error: error instanceof Error ? error.message : 'Publish failed',
      });
    }
  }

  const published = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok && !r.skipped);
  const error_log = buildErrorLog(results);
  const allTargetsSucceeded = failed.length === 0 && published.length > 0;
  const inboxNote = results.find((r) => r.note)?.note;

  const linkInBioUrl = normalizeOptionalUrl(input.linkInBioUrl);
  if (published.length > 0 && linkInBioUrl) {
    try {
      await updateLinkInBioOnPublish({
        workspaceId: input.workspaceId,
        userId: input.userId,
        destinationUrl: linkInBioUrl,
        title: title || 'Planner spotlight',
      });
    } catch (error) {
      console.warn('[planner/publish] link-in-bio update failed', error);
    }
  }

  return {
    ok: allTargetsSucceeded,
    results,
    published_count: published.length,
    failed_count: failed.length,
    message: allTargetsSucceeded
      ? inboxNote ||
        (publishMode === 'tiktok_draft'
          ? 'Uploaded to TikTok drafts'
          : `Published to ${published.map((r) => r.platform).join(', ')}`)
      : failed[0]?.error || published.length > 0
        ? `Some platforms failed: ${failed.map((r) => r.platform).join(', ')}`
        : 'Nothing was published',
    error_log,
    publish_mode: publishMode,
  };
}

/** Load post from DB and publish all selected platforms. */
export async function publishPlannerPostById(input: {
  postId: string;
  userId: string;
  workspaceId: string;
  platformsOverride?: string[];
}): Promise<PublishPlannerPostResult> {
  const post = await getDurablePlannerPost({
    id: input.postId,
    userId: input.userId,
  });
  if (!post) {
    return {
      ok: false,
      results: [],
      published_count: 0,
      failed_count: 0,
      message: 'Post not found',
      error_log: 'Post not found',
    };
  }

  const primaryMedia =
    post.media_items.find((m) => m.url) || post.media_items[0] || null;
  const mediaUrl = primaryMedia?.url || post.media_url || '';
  const mediaType =
    primaryMedia?.type ||
    (post.media_type === 'video' ? 'video' : 'image');
  const extraImageUrls = post.media_items
    .filter((m) => m.url && m.type !== 'video' && m.url !== mediaUrl)
    .map((m) => m.url);

  return publishPlannerPost({
    userId: input.userId,
    workspaceId: input.workspaceId,
    postId: input.postId,
    platforms:
      input.platformsOverride?.length
        ? input.platformsOverride
        : post.platforms,
    caption: post.caption,
    hashtags: post.hashtags,
    title: post.title,
    mediaUrl,
    mediaType,
    extraImageUrls,
    mediaUrls: post.media_urls?.length
      ? post.media_urls
      : post.media_items.map((m) => m.url).filter(Boolean),
    youtube: post.youtube ?? null,
    publishMode: parsePublishMode(post.publish_mode),
    trendingSoundNote: post.trending_sound_note || undefined,
    collaborators: post.collaborators ?? [],
    firstComment: post.first_comment ?? null,
    locationName: post.location_name ?? null,
    locationId: post.location_id ?? null,
    linkInBioUrl: post.link_in_bio_url ?? null,
    postTags: post.post_tags ?? [],
    campaignTag: post.campaign_tag ?? null,
  });
}

/** Publish and persist workflow/status on the planner_posts row. */
export async function publishAndFinalizePlannerPost(
  input: PublishPlannerPostInput
): Promise<PublishPlannerPostResult> {
  const result = await publishPlannerPost(input);
  const mode = result.publish_mode || parsePublishMode(input.publishMode);

  if (input.postId?.trim() && process.env.DATABASE_URL?.trim()) {
    await ensurePlannerPostsSchema();
    const activityText =
      mode === 'notification_reminder'
        ? 'Manual push reminder created (trending sound workflow)'
        : mode === 'tiktok_draft'
          ? 'Uploaded to TikTok drafts / inbox'
          : result.ok
            ? `Published to ${result.results.filter((r) => r.ok).map((r) => r.platform).join(', ')}`
            : `Publish failed: ${result.error_log || result.message}`;
    await markPlannerPostPublishOutcome({
      postId: input.postId.trim(),
      userId: input.userId,
      success: result.ok,
      errorLog: result.error_log,
      activityText,
      successWorkflow:
        mode === 'notification_reminder'
          ? 'READY'
          : mode === 'tiktok_draft'
            ? 'READY'
            : 'PUBLISHED',
    });
  }

  return result;
}

export type DueScheduledPlannerPost = {
  id: string;
  user_id: string;
  workspace_id: string;
  platforms: string[];
  caption: string;
  hashtags: string;
  title: string;
  media_url: string | null;
  media_type: string | null;
  media_items: Array<{ url: string; type: string }>;
  media_urls: string[];
  publish_mode: PublishMode;
  trending_sound_note: string | null;
  collaborators: string[];
  first_comment: string | null;
  location_name: string | null;
  location_id: string | null;
  link_in_bio_url: string | null;
  post_tags: string[];
  campaign_tag: string | null;
  youtube: YoutubeMeta | null;
};

/** Atomically claim due scheduled posts so concurrent cron runs do not double-publish. */
export async function claimDueScheduledPlannerPosts(
  limit = 20
): Promise<DueScheduledPlannerPost[]> {
  if (!process.env.DATABASE_URL?.trim()) return [];
  await ensurePlannerPostsSchema();

  const rows = await sql`
    UPDATE public.planner_posts
    SET workflow = 'IN_PROGRESS', updated_at = now()
    WHERE id IN (
      SELECT id
      FROM public.planner_posts
      WHERE workflow = 'SCHEDULED'
        AND auto_post = true
        AND scheduled_at IS NOT NULL
        AND scheduled_at <= now()
      ORDER BY scheduled_at ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING
      id,
      user_id,
      workspace_id,
      platforms,
      caption,
      hashtags,
      title,
      media_url,
      media_type,
      media_items,
      media_urls,
      publish_mode,
      trending_sound_note,
      collaborators,
      first_comment,
      location_name,
      location_id,
      link_in_bio_url,
      post_tags,
      campaign_tag,
      youtube
  `;

  return (Array.isArray(rows) ? rows : []).map((row) => {
    const r = row as Record<string, unknown>;
    const platforms = Array.isArray(r.platforms)
      ? (r.platforms as unknown[]).map((p) => String(p).toLowerCase())
      : [];
    const mediaItems = Array.isArray(r.media_items)
      ? (r.media_items as Array<Record<string, unknown>>)
          .map((m) => ({
            url: String(m.url ?? ''),
            type: m.type === 'video' ? 'video' : 'image',
          }))
          .filter((m) => m.url)
      : [];
    const mediaUrls = Array.isArray(r.media_urls)
      ? (r.media_urls as unknown[]).map((u) => String(u)).filter(Boolean)
      : mediaItems.map((m) => m.url);

    return {
      id: String(r.id),
      user_id: String(r.user_id),
      workspace_id: String(r.workspace_id ?? ''),
      platforms,
      caption: String(r.caption ?? ''),
      hashtags: String(r.hashtags ?? ''),
      title: String(r.title ?? ''),
      media_url: r.media_url ? String(r.media_url) : null,
      media_type: r.media_type ? String(r.media_type) : null,
      media_items: mediaItems,
      media_urls: mediaUrls,
      publish_mode: parsePublishMode(r.publish_mode),
      trending_sound_note:
        typeof r.trending_sound_note === 'string'
          ? r.trending_sound_note
          : null,
      collaborators: normalizeCollaborators(r.collaborators),
      first_comment:
        typeof r.first_comment === 'string' ? r.first_comment : null,
      location_name:
        typeof r.location_name === 'string' ? r.location_name : null,
      location_id: typeof r.location_id === 'string' ? r.location_id : null,
      link_in_bio_url:
        typeof r.link_in_bio_url === 'string' ? r.link_in_bio_url : null,
      post_tags: normalizePostTags(r.post_tags),
      campaign_tag:
        typeof r.campaign_tag === 'string' ? r.campaign_tag : null,
      youtube: (r.youtube as YoutubeMeta | null) ?? null,
    };
  });
}

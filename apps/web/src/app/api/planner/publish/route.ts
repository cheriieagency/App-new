/**
 * POST /api/planner/publish
 * Publish a planner post to connected social accounts for the active workspace.
 * Instagram: image + video/reels (container → poll → publish).
 * TikTok: photo + video via PULL_FROM_URL.
 * Facebook Page: photo or text feed.
 */

import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
} from '@/lib/social/persist';
import { resolveStrictUserWorkspace } from '@/lib/social/resolve-user-workspace';
import {
  publishFacebookPagePost,
  publishInstagramPost,
  type InstagramMediaKind,
} from '@/lib/meta/graph-api';
import { ensurePublicHttpsMediaUrl } from '@/lib/supabase/storage';
import { ensureFreshTikTokAccessToken } from '@/lib/tiktok/oauth';
import { getTikTokAccessTokenForWorkspace } from '@/lib/tiktok/inbox-persist';
import { getTikTokTokenForWorkspace } from '@/lib/tiktok/tokens-persist';
import { publishTikTokPost } from '@/lib/tiktok/publish';

type PublishBody = {
  workspaceId?: unknown;
  platforms?: unknown;
  caption?: unknown;
  hashtags?: unknown;
  imageUrl?: unknown;
  mediaUrl?: unknown;
  videoUrl?: unknown;
  mediaType?: unknown;
  title?: unknown;
};

type PlatformResult = {
  platform: string;
  ok: boolean;
  id?: string;
  error?: string;
  skipped?: boolean;
};

async function loadAccount(
  userId: string,
  workspaceId: string,
  platform: string
): Promise<{
  platform_user_id: string | null;
  page_id: string | null;
  access_token: string;
  meta: Record<string, unknown>;
} | null> {
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

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id?.trim();
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: PublishBody = {};
    try {
      body = (await request.json()) as PublishBody;
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const jar = await cookies();
    const workspaceId =
      (typeof body.workspaceId === 'string' && body.workspaceId.trim()) ||
      request.headers.get('x-workspace-id')?.trim() ||
      jar.get(ACTIVE_WORKSPACE_COOKIE)?.value ||
      jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value ||
      null;

    if (!workspaceId) {
      return Response.json({ error: 'workspaceId required' }, { status: 400 });
    }

    const access = await resolveStrictUserWorkspace({
      userId,
      preferredWorkspaceId: workspaceId,
      email: session?.user?.email ?? null,
    });
    if (!access.ok) {
      return Response.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const platforms = Array.isArray(body.platforms)
      ? body.platforms.map((p) => String(p).toLowerCase())
      : [];
    if (platforms.length === 0) {
      return Response.json(
        { error: 'Select at least one platform' },
        { status: 400 }
      );
    }

    const caption = String(body.caption || '').trim();
    const hashtags = String(body.hashtags || '').trim();
    const fullCaption = [caption, hashtags].filter(Boolean).join('\n\n');
    const title = String(body.title || '').trim();
    const rawMediaUrl = String(
      body.mediaUrl || body.imageUrl || body.videoUrl || ''
    ).trim();
    const mediaTypeRaw = String(body.mediaType || '').toLowerCase();

    if (!fullCaption && !rawMediaUrl) {
      return Response.json(
        { error: 'Caption or media is required to publish' },
        { status: 400 }
      );
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
        return Response.json({ error: message, ok: false }, { status: 400 });
      }
    }

    const results: PlatformResult[] = [];

    for (const platform of platforms) {
      if (!['instagram', 'facebook', 'tiktok'].includes(platform)) {
        results.push({
          platform,
          ok: false,
          skipped: true,
          error: `${platform} live publish is not enabled yet — saved in planner only`,
        });
        continue;
      }

      try {
        const account = await loadAccount(
          userId,
          access.workspaceId,
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
                'Instagram requires media. Add a photo or video with a public HTTPS URL, then Post again.',
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
            mediaKind
          );
          results.push({ platform, ok: true, id: published.id });
          continue;
        }

        if (platform === 'tiktok') {
          if (!publicMediaUrl) {
            results.push({
              platform,
              ok: false,
              error:
                'TikTok requires media. Add a photo or video with a public HTTPS URL, then Post again.',
            });
            continue;
          }

          const bizToken = await getTikTokTokenForWorkspace({
            workspaceId: access.workspaceId,
            userId,
          });
          const socialToken = await getTikTokAccessTokenForWorkspace({
            workspaceId: access.workspaceId,
            userId,
          });
          const tokenRow = bizToken?.access_token
            ? {
                accessToken: bizToken.access_token,
                refreshToken: bizToken.refresh_token,
                expiresAt: bizToken.expires_at,
              }
            : socialToken;

          if (!tokenRow?.accessToken || tokenRow.accessToken.startsWith('mock_')) {
            results.push({
              platform,
              ok: false,
              error: 'Connect TikTok with Content Posting permissions first.',
            });
            continue;
          }

          const accessToken = await ensureFreshTikTokAccessToken({
            userId,
            workspaceId: access.workspaceId,
            accessToken: tokenRow.accessToken,
            refreshToken: tokenRow.refreshToken,
            expiresAt: tokenRow.expiresAt,
          });

          const published = await publishTikTokPost({
            accessToken,
            mediaUrl: publicMediaUrl,
            caption: fullCaption || title,
            kind: mediaKind,
          });
          results.push({ platform, ok: true, id: published.id });
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
          error:
            error instanceof Error ? error.message : 'Publish failed',
        });
      }
    }

    const published = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok && !r.skipped);

    return Response.json({
      ok: published.length > 0,
      workspace_id: workspaceId,
      results,
      published_count: published.length,
      failed_count: failed.length,
      message:
        published.length > 0
          ? `Published to ${published.map((r) => r.platform).join(', ')}`
          : failed[0]?.error || 'Nothing was published',
    });
  } catch (error) {
    console.error('[planner/publish]', error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : 'Publish failed',
      },
      { status: 500 }
    );
  }
}

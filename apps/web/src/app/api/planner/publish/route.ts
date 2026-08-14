/**
 * POST /api/planner/publish
 * Publish a planner post to connected social accounts for the active workspace.
 * Supports Instagram (image) + Facebook Page (photo or text feed).
 */

import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
} from '@/lib/social/persist';
import { requireOwnedWorkspace } from '@/lib/social/workspace-access';
import {
  publishFacebookPagePost,
  publishInstagramPost,
} from '@/lib/meta/graph-api';

type PublishBody = {
  workspaceId?: unknown;
  platforms?: unknown;
  caption?: unknown;
  hashtags?: unknown;
  imageUrl?: unknown;
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
  // Strict: never fall back to another user's tokens on the same workspace_id.
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

    const access = await requireOwnedWorkspace(userId, workspaceId);
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
    const imageUrl = String(body.imageUrl || '').trim();
    const title = String(body.title || '').trim();

    if (!fullCaption && !imageUrl) {
      return Response.json(
        { error: 'Caption or media is required to publish' },
        { status: 400 }
      );
    }

    const results: PlatformResult[] = [];

    for (const platform of platforms) {
      if (!['instagram', 'facebook'].includes(platform)) {
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
          if (!imageUrl || !/^https:\/\//i.test(imageUrl)) {
            results.push({
              platform,
              ok: false,
              error:
                'Instagram requires a public HTTPS image. Add media, then Post again.',
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
            imageUrl,
            fullCaption || title
          );
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

        if (imageUrl && /^https:\/\//i.test(imageUrl)) {
          const published = await publishFacebookPagePost(
            pageId,
            pageToken,
            imageUrl,
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

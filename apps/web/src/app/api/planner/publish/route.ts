/**
 * POST /api/planner/publish
 * Publish a planner post to connected social accounts for the active workspace.
 */

import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
} from '@/lib/social/persist';
import { resolveStrictUserWorkspace } from '@/lib/social/resolve-user-workspace';
import { publishAndFinalizePlannerPost } from '@/lib/planner/publish';
import type { YoutubeMeta } from '@/lib/mock-content-planner';

type PublishBody = {
  postId?: unknown;
  workspaceId?: unknown;
  platforms?: unknown;
  caption?: unknown;
  hashtags?: unknown;
  imageUrl?: unknown;
  mediaUrl?: unknown;
  videoUrl?: unknown;
  mediaType?: unknown;
  title?: unknown;
  youtube?: unknown;
  pinterestBoardId?: unknown;
  link?: unknown;
  extraImageUrls?: unknown;
};

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

    const postId =
      typeof body.postId === 'string' && body.postId.trim()
        ? body.postId.trim()
        : null;

    const result = await publishAndFinalizePlannerPost({
      userId,
      workspaceId: access.workspaceId,
      postId,
      platforms,
      caption: String(body.caption || ''),
      hashtags: String(body.hashtags || ''),
      title: String(body.title || ''),
      mediaUrl: String(
        body.mediaUrl || body.imageUrl || body.videoUrl || ''
      ),
      mediaType: String(body.mediaType || ''),
      extraImageUrls: Array.isArray(body.extraImageUrls)
        ? body.extraImageUrls.map((u) => String(u)).filter(Boolean)
        : [],
      youtube:
        body.youtube && typeof body.youtube === 'object'
          ? (body.youtube as YoutubeMeta)
          : null,
      pinterestBoardId:
        typeof body.pinterestBoardId === 'string'
          ? body.pinterestBoardId
          : undefined,
      link: typeof body.link === 'string' ? body.link : undefined,
    });

    const status = result.ok ? 200 : result.failed_count > 0 ? 502 : 400;

    return Response.json(
      {
        ok: result.ok,
        workspace_id: access.workspaceId,
        post_id: postId,
        results: result.results,
        published_count: result.published_count,
        failed_count: result.failed_count,
        error_log: result.error_log,
        message: result.message,
        error: result.ok ? undefined : result.message,
      },
      { status }
    );
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

/**
 * GET /api/analytics/posts?workspaceId=…&sort=engagementRate|publishedAt
 * Live published posts from Instagram, Facebook Page, and TikTok.
 */

import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
} from '@/lib/social/persist';
import { fetchLiveUnifiedPosts } from '@/lib/analytics/unified-posts';

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized', posts: [], accounts: [] }, { status: 401 });
    }

    const url = new URL(request.url);
    const jar = await cookies();
    const workspaceId =
      url.searchParams.get('workspaceId')?.trim() ||
      request.headers.get('x-workspace-id')?.trim() ||
      request.headers.get('x-active-workspace-id')?.trim() ||
      jar.get(ACTIVE_WORKSPACE_COOKIE)?.value ||
      jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value ||
      null;

    if (!workspaceId) {
      return Response.json({
        ok: true,
        posts: [],
        accounts: [],
        message: 'Select a workspace to load post analytics.',
      });
    }

    const sortParam = url.searchParams.get('sort');
    const sort =
      sortParam === 'publishedAt' ? 'publishedAt' : 'engagementRate';

    const result = await fetchLiveUnifiedPosts({
      userId: session.user.id,
      workspaceId,
      sort,
    });

    return Response.json({
      ok: true,
      workspace_id: workspaceId,
      posts: result.posts,
      accounts: result.accounts,
      sort: result.sort,
    });
  } catch (error) {
    console.warn('[Analytics Posts API]', error);
    return Response.json({
      ok: false,
      posts: [],
      accounts: [],
      message:
        error instanceof Error
          ? error.message
          : 'Failed to load post analytics',
    });
  }
}

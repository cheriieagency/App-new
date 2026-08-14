/**
 * GET /api/analytics/stories?workspaceId=…
 * Live Instagram Stories (active ~24h window) for Analytics → Stories.
 */

import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
} from '@/lib/social/persist';
import { fetchLiveStories } from '@/lib/analytics/unified-posts';

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return Response.json(
        { error: 'Unauthorized', posts: [], accounts: [] },
        { status: 401 }
      );
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
        message: 'Select a workspace to load Stories analytics.',
      });
    }

    const result = await fetchLiveStories({
      userId: session.user.id,
      workspaceId,
    });

    return Response.json({
      ok: true,
      workspace_id: workspaceId,
      posts: result.posts,
      accounts: result.accounts,
      sort: result.sort,
    });
  } catch (error) {
    console.warn('[Analytics Stories API]', error);
    return Response.json({
      ok: false,
      posts: [],
      accounts: [],
      message:
        error instanceof Error
          ? error.message
          : 'Failed to load Stories analytics',
    });
  }
}

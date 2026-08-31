/**
 * GET /api/planner/platform-posts
 * Live published posts from connected IG / FB / TikTok profiles (not only Clikd publishes).
 */

import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { fetchLiveUnifiedPosts } from '@/lib/analytics/unified-posts';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
} from '@/lib/social/persist';
import { unifiedPostToPlannerPost } from '@/lib/planner/platform-posts';

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized', posts: [] }, { status: 401 });
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

    const project =
      url.searchParams.get('project')?.trim() || 'Workspace';

    if (!workspaceId) {
      return Response.json({
        ok: true,
        posts: [],
        message: 'Select a workspace to load platform posts.',
      });
    }

    if (!process.env.DATABASE_URL?.trim()) {
      return Response.json({
        ok: true,
        posts: [],
        demo: true,
        message: 'Connect DATABASE_URL and social accounts to import live posts.',
      });
    }

    const result = await fetchLiveUnifiedPosts({
      userId: session.user.id,
      workspaceId,
      sort: 'publishedAt',
      // Pull a deeper history so older published posts land on the calendar.
      postLimits: { instagram: 100, facebook: 100, tiktok: 50 },
    });

    const posts = result.posts.map((p) => unifiedPostToPlannerPost(p, project));

    return Response.json({
      ok: true,
      workspace_id: workspaceId,
      posts,
      accounts: result.accounts,
    });
  } catch (error) {
    console.warn('[planner/platform-posts]', error);
    return Response.json({
      ok: false,
      posts: [],
      message:
        error instanceof Error
          ? error.message
          : 'Failed to load platform posts',
    });
  }
}

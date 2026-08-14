/**
 * GET /api/analytics/hashtags?workspaceId=…
 * Live hashtag performance from Instagram / Facebook / TikTok captions.
 */

import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
} from '@/lib/social/persist';
import { fetchHashtagAnalytics } from '@/lib/analytics/hashtags';

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return Response.json(
        {
          error: 'Unauthorized',
          kpis: { uniqueTags: 0, avgReachLift: 0, taggedPosts: 0 },
          hashtags: [],
        },
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
        kpis: { uniqueTags: 0, avgReachLift: 0, taggedPosts: 0 },
        hashtags: [],
        message: 'Select a workspace to load hashtag analytics.',
      });
    }

    const from = url.searchParams.get('from')?.trim() || null;
    const to = url.searchParams.get('to')?.trim() || null;

    const result = await fetchHashtagAnalytics({
      userId: session.user.id,
      workspaceId,
      from,
      to,
    });

    return Response.json({
      ok: true,
      workspace_id: workspaceId,
      from,
      to,
      kpis: result.kpis,
      hashtags: result.hashtags,
    });
  } catch (error) {
    console.warn('[Analytics Hashtags API]', error);
    return Response.json({
      ok: false,
      kpis: { uniqueTags: 0, avgReachLift: 0, taggedPosts: 0 },
      hashtags: [],
      message:
        error instanceof Error
          ? error.message
          : 'Failed to load hashtag analytics',
    });
  }
}

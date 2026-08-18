/**
 * GET/POST /api/cron/publish
 * Every 5 minutes — auto-publish planner posts where workflow=SCHEDULED, auto_post=true,
 * and scheduled_at <= now().
 * Header: Authorization: Bearer ${CRON_SECRET}
 */

import { cronEnv, missingEnvKeys, missingEnvResponse } from '@/lib/config/env';
import {
  claimDueScheduledPlannerPosts,
  publishAndFinalizePlannerPost,
} from '@/lib/planner/publish';
import { markPlannerPostPublishOutcome } from '@/lib/planner/posts';

function authorize(request: Request): boolean {
  const secret = cronEnv.secret();
  if (!secret) return false;
  const header = request.headers.get('authorization') || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const query = new URL(request.url).searchParams.get('secret') || '';
  return bearer === secret || query === secret;
}

async function runCron() {
  const missing = missingEnvKeys(...cronEnv.requiredKeys);
  if (missing.length) {
    return missingEnvResponse(missing, 'Cron');
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json(
      { error: 'database_unavailable', message: 'DATABASE_URL is not configured' },
      { status: 503 }
    );
  }

  const due = await claimDueScheduledPlannerPosts(25);
  const results: Array<Record<string, unknown>> = [];

  for (const post of due) {
    if (!post.workspace_id?.trim()) {
      await markPlannerPostPublishOutcome({
        postId: post.id,
        userId: post.user_id,
        success: false,
        errorLog: 'missing_workspace_id',
        activityText: 'Scheduled publish failed: workspace not set on post',
      });
      results.push({
        postId: post.id,
        ok: false,
        error: 'missing_workspace_id',
      });
      continue;
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

    try {
      const outcome = await publishAndFinalizePlannerPost({
        userId: post.user_id,
        workspaceId: post.workspace_id,
        postId: post.id,
        platforms: post.platforms,
        caption: post.caption,
        hashtags: post.hashtags,
        title: post.title,
        mediaUrl,
        mediaType,
        extraImageUrls,
        youtube: post.youtube,
      });

      results.push({
        postId: post.id,
        userId: post.user_id,
        workspaceId: post.workspace_id,
        ok: outcome.ok,
        published_count: outcome.published_count,
        failed_count: outcome.failed_count,
        error_log: outcome.error_log,
        message: outcome.message,
      });
    } catch (error) {
      console.error('[cron/publish] failed', post.id, error);
      results.push({
        postId: post.id,
        ok: false,
        error: error instanceof Error ? error.message : 'failed',
      });
    }
  }

  return Response.json({
    ok: true,
    claimed: due.length,
    processed: results.length,
    results,
  });
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return runCron();
}

export async function POST(request: Request) {
  if (!authorize(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return runCron();
}

/**
 * GET/POST /api/planner — content planner posts (session-scoped).
 * Prefer /api/planner/posts for the same handlers.
 * When DATABASE_URL is set, all CRUD hits Postgres (planner_posts).
 */

import { requireApiSession } from '@/lib/auth/require-api-session';
import {
  addPlannerComment,
  deletePlannerPost,
  listPlannerPosts,
  movePlannerPost,
  reschedulePlannerPost,
  upsertPlannerPost,
  type PlannerAssignee,
  type PlannerMediaItem,
  type PlannerPostStatus,
  type PlannerSubtask,
  type SocialPlatform,
  type WorkflowStatus,
  type YoutubeMeta,
} from '@/lib/mock-content-planner';
import {
  addDurablePlannerComment,
  deleteDurablePlannerPost,
  listDurablePlannerPosts,
  moveDurablePlannerPost,
  rescheduleDurablePlannerPost,
  upsertDurablePlannerPost,
} from '@/lib/planner/posts';
import { parsePublishMode } from '@/lib/planner/publish-modes';
import { parseMoreOptionsFromBody } from '@/lib/planner/more-options';

function useDb() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export async function GET(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  const { searchParams } = new URL(request.url);
  const project = searchParams.get('project') || undefined;
  const userId = session.user.id;

  if (!useDb()) {
    return Response.json({
      posts: listPlannerPosts(project, userId),
      demo: true,
      owner_user_id: userId,
    });
  }

  try {
    const posts = await listDurablePlannerPosts({ userId, project });
    return Response.json({
      posts,
      demo: false,
      owner_user_id: userId,
    });
  } catch (error) {
    console.error('[GET /api/planner]', error);
    return Response.json(
      { error: 'list_failed', posts: [], demo: false },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  const userId = session.user.id;
  const actor = session.user.name?.trim() || 'Creator';
  const durable = useDb();

  try {
    const body = await request.json();
    const action = String(body.action ?? 'upsert');

    if (action === 'delete') {
      if (durable) {
        const ok = await deleteDurablePlannerPost({
          id: String(body.id ?? ''),
          userId,
        });
        const posts = await listDurablePlannerPosts({ userId });
        return Response.json({ ok, posts, demo: false });
      }
      const ok = deletePlannerPost(String(body.id ?? ''), userId);
      return Response.json({ ok, posts: listPlannerPosts(undefined, userId), demo: true });
    }

    if (action === 'move') {
      if (durable) {
        const post = await moveDurablePlannerPost({
          id: String(body.id ?? ''),
          workflow: body.workflow as WorkflowStatus,
          actor,
          userId,
        });
        if (!post) return Response.json({ error: 'Not found' }, { status: 404 });
        return Response.json({
          post,
          posts: await listDurablePlannerPosts({ userId }),
          demo: false,
        });
      }
      const post = movePlannerPost(
        String(body.id ?? ''),
        body.workflow as WorkflowStatus,
        actor,
        userId
      );
      if (!post) return Response.json({ error: 'Not found' }, { status: 404 });
      return Response.json({
        post,
        posts: listPlannerPosts(undefined, userId),
        demo: true,
      });
    }

    if (action === 'reschedule') {
      const scheduledAt =
        typeof body.scheduled_at === 'string' ? body.scheduled_at : '';
      if (!scheduledAt) {
        return Response.json(
          { error: 'scheduled_at required' },
          { status: 400 }
        );
      }
      if (durable) {
        const post = await rescheduleDurablePlannerPost({
          id: String(body.id ?? ''),
          scheduledAt,
          actor,
          userId,
        });
        if (!post) return Response.json({ error: 'Not found' }, { status: 404 });
        return Response.json({
          post,
          posts: await listDurablePlannerPosts({ userId }),
          demo: false,
        });
      }
      const post = reschedulePlannerPost(
        String(body.id ?? ''),
        scheduledAt,
        actor,
        userId
      );
      if (!post) return Response.json({ error: 'Not found' }, { status: 404 });
      return Response.json({
        post,
        posts: listPlannerPosts(undefined, userId),
        demo: true,
      });
    }

    if (action === 'comment') {
      if (durable) {
        const comment = await addDurablePlannerComment({
          id: String(body.id ?? ''),
          userId,
          comment: {
            text: String(body.text ?? ''),
            author_name: String(body.author_name ?? actor),
            author_id: String(body.author_id ?? userId),
            author_avatar: String(body.author_avatar ?? ''),
            image_url: body.image_url ?? null,
            visibility: body.visibility === 'public' ? 'public' : 'private',
          },
        });
        if (!comment) return Response.json({ error: 'Failed' }, { status: 400 });
        const posts = await listDurablePlannerPosts({ userId });
        return Response.json({
          comment,
          post: posts.find((p) => p.id === body.id),
          posts,
          demo: false,
        });
      }
      const comment = addPlannerComment(
        String(body.id ?? ''),
        {
          text: String(body.text ?? ''),
          author_name: body.author_name ?? actor,
          author_id: body.author_id ?? userId,
          author_avatar: body.author_avatar,
          image_url: body.image_url ?? null,
          visibility: body.visibility === 'public' ? 'public' : 'private',
        },
        userId
      );
      if (!comment) return Response.json({ error: 'Failed' }, { status: 400 });
      return Response.json({
        comment,
        post: listPlannerPosts(undefined, userId).find((p) => p.id === body.id),
        posts: listPlannerPosts(undefined, userId),
        demo: true,
      });
    }

    const platforms = Array.isArray(body.platforms)
      ? (body.platforms as SocialPlatform[])
      : [];
    if (platforms.length === 0) {
      return Response.json({ error: 'platforms required' }, { status: 400 });
    }

    const media_items = Array.isArray(body.media_items)
      ? (body.media_items as PlannerMediaItem[]).slice(0, 10)
      : undefined;
    const primaryMedia = media_items?.find((m) => m.url) || null;

    const youtube =
      body.youtube === null
        ? null
        : body.youtube && typeof body.youtube === 'object'
          ? (body.youtube as YoutubeMeta)
          : undefined;

    const status = body.status as PlannerPostStatus | undefined;
    const workflow = body.workflow as WorkflowStatus | undefined;

    const payload = {
      id: typeof body.id === 'string' ? body.id : undefined,
      title: typeof body.title === 'string' ? body.title : undefined,
      caption: String(body.caption ?? ''),
      hashtags: typeof body.hashtags === 'string' ? body.hashtags : undefined,
      platforms,
      status,
      workflow,
      scheduled_at:
        body.scheduled_at === null
          ? null
          : typeof body.scheduled_at === 'string'
            ? body.scheduled_at
            : undefined,
      published_at:
        body.published_at === null
          ? null
          : typeof body.published_at === 'string'
            ? body.published_at
            : status === 'published' || workflow === 'PUBLISHED'
              ? new Date().toISOString()
              : undefined,
      media_url:
        typeof body.media_url === 'string'
          ? body.media_url
          : primaryMedia?.url ?? undefined,
      media_type:
        body.media_type === 'video' || body.media_type === 'image'
          ? body.media_type
          : primaryMedia?.type === 'video'
            ? 'video'
            : primaryMedia
              ? 'image'
              : undefined,
      media_items,
      media_urls: media_items?.map((m) => m.url).filter(Boolean),
      publish_mode: parsePublishMode(body.publish_mode ?? body.publishMode),
      trending_sound_note:
        typeof body.trending_sound_note === 'string'
          ? body.trending_sound_note
          : typeof body.trendingSoundNote === 'string'
            ? body.trendingSoundNote
            : body.trending_sound_note === null ||
                body.trendingSoundNote === null
              ? null
              : undefined,
      ...parseMoreOptionsFromBody(body as Record<string, unknown>),
      youtube,
      idea_title:
        typeof body.idea_title === 'string' ? body.idea_title : undefined,
      project: typeof body.project === 'string' ? body.project : undefined,
      campaigns: Array.isArray(body.campaigns)
        ? (body.campaigns as string[]).filter((x) => typeof x === 'string')
        : undefined,
      assignees: Array.isArray(body.assignees)
        ? (body.assignees as PlannerAssignee[])
        : undefined,
      subtasks: Array.isArray(body.subtasks)
        ? (body.subtasks as PlannerSubtask[])
        : undefined,
      auto_post:
        body.auto_post !== undefined ? Boolean(body.auto_post) : undefined,
      workspaceId:
        typeof body.workspaceId === 'string'
          ? body.workspaceId
          : typeof body.workspace_id === 'string'
            ? body.workspace_id
            : null,
    };

    if (durable) {
      const post = await upsertDurablePlannerPost(payload, actor, userId);
      if (!post) {
        return Response.json(
          { error: 'create_failed', message: 'Failed to save planner post' },
          { status: 500 }
        );
      }
      return Response.json({
        post,
        posts: await listDurablePlannerPosts({ userId }),
        demo: false,
      });
    }

    const post = upsertPlannerPost(payload, actor, userId);
    if (!post) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    return Response.json({
      post,
      posts: listPlannerPosts(undefined, userId),
      demo: true,
    });
  } catch (error) {
    console.error('[POST /api/planner]', error);
    return Response.json(
      {
        error: 'Failed',
        message: error instanceof Error ? error.message : 'Failed',
      },
      { status: 500 }
    );
  }
}

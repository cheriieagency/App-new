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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const project = searchParams.get('project') || undefined;
  return Response.json({ posts: listPlannerPosts(project), demo: true });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = String(body.action ?? 'upsert');
    const actor = typeof body.actor === 'string' ? body.actor : 'Ebba';

    if (action === 'delete') {
      const ok = deletePlannerPost(String(body.id ?? ''));
      return Response.json({ ok, posts: listPlannerPosts() });
    }

    if (action === 'move') {
      const post = movePlannerPost(
        String(body.id ?? ''),
        body.workflow as WorkflowStatus,
        actor
      );
      if (!post) return Response.json({ error: 'Not found' }, { status: 404 });
      return Response.json({ post, posts: listPlannerPosts() });
    }

    if (action === 'reschedule') {
      const scheduledAt = typeof body.scheduled_at === 'string' ? body.scheduled_at : '';
      if (!scheduledAt) {
        return Response.json({ error: 'scheduled_at required' }, { status: 400 });
      }
      const post = reschedulePlannerPost(String(body.id ?? ''), scheduledAt, actor);
      if (!post) return Response.json({ error: 'Not found' }, { status: 404 });
      return Response.json({ post, posts: listPlannerPosts() });
    }

    if (action === 'comment') {
      const comment = addPlannerComment(String(body.id ?? ''), {
        text: String(body.text ?? ''),
        author_name: body.author_name,
        author_id: body.author_id,
        author_avatar: body.author_avatar,
        image_url: body.image_url ?? null,
        visibility: body.visibility === 'public' ? 'public' : 'private',
      });
      if (!comment) return Response.json({ error: 'Failed' }, { status: 400 });
      return Response.json({
        comment,
        post: listPlannerPosts().find((p) => p.id === body.id),
        posts: listPlannerPosts(),
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

    const youtube =
      body.youtube === null
        ? null
        : body.youtube && typeof body.youtube === 'object'
          ? (body.youtube as YoutubeMeta)
          : undefined;

    const status = body.status as PlannerPostStatus | undefined;
    const workflow = body.workflow as WorkflowStatus | undefined;

    const post = upsertPlannerPost(
      {
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
        media_url: body.media_url ?? undefined,
        media_type: body.media_type ?? undefined,
        media_items,
        youtube,
        idea_title: typeof body.idea_title === 'string' ? body.idea_title : undefined,
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
      },
      actor
    );

    return Response.json({ post, posts: listPlannerPosts() });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}

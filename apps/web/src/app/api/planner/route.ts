import {
  deletePlannerPost,
  listPlannerPosts,
  upsertPlannerPost,
  type PlannerMediaItem,
  type PlannerPostStatus,
  type SocialPlatform,
  type YoutubeMeta,
} from '@/lib/mock-content-planner';

export async function GET() {
  return Response.json({ posts: listPlannerPosts(), demo: true });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = String(body.action ?? 'upsert');

    if (action === 'delete') {
      const ok = deletePlannerPost(String(body.id ?? ''));
      return Response.json({ ok, posts: listPlannerPosts() });
    }

    const platforms = Array.isArray(body.platforms)
      ? (body.platforms as SocialPlatform[])
      : [];
    if (!body.caption || platforms.length === 0) {
      return Response.json({ error: 'caption and platforms required' }, { status: 400 });
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

    const status = (body.status as PlannerPostStatus) || 'draft';
    const post = upsertPlannerPost({
      id: typeof body.id === 'string' ? body.id : undefined,
      caption: String(body.caption),
      platforms,
      status,
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
            : status === 'published'
              ? new Date().toISOString()
              : undefined,
      media_url: body.media_url ?? undefined,
      media_type: body.media_type ?? undefined,
      media_items,
      youtube,
      idea_title: typeof body.idea_title === 'string' ? body.idea_title : undefined,
    });

    return Response.json({ post, posts: listPlannerPosts() });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}

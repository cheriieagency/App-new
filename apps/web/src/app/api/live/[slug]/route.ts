import {
  addLiveChatMessage,
  bumpLiveViewers,
  getLiveSession,
  upsertLiveSession,
} from '@/lib/mock-live-broadcast';

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: Ctx) {
  const { slug } = await context.params;
  const session = getLiveSession(slug);
  if (!session) {
    return Response.json({
      slug,
      title: 'Live',
      creator_name: 'Creator',
      community_name: null,
      is_live: false,
      viewer_count: 0,
      started_at: null,
      ended_at: null,
      chat: [],
      public: true,
      exists: false,
    });
  }
  return Response.json({ ...session, exists: true });
}

export async function POST(request: Request, context: Ctx) {
  const { slug } = await context.params;
  try {
    const body = await request.json();
    const action = String(body.action ?? 'upsert');

    if (action === 'upsert' || action === 'start' || action === 'stop' || action === 'update') {
      const is_live =
        action === 'start'
          ? true
          : action === 'stop'
            ? false
            : body.is_live !== undefined
              ? Boolean(body.is_live)
              : undefined;

      const session = upsertLiveSession({
        slug,
        title: typeof body.title === 'string' ? body.title : undefined,
        creator_name:
          typeof body.creator_name === 'string' ? body.creator_name : undefined,
        community_name:
          body.community_name === null || typeof body.community_name === 'string'
            ? body.community_name
            : undefined,
        is_live,
        viewer_count:
          body.viewer_count != null ? Number(body.viewer_count) : undefined,
      });
      return Response.json({ ...session, exists: true });
    }

    if (action === 'join') {
      const session = bumpLiveViewers(slug, 1) ?? upsertLiveSession({ slug, is_live: false });
      return Response.json({ ...session, exists: true });
    }

    if (action === 'chat') {
      const msg = addLiveChatMessage(slug, {
        name: String(body.name ?? 'Gäst'),
        msg: String(body.msg ?? ''),
      });
      if (!msg) {
        return Response.json({ error: 'Live is not active' }, { status: 400 });
      }
      const session = getLiveSession(slug);
      return Response.json({ message: msg, session });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}

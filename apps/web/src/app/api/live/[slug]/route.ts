/**
 * GET/POST /api/live/[slug] — public live session + chat.
 * Persists to Postgres when DATABASE_URL is set.
 */

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import {
  addLiveChatMessage,
  bumpLiveViewers,
  getLiveSession,
  upsertLiveSession,
} from '@/lib/mock-live-broadcast';
import {
  addDurableLiveChatMessage,
  bumpDurableLiveViewers,
  getDurableLiveSession,
  upsertDurableLiveSession,
} from '@/lib/live/persist';

type Ctx = { params: Promise<{ slug: string }> };

function useDb() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export async function GET(_request: Request, context: Ctx) {
  const { slug } = await context.params;

  if (useDb()) {
    try {
      const session = await getDurableLiveSession(slug);
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
          demo: false,
        });
      }
      return Response.json({ ...session, exists: true, demo: false });
    } catch (error) {
      console.error('[GET /api/live]', error);
      return Response.json({ error: 'load_failed' }, { status: 500 });
    }
  }

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
      demo: true,
    });
  }
  return Response.json({ ...session, exists: true, demo: true });
}

export async function POST(request: Request, context: Ctx) {
  const { slug } = await context.params;
  const durable = useDb();

  try {
    const body = await request.json();
    const action = String(body.action ?? 'upsert');

    let creatorUserId: string | null = null;
    try {
      const authSession = await auth.api.getSession({ headers: await headers() });
      creatorUserId = authSession?.user?.id ?? null;
    } catch {
      /* public join/chat may be anonymous */
    }

    if (action === 'upsert' || action === 'start' || action === 'stop' || action === 'update') {
      const is_live =
        action === 'start'
          ? true
          : action === 'stop'
            ? false
            : body.is_live !== undefined
              ? Boolean(body.is_live)
              : undefined;

      const payload = {
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
      };

      if (durable) {
        const session = await upsertDurableLiveSession({
          ...payload,
          creator_user_id: creatorUserId,
        });
        return Response.json({ ...session, exists: true, demo: false });
      }

      const session = upsertLiveSession(payload);
      return Response.json({ ...session, exists: true, demo: true });
    }

    if (action === 'join') {
      if (durable) {
        const session =
          (await bumpDurableLiveViewers(slug, 1)) ||
          (await upsertDurableLiveSession({
            slug,
            is_live: false,
            creator_user_id: creatorUserId,
          }));
        return Response.json({ ...session, exists: true, demo: false });
      }
      const session =
        bumpLiveViewers(slug, 1) ?? upsertLiveSession({ slug, is_live: false });
      return Response.json({ ...session, exists: true, demo: true });
    }

    if (action === 'chat') {
      const name = String(body.name ?? 'Gäst');
      const msg = String(body.msg ?? '');
      if (durable) {
        const message = await addDurableLiveChatMessage(slug, { name, msg });
        if (!message) {
          return Response.json({ error: 'Live is not active' }, { status: 400 });
        }
        const session = await getDurableLiveSession(slug);
        return Response.json({ message, session, demo: false });
      }
      const message = addLiveChatMessage(slug, { name, msg });
      if (!message) {
        return Response.json({ error: 'Live is not active' }, { status: 400 });
      }
      const session = getLiveSession(slug);
      return Response.json({ message, session, demo: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[POST /api/live]', error);
    return Response.json(
      {
        error: 'Failed',
        message: error instanceof Error ? error.message : 'Failed',
      },
      { status: 500 }
    );
  }
}

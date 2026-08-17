/**
 * Public client review link — GET post (public chat only) / POST public comment.
 * No session required.
 */

import {
  addPublicSharedComment,
  getPublicSharedPost,
} from '@/lib/planner/share';

type Ctx = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: Ctx) {
  const { token: raw } = await context.params;
  const token = String(raw || '').trim();
  if (!token || token.length < 16) {
    return Response.json({ error: 'invalid_token' }, { status: 400 });
  }

  try {
    const post = await getPublicSharedPost(token);
    if (!post) {
      return Response.json(
        { error: 'not_found', message: 'This share link is invalid or disabled.' },
        { status: 404 }
      );
    }

    return Response.json(
      { ok: true, post },
      {
        headers: {
          'Cache-Control': 'private, no-store',
        },
      }
    );
  } catch (error) {
    console.error('[GET /api/planner/share/[token]]', error);
    return Response.json({ error: 'load_failed' }, { status: 500 });
  }
}

export async function POST(request: Request, context: Ctx) {
  const { token: raw } = await context.params;
  const token = String(raw || '').trim();
  if (!token || token.length < 16) {
    return Response.json({ error: 'invalid_token' }, { status: 400 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const comment = await addPublicSharedComment({
      token,
      authorName:
        typeof body.authorName === 'string'
          ? body.authorName
          : typeof body.author_name === 'string'
            ? body.author_name
            : 'Guest',
      text: typeof body.text === 'string' ? body.text : '',
      imageUrl:
        typeof body.imageUrl === 'string'
          ? body.imageUrl
          : typeof body.image_url === 'string'
            ? body.image_url
            : null,
    });

    if (!comment) {
      return Response.json(
        { error: 'comment_failed', message: 'Could not post comment.' },
        { status: 400 }
      );
    }

    const post = await getPublicSharedPost(token);
    return Response.json({ ok: true, comment, post });
  } catch (error) {
    console.error('[POST /api/planner/share/[token]]', error);
    return Response.json({ error: 'comment_failed' }, { status: 500 });
  }
}

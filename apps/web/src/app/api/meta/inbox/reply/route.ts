/**
 * POST /api/meta/inbox/reply
 * Reply to an Instagram comment thread in Social Inbox.
 */

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { replyToInstagramComment } from '@/lib/meta/graph-api';
import { listStoredMetaAccounts } from '@/lib/meta/social-accounts';
import {
  getMetaSyncSnapshot,
  setMetaSyncSnapshot,
} from '@/lib/meta/sync';

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { commentId?: string; message?: string; threadId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const commentId = String(body.commentId || body.threadId || '').trim();
  const message = String(body.message || '').trim();
  if (!commentId || !message) {
    return Response.json(
      { error: 'commentId_and_message_required' },
      { status: 400 }
    );
  }

  const accounts = await listStoredMetaAccounts(session.user.id);
  const ig = accounts.find((a) => a.platform === 'instagram');
  if (!ig?.access_token) {
    return Response.json(
      {
        error: 'instagram_not_connected',
        message: 'Connect Instagram under Settings → Socials first.',
      },
      { status: 400 }
    );
  }

  try {
    const created = await replyToInstagramComment(
      commentId,
      message,
      ig.access_token
    );

    const snapshot = getMetaSyncSnapshot(session.user.id);
    if (snapshot) {
      const threads = snapshot.inbox_threads.map((thread) => {
        if (thread.id !== commentId) return thread;
        return {
          ...thread,
          unread: false,
          preview: message.slice(0, 120),
          messages: [
            ...thread.messages,
            {
              id: created.id,
              from: 'you' as const,
              text: message,
              time: 'now',
            },
          ],
        };
      });
      setMetaSyncSnapshot(session.user.id, {
        ...snapshot,
        inbox_threads: threads,
      });
    }

    return Response.json({
      success: true,
      reply_id: created.id,
      snapshot: getMetaSyncSnapshot(session.user.id),
    });
  } catch (error) {
    console.error('[api/meta/inbox/reply]', error);
    return Response.json(
      {
        error: 'reply_failed',
        message:
          error instanceof Error
            ? error.message
            : 'Could not send Instagram reply. Reconnect Instagram with comment permissions.',
      },
      { status: 502 }
    );
  }
}

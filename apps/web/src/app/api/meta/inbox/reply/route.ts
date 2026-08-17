/**
 * POST /api/meta/inbox/reply
 * Reply to an Instagram comment thread or DM in Social Inbox.
 *
 * Body:
 *  - channel: 'comment' | 'dm' (default comment)
 *  - commentId / threadId: comment id OR dm:{conversationId}
 *  - message: reply text
 *  - recipientId: required for DMs (Instagram-scoped user id)
 *  - pageId: optional Page id for DMs
 */

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  replyToInstagramComment,
  sendInstagramDm,
} from '@/lib/meta/graph-api';
import { listStoredMetaAccounts } from '@/lib/meta/social-accounts';
import {
  getMetaSyncSnapshot,
  setMetaSyncSnapshot,
} from '@/lib/meta/sync';
import { requireFeature } from '@/lib/plan-guard';

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dmGate = await requireFeature('directMessages', await headers());
  if (dmGate) return dmGate;

  let body: {
    commentId?: string;
    message?: string;
    threadId?: string;
    channel?: string;
    recipientId?: string;
    pageId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const threadId = String(body.commentId || body.threadId || '').trim();
  const message = String(body.message || '').trim();
  const channel =
    body.channel === 'dm' || threadId.startsWith('dm:') ? 'dm' : 'comment';

  if (!threadId || !message) {
    return Response.json(
      { error: 'threadId_and_message_required' },
      { status: 400 }
    );
  }

  const accounts = await listStoredMetaAccounts(session.user.id);
  const ig = accounts.find((a) => a.platform === 'instagram');
  const fb = accounts.find((a) => a.platform === 'facebook');
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
    let created: { id: string };

    if (channel === 'dm') {
      const pageId =
        String(body.pageId || '').trim() ||
        ig.page_id ||
        fb?.page_id ||
        fb?.external_id ||
        '';
      const pageToken =
        (fb?.page_id === pageId || fb?.external_id === pageId
          ? fb?.access_token
          : null) || ig.access_token;
      const recipientId =
        String(body.recipientId || '').trim() ||
        getMetaSyncSnapshot(session.user.id)?.inbox_threads.find(
          (t) => t.id === threadId
        )?.recipient_id ||
        '';

      if (!pageId || !recipientId) {
        return Response.json(
          {
            error: 'dm_missing_ids',
            message:
              'DM reply needs a linked Facebook Page and recipient. Reconnect Instagram with messaging permissions, then Sync.',
          },
          { status: 400 }
        );
      }

      created = await sendInstagramDm({
        pageId,
        pageAccessToken: pageToken,
        recipientId,
        message,
      });
    } else {
      const commentId = threadId.replace(/^comment:/, '');
      created = await replyToInstagramComment(
        commentId,
        message,
        ig.access_token
      );
    }

    const snapshot = getMetaSyncSnapshot(session.user.id);
    if (snapshot) {
      const threads = snapshot.inbox_threads.map((thread) => {
        if (thread.id !== threadId) return thread;
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
      channel,
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
            : 'Could not send Instagram reply. Reconnect Instagram with comment + messaging permissions.',
      },
      { status: 502 }
    );
  }
}

/**
 * POST /api/meta/inbox/dm
 * Moderate Instagram DMs from Social Inbox.
 *
 * Body:
 *  - action: 'like' | 'unlike' | 'edit' | 'delete'
 *  - threadId: dm:{conversationId}
 *  - messageId: Graph message mid
 *  - message: required for edit (sends a replacement DM — Meta can't edit in place)
 *
 * Notes:
 *  - Like = Messaging API react ❤️ / unreact
 *  - Edit = send new DM with updated text + drop old bubble locally
 *  - Delete = remove from Inbox locally (Graph cannot unsend IG DMs)
 */

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  reactToInstagramDm,
  sendInstagramDm,
} from '@/lib/meta/graph-api';
import { listStoredMetaAccounts } from '@/lib/meta/social-accounts';
import {
  getMetaSyncSnapshot,
  setMetaSyncSnapshot,
} from '@/lib/meta/sync';
import { requireFeature } from '@/lib/plan-guard';

type DmAction = 'like' | 'unlike' | 'edit' | 'delete';

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dmGate = await requireFeature('directMessages', await headers());
  if (dmGate) return dmGate;

  let body: {
    action?: string;
    threadId?: string;
    messageId?: string;
    message?: string;
    recipientId?: string;
    pageId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const action = String(body.action || '').trim() as DmAction;
  const threadId = String(body.threadId || '').trim();
  const messageId = String(body.messageId || '').trim();
  const message = String(body.message || '').trim();

  if (!threadId || !messageId || !['like', 'unlike', 'edit', 'delete'].includes(action)) {
    return Response.json(
      { error: 'action_threadId_and_messageId_required' },
      { status: 400 }
    );
  }
  if (action === 'edit' && !message) {
    return Response.json(
      { error: 'message_required_for_edit' },
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

  const snapshot = getMetaSyncSnapshot(session.user.id);
  const thread = snapshot?.inbox_threads.find((t) => t.id === threadId);
  const pageId =
    String(body.pageId || '').trim() ||
    thread?.page_id ||
    ig.page_id ||
    fb?.page_id ||
    fb?.external_id ||
    '';
  const recipientId =
    String(body.recipientId || '').trim() || thread?.recipient_id || '';
  const pageToken =
    (fb?.page_id === pageId || fb?.external_id === pageId
      ? fb?.access_token
      : null) || ig.access_token;

  try {
    let replacementId: string | null = null;
    let localOnly = false;
    let notice: string | null = null;

    if (action === 'like' || action === 'unlike') {
      if (!pageId || !recipientId) {
        return Response.json(
          {
            error: 'dm_missing_ids',
            message:
              'DM actions need a linked Facebook Page and recipient. Reconnect Instagram with messaging permissions, then Sync.',
          },
          { status: 400 }
        );
      }
      await reactToInstagramDm({
        pageId,
        pageAccessToken: pageToken,
        recipientId,
        messageId,
        reaction: action === 'like' ? '❤️' : null,
      });
    } else if (action === 'edit') {
      if (!pageId || !recipientId) {
        return Response.json(
          {
            error: 'dm_missing_ids',
            message:
              'DM edit needs a linked Facebook Page and recipient. Reconnect Instagram with messaging permissions, then Sync.',
          },
          { status: 400 }
        );
      }
      // Meta cannot edit sent IG DMs — send a replacement message.
      const created = await sendInstagramDm({
        pageId,
        pageAccessToken: pageToken,
        recipientId,
        message,
      });
      replacementId = created.id;
      notice =
        'Instagram can’t edit sent DMs in place — sent your update as a new message.';
    } else if (action === 'delete') {
      // Graph has no unsend for Instagram DMs — drop from Inbox only.
      localOnly = true;
      notice =
        'Removed from Inbox. Instagram doesn’t allow unsending DMs from apps.';
    }

    if (snapshot) {
      const threads = snapshot.inbox_threads.map((t) => {
        if (t.id !== threadId) return t;

        if (action === 'like' || action === 'unlike') {
          return {
            ...t,
            messages: t.messages.map((m) =>
              m.id === messageId ? { ...m, liked: action === 'like' } : m
            ),
          };
        }

        if (action === 'delete') {
          const messages = t.messages.filter((m) => m.id !== messageId);
          const last = messages[messages.length - 1];
          return {
            ...t,
            messages,
            preview: (last?.text || t.preview).slice(0, 120),
          };
        }

        if (action === 'edit' && replacementId) {
          const messages = t.messages
            .filter((m) => m.id !== messageId)
            .concat([
              {
                id: replacementId,
                from: 'you' as const,
                text: message,
                time: 'now',
              },
            ]);
          return {
            ...t,
            messages,
            preview: message.slice(0, 120),
          };
        }

        return t;
      });

      setMetaSyncSnapshot(session.user.id, {
        ...snapshot,
        inbox_threads: threads,
      });
    }

    return Response.json({
      success: true,
      action,
      local_only: localOnly,
      notice,
      replacement_id: replacementId,
      snapshot: getMetaSyncSnapshot(session.user.id),
    });
  } catch (error) {
    console.error('[api/meta/inbox/dm]', action, error);
    return Response.json(
      {
        error: `${action}_failed`,
        message:
          error instanceof Error
            ? error.message
            : `Could not ${action} Instagram DM.`,
      },
      { status: 502 }
    );
  }
}

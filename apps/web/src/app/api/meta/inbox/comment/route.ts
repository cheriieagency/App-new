/**
 * POST /api/meta/inbox/comment
 * Moderate Instagram comments from Social Inbox.
 *
 * Body:
 *  - action: 'delete' | 'like' | 'unlike' | 'edit'
 *  - commentId: Graph IG comment id
 *  - threadId: optional inbox thread id (defaults to commentId)
 *  - message: required for edit (reposts own reply after delete)
 */

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  deleteInstagramComment,
  likeInstagramComment,
  postInstagramMediaComment,
  replyToInstagramComment,
  unlikeInstagramComment,
} from '@/lib/meta/graph-api';
import { listStoredMetaAccounts } from '@/lib/meta/social-accounts';
import {
  getMetaSyncSnapshot,
  setMetaSyncSnapshot,
} from '@/lib/meta/sync';
import { requireFeature } from '@/lib/plan-guard';

type CommentAction = 'delete' | 'like' | 'unlike' | 'edit';

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dmGate = await requireFeature('directMessages', await headers());
  if (dmGate) return dmGate;

  let body: {
    action?: string;
    commentId?: string;
    threadId?: string;
    message?: string;
    mediaId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const action = String(body.action || '').trim() as CommentAction;
  const commentId = String(body.commentId || '').trim().replace(/^comment:/, '');
  const threadId = String(body.threadId || commentId).trim().replace(/^comment:/, '');
  const message = String(body.message || '').trim();
  const mediaId = String(body.mediaId || '').trim();

  if (!commentId || !['delete', 'like', 'unlike', 'edit'].includes(action)) {
    return Response.json(
      { error: 'action_and_commentId_required' },
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
  if (!ig?.access_token || !ig.external_id) {
    return Response.json(
      {
        error: 'instagram_not_connected',
        message: 'Connect Instagram under Settings → Socials first.',
      },
      { status: 400 }
    );
  }

  try {
    let replyId: string | null = null;

    if (action === 'delete') {
      await deleteInstagramComment(commentId, ig.access_token);
    } else if (action === 'like') {
      await likeInstagramComment({
        igUserId: ig.external_id,
        commentId,
        accessToken: ig.access_token,
      });
    } else if (action === 'unlike') {
      await unlikeInstagramComment({
        igUserId: ig.external_id,
        commentId,
        accessToken: ig.access_token,
      });
    } else if (action === 'edit') {
      // Instagram Graph has no comment edit endpoint — replace own reply:
      // delete the old comment/reply, then post a new reply on the parent.
      const isRoot = commentId === threadId;
      const parentId = isRoot ? threadId : threadId;

      try {
        await deleteInstagramComment(commentId, ig.access_token);
      } catch (deleteErr) {
        // Continue — comment may already be gone; still try to post the update.
        console.warn('[api/meta/inbox/comment] delete before edit', deleteErr);
      }

      if (isRoot && mediaId) {
        // Root comment was deleted — re-post as a top-level media comment.
        const created = await postInstagramMediaComment(
          mediaId,
          message,
          ig.access_token
        );
        replyId = created.id;
      } else {
        // Prefer replying to the thread root (fan comment).
        const replyTarget = isRoot ? parentId : threadId;
        const created = await replyToInstagramComment(
          replyTarget,
          message,
          ig.access_token
        );
        replyId = created.id;
      }
    }

    const snapshot = getMetaSyncSnapshot(session.user.id);
    if (snapshot) {
      let threads = snapshot.inbox_threads;

      if (action === 'delete') {
        // Deleted the root fan comment → drop the whole thread.
        if (commentId === threadId || commentId === threadId.replace(/^comment:/, '')) {
          threads = threads.filter((t) => t.id !== threadId);
        } else {
          threads = threads.map((thread) => {
            if (thread.id !== threadId) return thread;
            const messages = thread.messages.filter((m) => m.id !== commentId);
            const last = messages[messages.length - 1];
            return {
              ...thread,
              messages,
              preview: (last?.text || thread.preview).slice(0, 120),
            };
          });
        }
      } else if (action === 'like' || action === 'unlike') {
        threads = threads.map((thread) => {
          if (thread.id !== threadId) return thread;
          return {
            ...thread,
            messages: thread.messages.map((m) => {
              const isTarget =
                m.id === commentId ||
                m.id === `${commentId}-m1` ||
                (commentId === thread.id && m.id.endsWith('-m1'));
              if (!isTarget) return m;
              return {
                ...m,
                liked: action === 'like',
              };
            }),
          };
        });
      } else if (action === 'edit' && replyId) {
        threads = threads.map((thread) => {
          if (thread.id !== threadId) return thread;
          return {
            ...thread,
            preview: message.slice(0, 120),
            messages: thread.messages.map((m) =>
              m.id === commentId
                ? { ...m, id: replyId!, text: message, time: 'now' }
                : m
            ),
          };
        });
      }

      setMetaSyncSnapshot(session.user.id, {
        ...snapshot,
        inbox_threads: threads,
      });
    }

    return Response.json({
      success: true,
      action,
      comment_id: commentId,
      reply_id: replyId,
      snapshot: getMetaSyncSnapshot(session.user.id),
    });
  } catch (error) {
    console.error('[api/meta/inbox/comment]', action, error);
    return Response.json(
      {
        error: `${action}_failed`,
        message:
          error instanceof Error
            ? error.message
            : `Could not ${action} Instagram comment. Reconnect Instagram with comment permissions.`,
      },
      { status: 502 }
    );
  }
}

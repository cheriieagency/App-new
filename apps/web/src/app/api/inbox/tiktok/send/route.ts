/**
 * POST /api/inbox/tiktok/send
 * Send a TikTok DM via Business Messaging / IM API and persist the outbound row.
 */

import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { requireFeature } from '@/lib/plan-guard';
import { sendTikTokImMessage } from '@/lib/tiktok/im-send';
import {
  ensureFreshTikTokAccessToken,
} from '@/lib/tiktok/oauth';
import {
  getTikTokAccessTokenForWorkspace,
  getTikTokConversationForWorkspace,
  recordTikTokOutgoingMessage,
} from '@/lib/tiktok/inbox-persist';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
} from '@/lib/social/oauth-workspace';

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const gate = await requireFeature('directMessages', await headers());
  if (gate) return gate;

  let body: {
    workspaceId?: string;
    conversationId?: string;
    threadId?: string;
    recipientId?: string;
    message?: string;
    text?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const jar = await cookies();
  const workspaceId =
    body.workspaceId?.trim() ||
    request.headers.get('x-workspace-id')?.trim() ||
    jar.get(ACTIVE_WORKSPACE_COOKIE)?.value?.trim() ||
    jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value?.trim() ||
    '';

  const message = (body.message || body.text || '').trim();
  if (!workspaceId) {
    return Response.json({ error: 'workspace_required' }, { status: 400 });
  }
  if (!message) {
    return Response.json({ error: 'message_required' }, { status: 400 });
  }

  // Accept UI id `tt:dm:<uuid>` or raw conversation uuid.
  const rawThread = (body.threadId || body.conversationId || '').trim();
  const conversationId = rawThread.replace(/^tt:dm:/, '');
  if (!conversationId) {
    return Response.json({ error: 'conversation_required' }, { status: 400 });
  }

  const conversation = await getTikTokConversationForWorkspace({
    conversationId,
    workspaceId,
  });
  if (!conversation) {
    return Response.json({ error: 'conversation_not_found' }, { status: 404 });
  }

  const recipientId =
    body.recipientId?.trim() || conversation.tiktok_user_id;
  if (!recipientId) {
    return Response.json({ error: 'recipient_required' }, { status: 400 });
  }

  const tokenRow = await getTikTokAccessTokenForWorkspace({
    workspaceId,
    userId: session.user.id,
  });
  if (!tokenRow?.accessToken) {
    return Response.json(
      {
        error: 'tiktok_not_connected',
        message: 'Connect TikTok under Settings → Socials first.',
      },
      { status: 400 }
    );
  }

  const accessToken = await ensureFreshTikTokAccessToken({
    userId: session.user.id,
    workspaceId,
    accessToken: tokenRow.accessToken,
    refreshToken: tokenRow.refreshToken,
    expiresAt: tokenRow.expiresAt,
  });

  const sent = await sendTikTokImMessage({
    accessToken,
    recipientOpenId: recipientId,
    text: message,
  });

  if (!sent.ok) {
    return Response.json(
      {
        error: 'send_failed',
        message: sent.error,
        detail: sent.raw,
      },
      { status: 502 }
    );
  }

  const saved = await recordTikTokOutgoingMessage({
    conversationId,
    senderId: tokenRow.openId || session.user.id,
    content: message,
    externalId: sent.messageId,
  });

  return Response.json({
    ok: true,
    message_id: saved?.id || sent.messageId,
    conversation_id: conversationId,
    thread_id: `tt:dm:${conversationId}`,
  });
}

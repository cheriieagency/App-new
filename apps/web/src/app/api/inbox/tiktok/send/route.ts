/**
 * POST /api/inbox/tiktok/send
 * Send a TikTok DM via Business Messaging / IM API and persist the outbound row.
 * Mock thread IDs (or mock mode without Business secret) return optimistic success.
 */

import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { requireFeature } from '@/lib/plan-guard';
import { sendTikTokImMessage } from '@/lib/tiktok/im-send';
import { ensureFreshTikTokAccessToken } from '@/lib/tiktok/oauth';
import {
  getTikTokAccessTokenForWorkspace,
  getTikTokConversationForWorkspace,
  recordTikTokOutgoingMessage,
} from '@/lib/tiktok/inbox-persist';
import { isTikTokBusinessMockMode } from '@/lib/tiktok/business-oauth';
import { isMockTikTokThreadId } from '@/lib/tiktok/mock-inbox';
import { getTikTokTokenForWorkspace } from '@/lib/tiktok/tokens-persist';
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

  const rawThread = (body.threadId || body.conversationId || '').trim();
  const conversationId = rawThread.replace(/^tt:dm:/, '');
  if (!conversationId) {
    return Response.json({ error: 'conversation_required' }, { status: 400 });
  }

  // Mock inbox replies — no Business API call.
  if (isMockTikTokThreadId(rawThread) || isMockTikTokThreadId(conversationId)) {
    return Response.json({
      ok: true,
      demo: true,
      mock: true,
      message_id: `mock-out-${Date.now()}`,
      conversation_id: conversationId,
      thread_id: `tt:dm:${conversationId}`,
    });
  }

  const conversation = await getTikTokConversationForWorkspace({
    conversationId,
    workspaceId,
  });
  if (!conversation) {
    if (isTikTokBusinessMockMode()) {
      return Response.json({
        ok: true,
        demo: true,
        mock: true,
        message_id: `mock-out-${Date.now()}`,
        conversation_id: conversationId,
        thread_id: `tt:dm:${conversationId}`,
      });
    }
    return Response.json({ error: 'conversation_not_found' }, { status: 404 });
  }

  const recipientId =
    body.recipientId?.trim() || conversation.tiktok_user_id;
  if (!recipientId) {
    return Response.json({ error: 'recipient_required' }, { status: 400 });
  }

  // Prefer tiktok_tokens (Business), fall back to social_accounts (Login Kit).
  const bizToken = await getTikTokTokenForWorkspace({
    workspaceId,
    userId: session.user.id,
  });
  const tokenRow =
    bizToken?.access_token
      ? {
          accessToken: bizToken.access_token,
          openId: bizToken.open_id || '',
          refreshToken: bizToken.refresh_token,
          expiresAt: bizToken.expires_at,
        }
      : await getTikTokAccessTokenForWorkspace({
          workspaceId,
          userId: session.user.id,
        });

  if (!tokenRow?.accessToken) {
    if (isTikTokBusinessMockMode()) {
      return Response.json({
        ok: true,
        demo: true,
        mock: true,
        message_id: `mock-out-${Date.now()}`,
        conversation_id: conversationId,
        thread_id: `tt:dm:${conversationId}`,
      });
    }
    return Response.json(
      {
        error: 'tiktok_not_connected',
        message: 'Connect TikTok under Settings → Socials first.',
      },
      { status: 400 }
    );
  }

  if (tokenRow.accessToken.startsWith('mock_')) {
    const saved = await recordTikTokOutgoingMessage({
      conversationId,
      senderId: tokenRow.openId || session.user.id,
      content: message,
      externalId: `mock-out-${Date.now()}`,
    });
    return Response.json({
      ok: true,
      demo: true,
      mock: true,
      message_id: saved?.id || `mock-out-${Date.now()}`,
      conversation_id: conversationId,
      thread_id: `tt:dm:${conversationId}`,
    });
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

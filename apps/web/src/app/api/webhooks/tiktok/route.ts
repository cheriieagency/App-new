/**
 * TikTok webhook — verification + IM message ingest for Social Inbox.
 * GET  — echo challenge / hub.challenge as plain text 200
 * POST — ack immediately; persist im.message.receive into tiktok_* tables
 */

import { NextResponse } from 'next/server';
import { extractTikTokImEvents } from '@/lib/tiktok/im-webhook';
import {
  ingestTikTokIncomingMessage,
  resolveTikTokAccountByOpenId,
} from '@/lib/tiktok/inbox-persist';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const challenge =
    url.searchParams.get('challenge') ||
    url.searchParams.get('echostr') ||
    url.searchParams.get('hub.challenge') ||
    '';

  const body = challenge.trim() || 'OK';
  return new NextResponse(body, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

export async function POST(request: Request) {
  // Ack first — TikTok retries if we don't return 200 promptly.
  let rawText = '';
  try {
    rawText = await request.text();
  } catch {
    rawText = '';
  }

  // Fire-and-forget persistence so the HTTP response stays fast.
  void (async () => {
    try {
      let payload: unknown = {};
      if (rawText.trim()) {
        try {
          payload = JSON.parse(rawText) as unknown;
        } catch {
          payload = { content: rawText };
        }
      }

      const events = extractTikTokImEvents(payload);
      for (const event of events) {
        // Prefer business/creator open id for workspace lookup; fall back to sender.
        const account =
          (event.businessOpenId
            ? await resolveTikTokAccountByOpenId(event.businessOpenId)
            : null) ||
          (await resolveTikTokAccountByOpenId(event.senderOpenId));

        if (!account?.workspaceId) {
          console.warn(
            '[webhooks/tiktok] no social_accounts match for open_id',
            event.businessOpenId || event.senderOpenId
          );
          continue;
        }

        await ingestTikTokIncomingMessage({
          workspaceId: account.workspaceId,
          userId: account.userId || null,
          tiktokUserId: event.senderOpenId,
          username: event.username,
          avatarUrl: event.avatarUrl,
          content: event.content,
          mediaUrl: event.mediaUrl,
          senderId: event.senderOpenId,
          externalId: event.messageId,
          createdAt: event.createTime,
        });
      }
    } catch (error) {
      console.error('[webhooks/tiktok] ingest failed', error);
    }
  })();

  return NextResponse.json(
    { code: 0, message: 'success' },
    { status: 200 }
  );
}

/**
 * TikTok webhook — Developer Portal verification + event ingest.
 *
 * Callback URL: https://clikd.app/api/webhooks/tiktok
 *
 * GET  — verification handshake (challenge / hub.challenge → plain text 200)
 * POST — ack immediately with { code: 0 }; process im.message.receive / comment.create
 * HEAD — health check for portal URL probes
 */

import { NextResponse } from 'next/server';
import { extractTikTokImEvents } from '@/lib/tiktok/im-webhook';
import {
  ingestTikTokIncomingMessage,
  resolveTikTokAccountByOpenId,
} from '@/lib/tiktok/inbox-persist';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ACK = { code: 0, message: 'success' } as const;

function plainText(body: string, status = 200) {
  return new NextResponse(body, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function ackJson() {
  return NextResponse.json(ACK, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  });
}

/** Extract challenge from common TikTok / Meta-style verify query keys. */
function extractChallenge(url: URL): string {
  const keys = [
    'challenge',
    'hub.challenge',
    'hub_challenge',
    'echostr',
    'crc_token',
  ];
  for (const key of keys) {
    const value = url.searchParams.get(key);
    if (value != null && String(value).length > 0) {
      return String(value).trim();
    }
  }
  return '';
}

function eventName(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const root = payload as Record<string, unknown>;
  return String(root.event || root.type || '').trim();
}

/**
 * GET — TikTok / portal verification handshake.
 * Echo challenge as text/plain 200; otherwise "TikTok Webhook Ready".
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const challenge = extractChallenge(url);
    if (challenge) {
      return plainText(challenge, 200);
    }
    return plainText('TikTok Webhook Ready', 200);
  } catch (error) {
    console.error('[webhooks/tiktok] GET failed', error);
    return plainText('TikTok Webhook Ready', 200);
  }
}

/** HEAD — used by some URL health / portal probes. */
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  });
}

/**
 * POST — incoming events. Always acknowledge 200 + { code: 0 } immediately
 * after reading the body (TikTok retries on non-200).
 */
export async function POST(request: Request) {
  let rawText = '';
  try {
    rawText = await request.text();
  } catch {
    rawText = '';
  }

  // Fire-and-forget persistence — never block the ack.
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

      const event = eventName(payload);
      console.info('[webhooks/tiktok] event', event || '(unknown)');

      // comment.create — acknowledge + log (ingest path reserved for future)
      if (event === 'comment.create' || event.includes('comment')) {
        console.info('[webhooks/tiktok] comment event received', {
          event,
          preview: rawText.slice(0, 400),
        });
      }

      // im.message.receive (+ tolerant aliases) → Social Inbox
      const events = extractTikTokImEvents(payload);
      for (const im of events) {
        const account =
          (im.businessOpenId
            ? await resolveTikTokAccountByOpenId(im.businessOpenId)
            : null) ||
          (await resolveTikTokAccountByOpenId(im.senderOpenId));

        if (!account?.workspaceId) {
          console.warn(
            '[webhooks/tiktok] no social_accounts match for open_id',
            im.businessOpenId || im.senderOpenId
          );
          continue;
        }

        await ingestTikTokIncomingMessage({
          workspaceId: account.workspaceId,
          userId: account.userId || null,
          tiktokUserId: im.senderOpenId,
          username: im.username,
          avatarUrl: im.avatarUrl,
          content: im.content,
          mediaUrl: im.mediaUrl,
          senderId: im.senderOpenId,
          externalId: im.messageId,
          createdAt: im.createTime,
        });
      }
    } catch (error) {
      console.error('[webhooks/tiktok] ingest failed', error);
    }
  })();

  return ackJson();
}

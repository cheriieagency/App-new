/**
 * TikTok webhook — Developer Portal verification + event ingest.
 *
 * Prefer callback URL (no apex→www redirect):
 *   https://www.clikd.app/api/webhooks/tiktok
 *
 * GET  — echo challenge as plain text 200 (no auth / origin / IP checks)
 * POST — always { code: 0, message: "success" }; ingest IM / comment events
 * HEAD / OPTIONS — 200 for portal probes
 */

import { extractTikTokImEvents } from '@/lib/tiktok/im-webhook';
import {
  ingestTikTokIncomingMessage,
  resolveTikTokAccountByOpenId,
} from '@/lib/tiktok/inbox-persist';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ACK = { code: 0, message: 'success' } as const;

const PUBLIC_HEADERS: HeadersInit = {
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

function extractChallenge(url: URL): string {
  for (const key of [
    'challenge',
    'hub.challenge',
    'hub_challenge',
    'echostr',
    'crc_token',
  ]) {
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
 * GET — verification handshake.
 * Returns challenge as plain text 200; no Origin / IP / auth gates.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const challenge = extractChallenge(url);
  const body = challenge || 'TikTok Webhook Ready';
  return new Response(body, {
    status: 200,
    headers: {
      ...PUBLIC_HEADERS,
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

export async function HEAD() {
  return new Response(null, { status: 200, headers: PUBLIC_HEADERS });
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: PUBLIC_HEADERS });
}

/**
 * POST — always acknowledge immediately. No signature / origin / IP 403s.
 */
export async function POST(request: Request) {
  let rawText = '';
  try {
    rawText = await request.text();
  } catch {
    rawText = '';
  }

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

      if (event === 'comment.create' || event.includes('comment')) {
        console.info('[webhooks/tiktok] comment event received', {
          event,
          preview: rawText.slice(0, 400),
        });
      }

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

  return Response.json(ACK, { status: 200, headers: PUBLIC_HEADERS });
}

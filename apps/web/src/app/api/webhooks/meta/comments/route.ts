/**
 * Meta Instagram comments webhook — Comment-to-DM automation receiver.
 * GET: hub challenge verification
 * POST: keyword match → private reply (recipient.comment_id) + optional public reply
 */

import { missingEnvKeys, missingEnvResponse, metaEnv } from '@/lib/config/env';
import {
  extractCommentEventsFromWebhook,
  processCommentAutomationEvent,
} from '@/lib/dm-automations/engine';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const verifyToken = (process.env.META_WEBHOOK_VERIFY_TOKEN ?? '').trim();

  if (
    mode === 'subscribe' &&
    verifyToken.length > 0 &&
    token === verifyToken &&
    challenge != null
  ) {
    return new Response(challenge, { status: 200 });
  }

  return new Response('Forbidden', { status: 403 });
}

export async function POST(request: Request) {
  const missing = missingEnvKeys(...metaEnv.requiredKeys);
  if (missing.length) {
    return missingEnvResponse(missing, 'Meta / Instagram Graph API');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  console.log('[Meta Webhook Incoming]', JSON.stringify(body));

  // Parse both object === 'instagram' and object === 'page' structures.
  const root = body as {
    object?: string;
    entry?: Array<{
      id?: string;
      changes?: Array<{ field?: string; value?: Record<string, unknown> }>;
    }>;
  };
  const entry = root.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  console.log('[Meta Webhook Parsed]', {
    object: root.object,
    entryId: entry?.id,
    field: change?.field,
    commentId: value?.id || value?.comment_id,
    text: value?.text || value?.message,
    commenterId: (value?.from as { id?: string } | undefined)?.id,
    mediaId: (value?.media as { id?: string } | undefined)?.id,
  });

  const events = extractCommentEventsFromWebhook(body);
  const results = [];

  for (const event of events) {
    try {
      const result = await processCommentAutomationEvent(event);
      console.log('[Meta Webhook Dispatch]', {
        commentId: event.commentId,
        matched: result.matched,
        sent: result.sent,
        automationId: result.automationId,
        error: result.error,
      });
      results.push({
        commentId: event.commentId,
        ...result,
      });
    } catch (error) {
      console.warn('[webhooks/meta/comments]', error);
      results.push({
        commentId: event.commentId,
        matched: false,
        sent: false,
        error: error instanceof Error ? error.message : 'handler_failed',
      });
    }
  }

  // Always 200 quickly so Meta does not disable the subscription.
  return Response.json({
    ok: true,
    received: true,
    object: root.object ?? null,
    events: events.length,
    results,
  });
}

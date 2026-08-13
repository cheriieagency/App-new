/**
 * Meta Instagram comments webhook — Comment-to-DM automation receiver.
 * GET: hub challenge verification
 * POST: keyword match → private reply / DM + optional public comment reply
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

  // Read safely — trim; never throw if unset.
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

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const events = extractCommentEventsFromWebhook(payload);
  const results = [];

  for (const event of events) {
    try {
      const result = await processCommentAutomationEvent(event);
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
    events: events.length,
    results,
  });
}

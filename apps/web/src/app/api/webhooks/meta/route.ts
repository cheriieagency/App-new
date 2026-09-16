import { missingEnvKeys, missingEnvResponse, metaEnv } from '@/lib/config/env';
import {
  extractCommentEventsFromWebhook,
  processCommentAutomationEvent,
} from '@/lib/dm-automations/engine';
import { processDmFlowEvent } from '@/lib/dm-flows/engine';
import { extractMessagingEventsFromWebhook } from '@/lib/dm-flows/parse-webhook';

/**
 * Meta / Instagram Graph webhook.
 * GET  — hub challenge verification
 * POST — comments → Comment-to-DM · messages/postbacks → DM chat flows
 *
 * Always respond 200 so Meta never disables the subscription.
 */
export async function GET(request: Request) {
  const missing = missingEnvKeys(...metaEnv.requiredKeys);
  if (missing.length) {
    return missingEnvResponse(missing, 'Meta / Instagram Graph API');
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const expected = metaEnv.webhookVerifyToken();
  const received = String(token ?? '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .trim();

  if (
    mode === 'subscribe' &&
    expected &&
    received === expected &&
    challenge != null
  ) {
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return Response.json({ error: 'verification_failed' }, { status: 403 });
}

export async function POST(request: Request) {
  try {
    let payload: unknown = {};
    try {
      payload = await request.json();
    } catch {
      payload = {};
    }

    if (!process.env.DATABASE_URL?.trim()) {
      return Response.json({ ok: true, received: true, ignored: 'no_database' });
    }

    // ── Comment-to-DM (existing) ───────────────────────────────────────────
    const commentEvents = extractCommentEventsFromWebhook(payload);
    const commentResults = [];
    for (const event of commentEvents) {
      try {
        commentResults.push(await processCommentAutomationEvent(event));
      } catch (error) {
        console.warn('[webhooks/meta] comment automation', error);
        commentResults.push({
          matched: false,
          sent: false,
          error: error instanceof Error ? error.message : 'failed',
        });
      }
    }

    // ── DM chat flows (keyword → Quick Reply → condition → link) ─────────
    const dmEvents = extractMessagingEventsFromWebhook(payload);
    const dmResults = [];
    for (const event of dmEvents) {
      try {
        dmResults.push(await processDmFlowEvent(event));
      } catch (error) {
        console.warn('[webhooks/meta] dm flow', error);
        dmResults.push({
          matched: false,
          sent: false,
          error: error instanceof Error ? error.message : 'failed',
        });
      }
    }

    return Response.json({
      ok: true,
      received: true,
      commentEvents: commentEvents.length,
      commentResults,
      dmEvents: dmEvents.length,
      dmResults,
    });
  } catch (error) {
    console.error('[webhooks/meta] unhandled', error);
    return Response.json({ ok: true, received: true, error: 'unhandled' });
  }
}

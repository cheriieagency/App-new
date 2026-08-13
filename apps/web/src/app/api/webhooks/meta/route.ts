import { missingEnvKeys, missingEnvResponse, metaEnv } from '@/lib/config/env';
import {
  extractCommentEventsFromWebhook,
  processCommentAutomationEvent,
} from '@/lib/dm-automations/engine';

/**
 * Meta / Instagram Graph webhook.
 * GET — hub challenge verification
 * POST — comment events → Comment-to-DM engine (+ future messaging)
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

  if (mode === 'subscribe' && token && token === metaEnv.webhookVerifyToken()) {
    return new Response(challenge ?? '', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return Response.json({ error: 'verification_failed' }, { status: 403 });
}

export async function POST(request: Request) {
  const missing = missingEnvKeys(...metaEnv.requiredKeys);
  if (missing.length) {
    return missingEnvResponse(missing, 'Meta / Instagram Graph API');
  }

  let payload: unknown = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  // Forward Instagram comment changes into the Comment-to-DM engine.
  const events = extractCommentEventsFromWebhook(payload);
  const results = [];
  for (const event of events) {
    try {
      results.push(await processCommentAutomationEvent(event));
    } catch (error) {
      console.warn('[webhooks/meta] comment automation', error);
      results.push({
        matched: false,
        sent: false,
        error: error instanceof Error ? error.message : 'failed',
      });
    }
  }

  return Response.json({
    ok: true,
    received: true,
    commentEvents: events.length,
    results,
  });
}

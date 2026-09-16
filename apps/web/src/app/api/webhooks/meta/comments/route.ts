/**
 * Meta Instagram / Page comments webhook — Comment-to-DM automation receiver.
 * GET: hub challenge verification
 * POST: keyword match → shared engine (Private Reply + optional public reply)
 *
 * CRITICAL: Always respond 200 so Meta never disables the subscription.
 * Processing goes through processCommentAutomationEvent (same as /api/webhooks/meta
 * and the server cron) so webhook + poll + admin watch never double-send.
 */

import { NextResponse } from 'next/server';
import {
  extractCommentEventsFromWebhook,
  processCommentAutomationEvent,
} from '@/lib/dm-automations/engine';
import { ensureDmAutomationsSchema } from '@/lib/dm-automations/schema';

function ok(extra?: Record<string, unknown>) {
  return NextResponse.json({ success: true, ...extra }, { status: 200 });
}

/** META_WEBHOOK_VERIFY_TOKEN with trim + optional wrapping quotes stripped. */
function expectedVerifyToken(): string {
  return String(process.env.META_WEBHOOK_VERIFY_TOKEN ?? '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .trim();
}

/**
 * GET — Meta hub challenge verification.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const verifyToken = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  const expected = expectedVerifyToken();
  const received = String(verifyToken ?? '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .trim();

  if (
    mode === 'subscribe' &&
    expected &&
    received === expected &&
    challenge != null
  ) {
    console.log('[Meta Webhook Verified]', challenge);
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  console.warn('[Meta Webhook Verification Failed]', {
    mode,
    received: verifyToken,
    expected: expected ? '[set]' : '[empty]',
  });
  return new Response('Forbidden', { status: 403 });
}

/**
 * POST — Incoming Instagram / Page comment → shared Comment-to-DM engine.
 */
export async function POST(request: Request) {
  try {
    let payload: unknown = {};
    try {
      payload = await request.json();
    } catch {
      console.warn('[Meta Webhook] invalid JSON body');
      return ok({ ignored: true, reason: 'invalid_json' });
    }

    console.log(
      '[Meta Webhook Incoming]',
      typeof payload === 'object' ? JSON.stringify(payload).slice(0, 4000) : payload
    );

    try {
      await ensureDmAutomationsSchema();
    } catch (schemaErr) {
      console.warn('[Meta Webhook] schema ensure skipped', schemaErr);
    }

    if (!process.env.DATABASE_URL?.trim()) {
      console.warn('[Meta Webhook] DATABASE_URL missing');
      return ok({ ignored: true, reason: 'no_database' });
    }

    const events = extractCommentEventsFromWebhook(payload);
    const results: Array<{
      matched: boolean;
      sent: boolean;
      automationId?: string;
      error?: string;
    }> = [];

    for (const event of events) {
      try {
        results.push(await processCommentAutomationEvent(event));
      } catch (error) {
        console.error('[Meta Webhook] comment automation failed', error);
        results.push({
          matched: false,
          sent: false,
          error: error instanceof Error ? error.message : 'failed',
        });
      }
    }

    const sent = results.filter((r) => r.sent).length;
    console.log('[Meta Webhook] processed', {
      commentEvents: events.length,
      sent,
    });

    return ok({
      commentEvents: events.length,
      sent,
      results,
    });
  } catch (error) {
    console.error('[Meta Webhook] unhandled error', error);
    return ok({ error: 'unhandled' });
  }
}

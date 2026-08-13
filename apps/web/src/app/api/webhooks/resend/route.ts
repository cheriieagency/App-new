/**
 * POST /api/webhooks/resend
 * Resend engagement events → update email_broadcasts open/click rates.
 *
 * Configure in Resend dashboard → Webhooks →
 *   URL: https://your-domain/api/webhooks/resend
 *   Events: email.opened, email.clicked
 * Optional: set RESEND_WEBHOOK_SECRET and send it as header `x-resend-webhook-secret`.
 */

import { applyResendEngagementEvent } from '@/lib/email/crm-persist';
import { resendEnv } from '@/lib/config/env';

export async function POST(request: Request) {
  const expected = resendEnv.webhookSecret();
  if (expected) {
    const got =
      request.headers.get('x-resend-webhook-secret') ||
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
      '';
    if (got !== expected) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  let payload: {
    type?: string;
    data?: { email_id?: string; id?: string };
  };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const type = String(payload.type || '');
  const resendId = String(
    payload.data?.email_id || payload.data?.id || ''
  ).trim();

  if (!resendId) {
    return Response.json({ ok: true, ignored: true, reason: 'no_email_id' });
  }

  if (type === 'email.opened' || type.endsWith('.opened')) {
    const ok = await applyResendEngagementEvent({ resendId, type: 'opened' });
    return Response.json({ ok, type: 'opened', resendId });
  }

  if (type === 'email.clicked' || type.endsWith('.clicked')) {
    const ok = await applyResendEngagementEvent({ resendId, type: 'clicked' });
    return Response.json({ ok, type: 'clicked', resendId });
  }

  return Response.json({ ok: true, ignored: true, type });
}

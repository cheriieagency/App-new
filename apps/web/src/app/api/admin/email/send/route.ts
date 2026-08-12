import * as React from 'react';
import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';
import {
  createBroadcast,
  getMockEmailCrmPayload,
  listEmailSubscribers,
  type EmailSubscriber,
  type SubscriberSource,
} from '@/lib/mock-email-crm';
import { resendEnv } from '@/lib/config/env';
import { resendMissingResponse, sendEmail } from '@/lib/email/send';
import { buildUnsubscribeUrl } from '@/lib/email/unsubscribe';
import { BroadcastEmail } from '@/lib/email/templates/BroadcastEmail';
import {
  isCreatorRole,
  normalizePlatformRole,
  PLATFORM_ROLE_COOKIE,
} from '@/lib/platform-role';
import { getSiteUrl } from '@/lib/site';
import { requireFeature } from '@/lib/plan-guard';

type RecipientFilter = string;

type SendPayload = {
  workspaceId?: string;
  communityId?: number | string | null;
  subject?: string;
  bodyContent?: string;
  recipientFilter?: RecipientFilter;
  /** When true, only send to the signed-in admin (live delivery smoke test). */
  test?: boolean;
  imageUrl?: string | null;
};

async function requireWorkspaceAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const jar = await cookies();
  const role = normalizePlatformRole(jar.get(PLATFORM_ROLE_COOKIE)?.value);
  if (!isCreatorRole(role)) {
    return {
      error: Response.json(
        { error: 'Forbidden — workspace admin / creator role required' },
        { status: 403 }
      ),
    };
  }

  return { session };
}

function filterSubscribers(
  subscribers: EmailSubscriber[],
  recipientFilter: string
): EmailSubscriber[] {
  if (!recipientFilter || recipientFilter === 'all') return subscribers;
  return subscribers.filter(
    (s) =>
      s.source === recipientFilter ||
      s.tags.some((t) => t.toLowerCase().includes(recipientFilter.toLowerCase()))
  );
}

async function loadWorkspaceSubscribers(
  creatorId: string,
  recipientFilter: string,
  communityId?: number
): Promise<EmailSubscriber[]> {
  if (!process.env.DATABASE_URL?.trim()) {
    return filterSubscribers(
      listEmailSubscribers({ community_id: communityId }),
      recipientFilter
    );
  }

  try {
    const rows = communityId
      ? await sql`
          SELECT id, user_id, name, email, image, source, tags, community_id, subscribed_at
          FROM email_subscribers
          WHERE creator_id = ${creatorId}
            AND community_id = ${communityId}
          ORDER BY subscribed_at DESC
          LIMIT 2000
        `
      : await sql`
          SELECT id, user_id, name, email, image, source, tags, community_id, subscribed_at
          FROM email_subscribers
          WHERE creator_id = ${creatorId}
          ORDER BY subscribed_at DESC
          LIMIT 2000
        `;

    if (!Array.isArray(rows) || rows.length === 0) {
      // Empty real list — do not invent seed recipients for live sends.
      return [];
    }

    const mapped: EmailSubscriber[] = (rows as Array<Record<string, unknown>>).map((r) => ({
      id: String(r.id),
      user_id: (r.user_id as string) ?? null,
      name: String(r.name ?? ''),
      email: String(r.email ?? ''),
      image: (r.image as string) ?? null,
      source: String(r.source ?? 'community_member') as SubscriberSource,
      source_label: String(r.source ?? 'Community Member'),
      tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
      community_id: r.community_id != null ? Number(r.community_id) : null,
      subscribed_at: String(r.subscribed_at),
    }));

    return filterSubscribers(mapped, recipientFilter);
  } catch (err) {
    console.error('[email/send] subscriber query failed', err);
    return [];
  }
}

/**
 * POST /api/admin/email/send
 * Authenticated workspace admin → Resend broadcast or test email.
 */
export async function POST(request: Request) {
  const authResult = await requireWorkspaceAdmin();
  if ('error' in authResult && authResult.error) return authResult.error;
  const session = authResult.session!;

  // Full broadcasts require Creator+.
  const broadcastGate = await requireFeature('emailBroadcasts', request.headers);
  if (broadcastGate) return broadcastGate;

  if (!resendEnv.apiKey()) {
    return resendMissingResponse();
  }

  let body: SendPayload = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const subject = String(body.subject ?? '').trim();
  const bodyContent = String(body.bodyContent ?? '').trim();
  const recipientFilter = String(body.recipientFilter ?? 'all').trim() || 'all';
  const workspaceId = String(body.workspaceId ?? 'default').trim();
  const communityIdRaw = body.communityId;
  const communityId =
    communityIdRaw != null && communityIdRaw !== ''
      ? Number(communityIdRaw)
      : undefined;
  const scopedCommunityId =
    communityId != null && !Number.isNaN(communityId) ? communityId : undefined;
  const isTest = Boolean(body.test);
  const imageUrl =
    typeof body.imageUrl === 'string' && body.imageUrl.trim() ? body.imageUrl.trim() : null;

  if (!subject || !bodyContent) {
    return Response.json({ error: 'subject and bodyContent are required' }, { status: 400 });
  }

  const origin = getSiteUrl();
  const adminEmail = (session.user.email || '').toLowerCase().trim();
  const adminName = session.user.name || 'Creator';

  let recipients: { email: string; name: string }[] = [];

  if (isTest) {
    if (!adminEmail) {
      return Response.json({ error: 'Admin account has no email for test delivery' }, { status: 400 });
    }
    recipients = [{ email: adminEmail, name: adminName }];
  } else {
    const subscribers = await loadWorkspaceSubscribers(
      session.user.id,
      recipientFilter,
      scopedCommunityId
    );
    recipients = subscribers
      .map((s) => ({ email: s.email.toLowerCase().trim(), name: s.name }))
      .filter((s) => Boolean(s.email));

    // Deduplicate by email
    const seen = new Set<string>();
    recipients = recipients.filter((r) => {
      if (seen.has(r.email)) return false;
      seen.add(r.email);
      return true;
    });
  }

  if (recipients.length === 0) {
    return Response.json(
      { error: 'No recipients found for this workspace / filter' },
      { status: 400 }
    );
  }

  const results: { email: string; ok: boolean; id?: string; error?: string }[] = [];

  // Sequential send keeps Resend rate limits happy for demos; batch later if needed.
  for (const recipient of recipients) {
    const unsubscribeUrl = buildUnsubscribeUrl(recipient.email, origin);
    const firstName = recipient.name.trim().split(/\s+/)[0] || recipient.email.split('@')[0];

    const result = await sendEmail({
      to: recipient.email,
      subject: isTest ? `[TEST] ${subject}` : subject,
      unsubscribeEmail: recipient.email,
      tags: [
        { name: 'category', value: isTest ? 'crm_test' : 'crm_broadcast' },
        { name: 'workspace', value: workspaceId.slice(0, 40) },
      ],
      react: React.createElement(BroadcastEmail, {
        subject,
        bodyContent,
        firstName,
        imageUrl,
        unsubscribeUrl,
        workspaceName: 'clikd:',
      }),
    });

    if (result.ok) {
      results.push({ email: recipient.email, ok: true, id: result.id });
    } else {
      results.push({ email: recipient.email, ok: false, error: result.error });
    }
  }

  const sentCount = results.filter((r) => r.ok).length;
  const failedCount = results.length - sentCount;

  const broadcast = createBroadcast({
    subject,
    body: bodyContent,
    audience: recipientFilter,
    image_url: imageUrl,
    status: isTest ? 'test' : 'sent',
  });

  if (process.env.DATABASE_URL?.trim() && !isTest && sentCount > 0) {
    try {
      await sql`
        INSERT INTO email_broadcasts (
          creator_id, subject, body, audience, audience_label,
          recipient_count, open_rate, click_rate, status
        )
        VALUES (
          ${session.user.id},
          ${broadcast.subject},
          ${broadcast.body},
          ${broadcast.audience},
          ${broadcast.audience_label},
          ${sentCount},
          ${0},
          ${0},
          'sent'
        )
      `;
    } catch (e) {
      console.error('[email/send] broadcast persist failed', e);
    }
  }

  return Response.json({
    success: sentCount > 0,
    test: isTest,
    workspaceId,
    recipientFilter,
    sent: sentCount,
    failed: failedCount,
    results: isTest ? results : results.slice(0, 20),
    broadcast,
    demo: !process.env.DATABASE_URL?.trim(),
    // silence unused mock helper in some builds
    audiences: getMockEmailCrmPayload().audiences.length,
  });
}

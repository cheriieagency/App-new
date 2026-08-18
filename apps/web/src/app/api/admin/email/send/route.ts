import * as React from 'react';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';
import {
  applyMergeTags,
  createBroadcast,
  getMockEmailCrmPayload,
  listEmailSubscribers,
  type EmailSubscriber,
  type SubscriberSource,
} from '@/lib/mock-email-crm';
import { resendEnv } from '@/lib/config/env';
import { buildCommunityAccessUrl } from '@/lib/community-access-email';
import { ensureEmailCrmSchema, trackBroadcastMessages } from '@/lib/email/crm-persist';
import { stripEmailImageToken } from '@/lib/email/image-token';
import { resendMissingResponse, sendEmail } from '@/lib/email/send';
import { buildUnsubscribeUrl } from '@/lib/email/unsubscribe';
import {
  BroadcastEmail,
  type BroadcastImagePlacement,
} from '@/lib/email/templates/BroadcastEmail';
import { ensurePublicHttpsMediaUrl } from '@/lib/supabase/storage';
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
  imagePlacement?: BroadcastImagePlacement;
};

async function requireEmailSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
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
    await ensureEmailCrmSchema();
    const rows = communityId
      ? await sql`
          SELECT id, user_id, name, email, image, source, tags, community_id, subscribed_at
          FROM email_subscribers
          WHERE creator_id = ${creatorId}
            AND (community_id = ${communityId} OR community_id IS NULL)
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

async function resolveCommunityName(communityId?: number): Promise<string> {
  if (!communityId || !process.env.DATABASE_URL?.trim()) {
    return 'your community';
  }
  try {
    const rows = await sql`
      SELECT name FROM communities WHERE id = ${communityId} LIMIT 1
    `;
    const name = rows?.[0]?.name;
    return name ? String(name) : 'your community';
  } catch {
    return 'your community';
  }
}

/**
 * POST /api/admin/email/send
 * Authenticated creator session → Resend broadcast or test email.
 */
export async function POST(request: Request) {
  const authResult = await requireEmailSession();
  if ('error' in authResult && authResult.error) return authResult.error;
  const session = authResult.session!;

  let body: SendPayload = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const isTest = Boolean(body.test);

  // Test emails are always allowed; full broadcasts require Creator+.
  if (!isTest) {
    const broadcastGate = await requireFeature('emailBroadcasts', request.headers);
    if (broadcastGate) return broadcastGate;
  }

  if (!resendEnv.apiKey()) {
    return resendMissingResponse();
  }

  const subject = String(body.subject ?? '').trim();
  let bodyContent = String(body.bodyContent ?? '').trim();
  const recipientFilter = String(body.recipientFilter ?? 'all').trim() || 'all';
  const workspaceId = String(body.workspaceId ?? 'default').trim();
  const communityIdRaw = body.communityId;
  const communityId =
    communityIdRaw != null && communityIdRaw !== ''
      ? Number(communityIdRaw)
      : undefined;
  const scopedCommunityId =
    communityId != null && !Number.isNaN(communityId) ? communityId : undefined;
  const imagePlacementRaw = String(body.imagePlacement ?? 'top').toLowerCase();
  const imagePlacement: BroadcastImagePlacement =
    imagePlacementRaw === 'middle' ||
    imagePlacementRaw === 'bottom' ||
    imagePlacementRaw === 'inline'
      ? imagePlacementRaw
      : 'top';
  let imageUrl =
    typeof body.imageUrl === 'string' && body.imageUrl.trim()
      ? body.imageUrl.trim()
      : null;

  if (!imageUrl) {
    bodyContent = stripEmailImageToken(bodyContent).trim();
  }

  if (!subject || !bodyContent) {
    return Response.json({ error: 'subject and bodyContent are required' }, { status: 400 });
  }

  if (imageUrl) {
    try {
      imageUrl = await ensurePublicHttpsMediaUrl(imageUrl);
    } catch (error) {
      return Response.json(
        {
          error: 'invalid_image_url',
          message:
            error instanceof Error
              ? error.message
              : 'Image must be a public HTTPS URL (upload again)',
        },
        { status: 400 }
      );
    }
  }

  const origin = getSiteUrl();
  const adminEmail = (session.user.email || '').toLowerCase().trim();
  const adminName = session.user.name || 'Creator';
  const communityName = await resolveCommunityName(scopedCommunityId);
  const communityUrl = scopedCommunityId
    ? buildCommunityAccessUrl(scopedCommunityId, origin)
    : `${origin}/communities`;

  let recipients: { email: string; name: string }[] = [];

  if (isTest) {
    if (!adminEmail) {
      return Response.json(
        { error: 'Admin account has no email for test delivery' },
        { status: 400 }
      );
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

    const seen = new Set<string>();
    recipients = recipients.filter((r) => {
      if (seen.has(r.email)) return false;
      seen.add(r.email);
      return true;
    });
  }

  if (recipients.length === 0) {
    return Response.json(
      {
        error: 'no_recipients',
        message:
          'No subscribers match this audience filter. Import contacts or sync community members first.',
      },
      { status: 400 }
    );
  }

  const results: { email: string; ok: boolean; id?: string; error?: string }[] = [];

  for (const recipient of recipients) {
    const firstName =
      recipient.name.trim().split(/\s+/)[0] || recipient.email.split('@')[0];
    const mergeCtx = {
      name: recipient.name || firstName,
      email: recipient.email,
      community: communityName,
      communityUrl,
    };
    const personalizedBody = applyMergeTags(bodyContent, firstName, mergeCtx);
    const personalizedSubject = applyMergeTags(subject, firstName, mergeCtx);

    const result = await sendEmail({
      to: recipient.email,
      subject: isTest ? `[TEST] ${personalizedSubject}` : personalizedSubject,
      unsubscribeEmail: recipient.email,
      tags: [
        { name: 'category', value: isTest ? 'crm_test' : 'crm_broadcast' },
        {
          name: 'workspace',
          value: workspaceId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 40) || 'default',
        },
      ],
      react: React.createElement(BroadcastEmail, {
        subject: personalizedSubject,
        bodyContent: personalizedBody,
        imageUrl,
        imagePlacement,
        unsubscribeUrl: buildUnsubscribeUrl(recipient.email, origin),
        workspaceName: communityName,
      }),
    });

    if (result.ok) {
      results.push({ email: recipient.email, ok: true, id: result.id });
    } else {
      const detail =
        result.error === 'missing_env' && result.missingEnv?.length
          ? `Missing env: ${result.missingEnv.join(', ')}`
          : result.error;
      results.push({ email: recipient.email, ok: false, error: detail });
    }
  }

  const sentCount = results.filter((r) => r.ok).length;
  const failedCount = results.length - sentCount;
  const firstError = results.find((r) => !r.ok)?.error;

  const broadcast = createBroadcast({
    subject,
    body: bodyContent,
    audience: recipientFilter,
    image_url: imageUrl,
    status: isTest ? 'test' : 'sent',
  });

  if (process.env.DATABASE_URL?.trim() && !isTest && sentCount > 0) {
    try {
      const inserted = await sql`
        INSERT INTO email_broadcasts (
          creator_id, subject, body, audience, audience_label,
          recipient_count, open_rate, click_rate, status, image_url
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
          'sent',
          ${imageUrl}
        )
        RETURNING id
      `;
      const broadcastId = Number(inserted?.[0]?.id);
      if (Number.isFinite(broadcastId) && broadcastId > 0) {
        await trackBroadcastMessages({
          creatorId: session.user.id,
          broadcastId,
          messages: results
            .filter((r) => r.ok && r.id)
            .map((r) => ({ email: r.email, resendId: String(r.id) })),
        });
      }
    } catch (e) {
      console.error('[email/send] broadcast persist failed', e);
    }
  }

  if (sentCount === 0) {
    return Response.json(
      {
        success: false,
        test: isTest,
        workspaceId,
        recipientFilter,
        sent: 0,
        failed: failedCount,
        results,
        error: firstError || 'send_failed',
        message: firstError || 'Email delivery failed. Check RESEND_API_KEY and RESEND_FROM_EMAIL.',
      },
      { status: 502 }
    );
  }

  return Response.json({
    success: true,
    test: isTest,
    workspaceId,
    recipientFilter,
    sent: sentCount,
    failed: failedCount,
    results: isTest ? results : results.slice(0, 20),
    broadcast,
    demo: !process.env.DATABASE_URL?.trim(),
    audiences: getMockEmailCrmPayload().audiences.length,
  });
}

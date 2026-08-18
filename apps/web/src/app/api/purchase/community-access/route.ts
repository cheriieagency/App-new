import sql from '@/app/api/utils/sql';
import {
  buildCommunityAccessEmail,
  buildCommunityAccessUrl,
} from '@/lib/community-access-email';
import { listManagedCommunities } from '@/lib/mock-community-admin';
import {
  fireEmailAutomations,
  persistSubscriber,
  recordPersistedCommunityEmailSend,
} from '@/lib/email/crm-persist';
import { sendCommunityAccessInvite } from '@/lib/mock-email-crm';
import { sendCommunityWelcomeEmail, sendOrderReceiptEmail } from '@/lib/email/transactional';
import { getSiteUrl } from '@/lib/site';

/**
 * Public post-purchase hook: email the buyer a direct link into the community
 * they unlocked with their purchase (+ optional order receipt).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const buyerEmail = String(body.email ?? '')
      .trim()
      .toLowerCase();
    const buyerName = String(body.name ?? '').trim() || buyerEmail.split('@')[0] || 'Buyer';
    const productTitle = String(body.product_title ?? 'Your purchase').trim();
    const communityId = Number(body.community_id);
    const amountSek = Number(body.amount_sek ?? body.amount ?? 0);

    if (!buyerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
      return Response.json({ error: 'Valid email required' }, { status: 400 });
    }
    if (!Number.isFinite(communityId) || communityId <= 0) {
      return Response.json({ error: 'community_id required' }, { status: 400 });
    }

    const community =
      listManagedCommunities().find((c) => c.id === communityId) ?? null;
    const communityName =
      String(body.community_name ?? '').trim() ||
      community?.name ||
      `Community ${communityId}`;

    const origin =
      String(body.origin ?? '').trim() ||
      request.headers.get('origin') ||
      getSiteUrl();

    const communityUrl = buildCommunityAccessUrl(communityId, origin);
    const result = process.env.DATABASE_URL?.trim()
      ? {
          communityUrl,
          preview: buildCommunityAccessEmail({
            buyerName,
            buyerEmail,
            productTitle,
            communityId,
            communityName,
            origin,
          }).body,
          broadcast: { id: null },
        }
      : sendCommunityAccessInvite({
          buyerName,
          buyerEmail,
          productTitle,
          communityId,
          communityName,
          origin,
        });

    let creatorId: string | null = null;
    if (process.env.DATABASE_URL?.trim()) {
      try {
        const owners = await sql`
          SELECT creator_id, name FROM communities WHERE id = ${communityId} LIMIT 1
        `;
        creatorId = (owners?.[0]?.creator_id as string) || null;
        if (owners?.[0]?.name) {
          // Prefer live community name from DB when present.
        }
      } catch {
        /* ignore */
      }
    }

    if (creatorId) {
      await persistSubscriber({
        creatorId,
        email: buyerEmail,
        name: buyerName,
        source: 'vip_access',
        communityId,
        tags: ['Community Access', productTitle],
      });
    }

    const composed = buildCommunityAccessEmail({
      buyerName,
      buyerEmail,
      productTitle,
      communityId,
      communityName,
      origin,
    });

    // Prefer rule-driven automations; fall back to default welcome template.
    let automationSent = 0;
    if (creatorId) {
      const fired = await fireEmailAutomations({
        creatorId,
        communityId,
        communityName,
        communityUrl: result.communityUrl,
        trigger: 'purchase_community_access',
        recipientEmail: buyerEmail,
        recipientName: buyerName,
      });
      automationSent = fired.sent;
    }

    const welcome =
      automationSent > 0
        ? { ok: true as const, id: 'automation' }
        : await sendCommunityWelcomeEmail({
            to: buyerEmail,
            memberName: buyerName,
            communityId,
            communityName,
            origin,
          });

    if (creatorId && automationSent === 0 && welcome.ok) {
      await recordPersistedCommunityEmailSend({
        creatorId,
        communityId,
        communityName,
        kind: 'purchase_access',
        subject: composed.subject,
        recipientName: buyerName,
        recipientEmail: buyerEmail,
        resendId: welcome.id,
        productTitle,
      });
    }

    let receipt: Awaited<ReturnType<typeof sendOrderReceiptEmail>> | null = null;
    if (Number.isFinite(amountSek) && amountSek > 0) {
      receipt = await sendOrderReceiptEmail({
        to: buyerEmail,
        buyerName,
        productTitle,
        amountSek,
        workspaceName: communityName,
      });
    }

    return Response.json({
      success: true,
      demo: !welcome.ok,
      community_url: result.communityUrl,
      community_name: communityName,
      email: {
        to: buyerEmail,
        subject: composed.subject,
        preview: result.preview,
        automation_sent: automationSent,
        resend: welcome.ok
          ? { ok: true, id: welcome.id }
          : {
              ok: false,
              error:
                'error' in welcome ? String(welcome.error) : 'send_failed',
              missingEnv:
                'missingEnv' in welcome ? welcome.missingEnv : undefined,
            },
        receipt: receipt
          ? receipt.ok
            ? { ok: true, id: receipt.id }
            : { ok: false, error: receipt.error }
          : null,
      },
      broadcast_id: result.broadcast.id,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to send community access email' }, { status: 500 });
  }
}

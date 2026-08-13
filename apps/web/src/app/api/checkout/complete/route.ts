/**
 * POST /api/checkout/complete
 * Record a completed storefront / Link-in-Bio purchase (demo or post-Stripe).
 * Coaching products → Google Calendar + Meet + receipt email.
 */

import sql from '@/app/api/utils/sql';
import {
  recordCompletedOrder,
  ensureCommerceSchema,
  attachGoogleMeetToOrder,
} from '@/lib/commerce/orders';
import { getGoogleAccessTokenForSellerWorkspace } from '@/lib/google/tokens';
import {
  createGoogleMeetEvent,
  defaultCoachingSlot,
  looksLikeCoachingProduct,
} from '@/lib/google/calendar';
import { sendOrderReceiptEmail } from '@/lib/email/transactional';

async function resolveSellerUserId(input: {
  workspaceId: string;
  handle?: string | null;
  sellerUserId?: string | null;
}): Promise<string | null> {
  if (input.sellerUserId?.trim()) return input.sellerUserId.trim();

  if (!process.env.DATABASE_URL?.trim()) return null;
  await ensureCommerceSchema();

  try {
    const ws = await sql`
      SELECT user_id FROM public.workspaces
      WHERE id = ${input.workspaceId}
      LIMIT 1
    `;
    if (ws?.[0]?.user_id) return String(ws[0].user_id);
  } catch {
    /* continue */
  }

  const handle = input.handle?.trim().replace(/^@/, '').toLowerCase();
  if (handle) {
    try {
      const bio = await sql`
        SELECT user_id FROM bio_blocks
        WHERE lower(handle) = ${handle}
        LIMIT 1
      `;
      if (bio?.[0]?.user_id) return String(bio[0].user_id);
    } catch {
      /* continue */
    }
    try {
      const profile = await sql`
        SELECT id FROM public.profiles
        WHERE lower(handle) = ${handle}
        LIMIT 1
      `;
      if (profile?.[0]?.id) return String(profile[0].id);
    } catch {
      /* continue */
    }
  }

  try {
    const byId = await sql`
      SELECT id FROM "user" WHERE id = ${input.workspaceId} LIMIT 1
    `;
    if (byId?.[0]?.id) return String(byId[0].id);
  } catch {
    /* continue */
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      workspaceId?: unknown;
      handle?: unknown;
      sellerUserId?: unknown;
      productId?: unknown;
      productTitle?: unknown;
      productType?: unknown;
      amountGrossSek?: unknown;
      buyerEmail?: unknown;
      buyerName?: unknown;
      provider?: unknown;
      externalId?: unknown;
      metadata?: unknown;
      bookingStartTimeISO?: unknown;
      bookingEndTimeISO?: unknown;
    };

    const workspaceId = String(body.workspaceId ?? '').trim();
    const productTitle = String(body.productTitle ?? 'Product').trim() || 'Product';
    const amountGrossSek = Math.max(0, Math.round(Number(body.amountGrossSek) || 0));
    const buyerEmail =
      body.buyerEmail != null ? String(body.buyerEmail).trim() : '';
    const buyerName =
      body.buyerName != null ? String(body.buyerName).trim() : 'Buyer';
    const metadata =
      body.metadata && typeof body.metadata === 'object'
        ? (body.metadata as Record<string, unknown>)
        : {};

    if (!workspaceId) {
      return Response.json({ error: 'workspaceId required' }, { status: 400 });
    }
    if (amountGrossSek <= 0) {
      return Response.json({ error: 'amountGrossSek must be > 0' }, { status: 400 });
    }

    const sellerUserId = await resolveSellerUserId({
      workspaceId,
      handle: body.handle != null ? String(body.handle) : null,
      sellerUserId: body.sellerUserId != null ? String(body.sellerUserId) : null,
    });

    if (!sellerUserId) {
      return Response.json({
        ok: false,
        recorded: false,
        message:
          'Seller workspace is not linked yet. Sale kept client-side until the creator publishes a bio / workspace.',
      });
    }

    let creditWorkspaceId = workspaceId;
    try {
      const owned = await sql`
        SELECT id FROM public.workspaces
        WHERE id = ${workspaceId} OR user_id = ${sellerUserId}
        ORDER BY CASE WHEN id = ${workspaceId} THEN 0 ELSE 1 END, updated_at DESC
        LIMIT 1
      `;
      if (owned?.[0]?.id) {
        creditWorkspaceId = String(owned[0].id);
      }
    } catch {
      /* keep client workspaceId */
    }

    const order = await recordCompletedOrder({
      workspaceId: creditWorkspaceId,
      sellerUserId,
      buyerEmail: buyerEmail || null,
      buyerName: buyerName || null,
      productId: body.productId != null ? String(body.productId) : null,
      productTitle,
      amountGrossSek,
      provider:
        body.provider === 'stripe' || body.provider === 'manual'
          ? body.provider
          : 'demo',
      externalId: body.externalId != null ? String(body.externalId) : null,
      metadata,
    });

    if (!order) {
      return Response.json({
        ok: false,
        recorded: false,
        message: 'Database unavailable — sale not persisted.',
      });
    }

    let googleMeetUrl: string | null = null;
    const isCoaching = looksLikeCoachingProduct({
      productTitle,
      productType: body.productType != null ? String(body.productType) : null,
      metadata,
    });

    if (isCoaching) {
      try {
        const tokens = await getGoogleAccessTokenForSellerWorkspace({
          sellerUserId,
          workspaceId: creditWorkspaceId,
        });
        if (tokens) {
          const slot =
            body.bookingStartTimeISO && body.bookingEndTimeISO
              ? {
                  startIso: String(body.bookingStartTimeISO),
                  endIso: String(body.bookingEndTimeISO),
                }
              : defaultCoachingSlot(60);

          const event = await createGoogleMeetEvent({
            accessToken: tokens.accessToken,
            summary: `1:1 Coaching Call with ${buyerName || 'Buyer'}`,
            description: `Booked via Clikd Bio Storefront. Buyer: ${buyerEmail || 'n/a'}`,
            startIso: slot.startIso,
            endIso: slot.endIso,
            sellerEmail: tokens.email,
            buyerEmail: buyerEmail || null,
          });

          googleMeetUrl = event.hangoutLink;
          if (googleMeetUrl) {
            await attachGoogleMeetToOrder({
              orderId: order.id,
              meetUrl: googleMeetUrl,
              eventId: event.eventId,
              htmlLink: event.htmlLink,
            });
          }
        }
      } catch (error) {
        console.warn('[checkout/complete] meet booking', error);
      }
    }

    if (buyerEmail.includes('@')) {
      try {
        await sendOrderReceiptEmail({
          to: buyerEmail,
          buyerName: buyerName || 'there',
          productTitle,
          amountSek: amountGrossSek,
          orderId: String(order.id),
          meetUrl: googleMeetUrl,
        });
      } catch (error) {
        console.warn('[checkout/complete] receipt email', error);
      }
    }

    return Response.json({
      ok: true,
      recorded: true,
      order: {
        ...order,
        google_meet_url: googleMeetUrl,
      },
      googleMeetUrl,
    });
  } catch (error) {
    console.warn('[checkout/complete]', error);
    return Response.json(
      {
        ok: false,
        recorded: false,
        error: error instanceof Error ? error.message : 'Failed to record order',
      },
      { status: 500 }
    );
  }
}

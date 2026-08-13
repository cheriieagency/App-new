/**
 * Stripe webhook — credits creator wallets on checkout.session.completed.
 * Coaching products also create a Google Meet event when seller has Google connected.
 */

import { missingEnvKeys, missingEnvResponse, stripeEnv } from '@/lib/config/env';
import { getStripe } from '@/lib/commerce/stripe';
import {
  attachGoogleMeetToOrder,
  recordCompletedOrder,
} from '@/lib/commerce/orders';
import { getGoogleAccessTokenForSellerWorkspace } from '@/lib/google/tokens';
import {
  createGoogleMeetEvent,
  defaultCoachingSlot,
  looksLikeCoachingProduct,
} from '@/lib/google/calendar';
import { sendOrderReceiptEmail } from '@/lib/email/transactional';
import type Stripe from 'stripe';

export async function POST(request: Request) {
  const missing = missingEnvKeys(
    ...stripeEnv.requiredKeys,
    ...stripeEnv.webhookRequiredKeys
  );
  if (missing.length) {
    return missingEnvResponse(missing, 'Stripe');
  }

  const stripe = getStripe();
  const webhookSecret = stripeEnv.webhookSecret();
  if (!stripe || !webhookSecret) {
    return Response.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return Response.json({ error: 'missing_stripe_signature' }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.warn('[stripe webhook] signature', error);
    return Response.json({ error: 'invalid_signature' }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const meta = session.metadata || {};
      const workspaceId = String(meta.workspace_id || '').trim();
      const sellerUserId = String(meta.seller_user_id || '').trim();
      const productTitle =
        String(meta.product_title || '').trim() || 'Product';
      const productType = String(meta.product_type || '').trim();
      const buyerEmail =
        session.customer_details?.email || session.customer_email || null;
      const buyerName = session.customer_details?.name || null;
      const amountGrossSek = Math.max(
        0,
        Math.round(
          Number(meta.amount_gross_sek) ||
            (typeof session.amount_total === 'number'
              ? session.amount_total / 100
              : 0)
        )
      );

      if (workspaceId && sellerUserId && amountGrossSek > 0) {
        const order = await recordCompletedOrder({
          workspaceId,
          sellerUserId,
          buyerEmail,
          buyerName,
          productId: meta.product_id || null,
          productTitle,
          amountGrossSek,
          provider: 'stripe',
          externalId: session.id,
          metadata: {
            payment_intent: session.payment_intent,
            handle: meta.handle || null,
            productType: productType || null,
          },
        });

        let googleMeetUrl: string | null = null;
        if (
          order &&
          looksLikeCoachingProduct({
            productTitle,
            productType,
            metadata: { productType },
          })
        ) {
          try {
            const tokens = await getGoogleAccessTokenForSellerWorkspace({
              sellerUserId,
              workspaceId,
            });
            if (tokens) {
              const slot = defaultCoachingSlot(60);
              const meetEvent = await createGoogleMeetEvent({
                accessToken: tokens.accessToken,
                summary: `1:1 Coaching Call with ${buyerName || 'Buyer'}`,
                description: `Booked via Clikd Bio Storefront. Buyer: ${buyerEmail || 'n/a'}`,
                startIso: slot.startIso,
                endIso: slot.endIso,
                sellerEmail: tokens.email,
                buyerEmail,
              });
              googleMeetUrl = meetEvent.hangoutLink;
              if (googleMeetUrl) {
                await attachGoogleMeetToOrder({
                  orderId: order.id,
                  meetUrl: googleMeetUrl,
                  eventId: meetEvent.eventId,
                  htmlLink: meetEvent.htmlLink,
                });
              }
            }
          } catch (error) {
            console.warn('[stripe webhook] meet booking', error);
          }
        }

        if (buyerEmail?.includes('@')) {
          try {
            await sendOrderReceiptEmail({
              to: buyerEmail,
              buyerName: buyerName || 'there',
              productTitle,
              amountSek: amountGrossSek,
              orderId: order ? String(order.id) : session.id,
              meetUrl: googleMeetUrl,
            });
          } catch (error) {
            console.warn('[stripe webhook] receipt email', error);
          }
        }
      }
    }

    if (event.type === 'account.updated') {
      const account = event.data.object as Stripe.Account;
      const chargesEnabled = Boolean(
        account.charges_enabled && account.payouts_enabled
      );
      if (account.id && process.env.DATABASE_URL?.trim()) {
        const sql = (await import('@/app/api/utils/sql')).default;
        await sql`
          UPDATE public.workspaces
          SET
            stripe_connect_enabled = ${chargesEnabled},
            updated_at = now()
          WHERE stripe_connect_account_id = ${account.id}
        `;
      }
    }
  } catch (error) {
    console.warn('[stripe webhook] handler', error);
    return Response.json({ error: 'handler_failed' }, { status: 500 });
  }

  return Response.json({ ok: true, received: true, type: event.type });
}

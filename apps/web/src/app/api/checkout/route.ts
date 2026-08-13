/**
 * POST /api/checkout
 * Create a Stripe Checkout Session for a Link-in-Bio / store product.
 * Metadata carries workspace + product so the webhook can credit the wallet.
 */

import { appBaseUrl, missingEnvKeys, missingEnvResponse, stripeEnv } from '@/lib/config/env';
import { getStripe } from '@/lib/commerce/stripe';
import { ensureCommerceSchema } from '@/lib/commerce/orders';
import sql from '@/app/api/utils/sql';

export async function POST(request: Request) {
  const missing = missingEnvKeys(...stripeEnv.requiredKeys);
  if (missing.length) {
    return missingEnvResponse(missing, 'Stripe');
  }

  const stripe = getStripe();
  if (!stripe) {
    return Response.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  try {
    const body = (await request.json()) as {
      workspaceId?: unknown;
      sellerUserId?: unknown;
      handle?: unknown;
      productId?: unknown;
      productTitle?: unknown;
      amountGrossSek?: unknown;
      buyerEmail?: unknown;
      successUrl?: unknown;
      cancelUrl?: unknown;
    };

    const workspaceId = String(body.workspaceId ?? '').trim();
    const productTitle = String(body.productTitle ?? 'Product').trim() || 'Product';
    const amountGrossSek = Math.max(0, Math.round(Number(body.amountGrossSek) || 0));
    const sellerUserId = String(body.sellerUserId ?? '').trim();
    const origin = appBaseUrl(request.headers.get('origin'));

    if (!workspaceId || amountGrossSek <= 0) {
      return Response.json(
        { error: 'workspaceId and amountGrossSek required' },
        { status: 400 }
      );
    }

    if (process.env.DATABASE_URL?.trim() && sellerUserId) {
      await ensureCommerceSchema();
      try {
        await sql`
          INSERT INTO public.workspaces (id, user_id)
          VALUES (${workspaceId}, ${sellerUserId})
          ON CONFLICT (id) DO UPDATE SET
            user_id = COALESCE(workspaces.user_id, EXCLUDED.user_id),
            updated_at = now()
        `;
      } catch {
        /* FK soft-fail for demo workspaces */
      }
    }

    const successUrl =
      String(body.successUrl ?? '').trim() ||
      `${origin}/bio/${encodeURIComponent(String(body.handle || 'creator'))}?checkout=success`;
    const cancelUrl =
      String(body.cancelUrl ?? '').trim() ||
      `${origin}/bio/${encodeURIComponent(String(body.handle || 'creator'))}?checkout=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email:
        body.buyerEmail != null && String(body.buyerEmail).includes('@')
          ? String(body.buyerEmail)
          : undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'sek',
            unit_amount: amountGrossSek * 100,
            product_data: { name: productTitle },
          },
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        workspace_id: workspaceId,
        seller_user_id: sellerUserId,
        product_id: String(body.productId ?? ''),
        product_title: productTitle.slice(0, 200),
        handle: String(body.handle ?? ''),
        amount_gross_sek: String(amountGrossSek),
      },
    });

    return Response.json({
      ok: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.warn('[checkout]', error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Checkout session failed',
      },
      { status: 500 }
    );
  }
}

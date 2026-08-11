import { missingEnvKeys, missingEnvResponse, stripeEnv } from '@/lib/config/env';

/**
 * Stripe webhook receiver.
 * Requires STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET in apps/web/.env.local.
 */
export async function POST(request: Request) {
  const missing = missingEnvKeys(
    ...stripeEnv.requiredKeys,
    ...stripeEnv.webhookRequiredKeys
  );
  if (missing.length) {
    return missingEnvResponse(missing, 'Stripe');
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return Response.json({ error: 'missing_stripe_signature' }, { status: 400 });
  }

  // Signature verification + event dispatch will use stripeEnv.secretKey() /
  // stripeEnv.webhookSecret() when checkout is fully wired.
  const _rawBody = await request.text();
  void _rawBody;

  return Response.json({
    ok: true,
    received: true,
    hint: 'Stripe webhook stub — wire event handlers when enabling live checkout.',
  });
}

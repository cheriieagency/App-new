import { missingEnvKeys, missingEnvResponse, stripeEnv } from '@/lib/config/env';

/**
 * Stripe Checkout session stub.
 * Requires STRIPE_SECRET_KEY (+ publishable key on the client) in apps/web/.env.local.
 */
export async function POST() {
  const missing = missingEnvKeys(...stripeEnv.requiredKeys);
  if (missing.length) {
    return missingEnvResponse(missing, 'Stripe Checkout');
  }

  return Response.json({
    ok: true,
    hint: 'Stripe Checkout stub — create PaymentIntent / Checkout Session when enabling paid products.',
    publishableKeyConfigured: Boolean(stripeEnv.publishableKey()),
  });
}

export async function GET() {
  const missing = missingEnvKeys(...stripeEnv.requiredKeys);
  if (missing.length) {
    return missingEnvResponse(missing, 'Stripe Checkout');
  }

  return Response.json({
    ok: true,
    configured: true,
    publishableKeyConfigured: Boolean(stripeEnv.publishableKey()),
  });
}

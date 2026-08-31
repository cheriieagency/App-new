/**
 * POST /api/billing/subscribe
 * Stripe Checkout for clikd: platform plans (Creator / Pro).
 */

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  getPlanPriceInCurrency,
  normalizeBillingCycle,
  normalizeCheckoutCurrency,
  normalizeSignupPlan,
} from '@/lib/billing/plan-prices';
import { appBaseUrl, missingEnvKeys, stripeEnv } from '@/lib/config/env';
import type { WorkspacePlan } from '@/lib/config/plans';
import { getStripe } from '@/lib/commerce/stripe';
import { setProfileSubscription } from '@/lib/subscription-profile';

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { plan?: unknown; billing?: unknown; currency?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const plan = normalizeSignupPlan(body.plan);
  const billing = normalizeBillingCycle(body.billing);
  const currency = normalizeCheckoutCurrency(body.currency);

  if (plan === 'starter') {
    await setProfileSubscription({
      userId: session.user.id,
      email: session.user.email,
      plan: 'starter',
      status: 'inactive',
      onboardingCompleted: true,
    });
    return Response.json({ ok: true, plan: 'starter', url: null, redirect: '/admin' });
  }

  const missing = missingEnvKeys(...stripeEnv.requiredKeys);
  if (missing.length) {
    await setProfileSubscription({
      userId: session.user.id,
      email: session.user.email,
      plan,
      status: 'active',
      onboardingCompleted: true,
    });
    return Response.json({
      ok: true,
      plan,
      url: null,
      redirect: '/admin',
      demo: true,
      message: 'Stripe not configured — plan activated for testing.',
    });
  }

  const stripe = getStripe();
  if (!stripe) {
    return Response.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const priced = getPlanPriceInCurrency({
    plan: plan as Exclude<WorkspacePlan, 'starter'>,
    billing,
    currency,
  });
  const origin = appBaseUrl(request.headers.get('origin'));
  const planLabel = plan === 'pro' ? 'Pro/Agency' : 'Creator';

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: session.user.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: priced.amount * 100,
          recurring: {
            interval: billing === 'yearly' ? 'year' : 'month',
          },
          product_data: {
            name: `clikd: ${planLabel}`,
            description: `Platform subscription — ${planLabel} (${billing})`,
          },
        },
      },
    ],
    success_url: `${origin}/admin?subscription=success&plan=${plan}`,
    cancel_url: `${origin}/onboarding?plan=${plan}&billing=${billing}&currency=${currency}&checkout=cancel`,
    metadata: {
      kind: 'platform_subscription',
      user_id: session.user.id,
      plan,
      billing,
      currency,
      amount_major: String(priced.amount),
      amount_sek: String(priced.amountSek),
    },
    subscription_data: {
      metadata: {
        kind: 'platform_subscription',
        user_id: session.user.id,
        plan,
        billing,
        currency,
      },
    },
  });

  return Response.json({
    ok: true,
    plan,
    billing,
    currency,
    amount: priced.amount,
    url: checkoutSession.url,
    sessionId: checkoutSession.id,
  });
}

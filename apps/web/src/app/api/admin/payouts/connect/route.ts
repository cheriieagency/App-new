/**
 * POST /api/admin/payouts/connect
 * Create / resume Stripe Connect Express onboarding for the active workspace.
 */

import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
} from '@/lib/social/persist';
import { appBaseUrl, missingEnvKeys, missingEnvResponse, stripeEnv } from '@/lib/config/env';
import { getStripe } from '@/lib/commerce/stripe';
import { ensureCommerceSchema } from '@/lib/commerce/orders';

async function readWorkspaceId(request: Request, bodyWorkspaceId?: unknown) {
  const jar = await cookies();
  return (
    (typeof bodyWorkspaceId === 'string' && bodyWorkspaceId.trim()) ||
    new URL(request.url).searchParams.get('workspaceId')?.trim() ||
    request.headers.get('x-workspace-id')?.trim() ||
    jar.get(ACTIVE_WORKSPACE_COOKIE)?.value ||
    jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value ||
    null
  );
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const missing = missingEnvKeys(...stripeEnv.requiredKeys);
    if (missing.length) {
      return missingEnvResponse(missing, 'Stripe');
    }

    const stripe = getStripe();
    if (!stripe) {
      return Response.json({ error: 'Stripe not configured' }, { status: 503 });
    }

    let body: { workspaceId?: unknown } = {};
    try {
      body = (await request.json()) as { workspaceId?: unknown };
    } catch {
      body = {};
    }

    const workspaceId = await readWorkspaceId(request, body.workspaceId);
    if (!workspaceId) {
      return Response.json({ error: 'workspaceId required' }, { status: 400 });
    }

    if (!process.env.DATABASE_URL?.trim()) {
      return Response.json({ error: 'DATABASE_URL required' }, { status: 503 });
    }

    await ensureCommerceSchema();

    try {
      await sql`
        INSERT INTO public.workspaces (id, user_id)
        VALUES (${workspaceId}, ${session.user.id})
        ON CONFLICT (id) DO UPDATE SET
          user_id = COALESCE(workspaces.user_id, EXCLUDED.user_id),
          updated_at = now()
      `;
    } catch (error) {
      console.warn('[payouts/connect] workspace upsert', error);
    }

    const rows = await sql`
      SELECT stripe_connect_account_id, stripe_connect_enabled
      FROM public.workspaces
      WHERE id = ${workspaceId}
      LIMIT 1
    `;
    let accountId =
      rows?.[0]?.stripe_connect_account_id != null
        ? String(rows[0].stripe_connect_account_id)
        : '';

    if (!accountId) {
      try {
        const account = await stripe.accounts.create({
          type: 'express',
          country: 'SE',
          email: session.user.email || undefined,
          capabilities: {
            transfers: { requested: true },
            card_payments: { requested: true },
          },
          business_type: 'individual',
          metadata: {
            workspace_id: workspaceId,
            seller_user_id: session.user.id,
          },
        });
        accountId = account.id;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Stripe Connect failed';
        console.warn('[payouts/connect] accounts.create', error);
        // Stripe test accounts may require enabling Accounts v1 in the Dashboard.
        return Response.json(
          {
            ok: false,
            error: message.includes('Accounts v1')
              ? 'Stripe Connect Accounts v1 is disabled on this Stripe account. Enable it in Stripe Dashboard → Settings → Features → Accounts v1 support, then try again.'
              : message,
            stripeConnectEnabled: false,
          },
          { status: 400 }
        );
      }

      await sql`
        UPDATE public.workspaces
        SET
          stripe_connect_account_id = ${accountId},
          stripe_connect_enabled = false,
          updated_at = now()
        WHERE id = ${workspaceId}
      `;
    }

    // Refresh Connect readiness if the creator already finished onboarding.
    try {
      const account = await stripe.accounts.retrieve(accountId);
      const ready = Boolean(account.charges_enabled && account.payouts_enabled);
      await sql`
        UPDATE public.workspaces
        SET
          stripe_connect_enabled = ${ready},
          updated_at = now()
        WHERE id = ${workspaceId}
      `;
      if (ready) {
        return Response.json({
          ok: true,
          url: null,
          accountId,
          stripeConnectEnabled: true,
          message: 'Stripe Connect already ready',
        });
      }
    } catch {
      /* continue to account link */
    }

    const origin = appBaseUrl(request.headers.get('origin'));
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/admin?tab=analytics&sub=revenue&connect=refresh`,
      return_url: `${origin}/admin?tab=analytics&sub=revenue&connect=return`,
      type: 'account_onboarding',
    });

    return Response.json({
      ok: true,
      url: accountLink.url,
      accountId,
    });
  } catch (error) {
    console.warn('[payouts/connect]', error);
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to start Stripe Connect',
      },
      { status: 500 }
    );
  }
}

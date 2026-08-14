/**
 * POST /api/admin/payouts — request a wallet → bank payout (min 100 SEK).
 * GET  /api/admin/payouts — recent payout history for the workspace.
 */

import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
} from '@/lib/social/persist';
import { getStripe } from '@/lib/commerce/stripe';
import { ensureCommerceSchema } from '@/lib/commerce/orders';
import { stripeEnv } from '@/lib/config/env';

const MIN_PAYOUT_SEK = 100;

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

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workspaceId = await readWorkspaceId(request);
  if (!workspaceId || !process.env.DATABASE_URL?.trim()) {
    return Response.json({ ok: true, payouts: [] });
  }

  try {
    await ensureCommerceSchema();
    const rows = await sql`
      SELECT id, amount_sek, status, stripe_transfer_id, created_at, completed_at
      FROM public.payouts
      WHERE workspace_id = ${workspaceId}
      ORDER BY created_at DESC
      LIMIT 20
    `;

    return Response.json({
      ok: true,
      payouts: (rows || []).map((row) => ({
        id: row.id,
        amountSek: Number(row.amount_sek) || 0,
        status: String(row.status),
        stripeTransferId: row.stripe_transfer_id
          ? String(row.stripe_transfer_id)
          : null,
        createdAt: row.created_at
          ? new Date(String(row.created_at)).toISOString()
          : null,
        completedAt: row.completed_at
          ? new Date(String(row.completed_at)).toISOString()
          : null,
      })),
    });
  } catch (error) {
    console.warn('[admin/payouts GET]', error);
    return Response.json({
      ok: false,
      payouts: [],
      message:
        error instanceof Error ? error.message : 'Failed to load payouts',
    });
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { workspaceId?: unknown; amountSek?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
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

  const walletRows = await sql`
    SELECT
      COALESCE(wallet_balance_sek, 0)::float AS wallet_balance_sek,
      stripe_connect_account_id,
      COALESCE(stripe_connect_enabled, false) AS stripe_connect_enabled,
      user_id
    FROM public.workspaces
    WHERE id = ${workspaceId}
    LIMIT 1
  `;

  const wallet = walletRows?.[0] as Record<string, unknown> | undefined;
  if (!wallet) {
    return Response.json({ error: 'Workspace not found' }, { status: 404 });
  }

  const balance = Math.floor(Number(wallet.wallet_balance_sek) || 0);
  const requested =
    body.amountSek != null
      ? Math.floor(Number(body.amountSek) || 0)
      : balance;
  const amountSek = Math.min(balance, requested);

  if (amountSek < MIN_PAYOUT_SEK) {
    return Response.json(
      {
        error: `Minimum payout is ${MIN_PAYOUT_SEK} SEK`,
        walletBalance: balance,
        minPayoutSek: MIN_PAYOUT_SEK,
      },
      { status: 400 }
    );
  }

  const accountId = wallet.stripe_connect_account_id
    ? String(wallet.stripe_connect_account_id)
    : null;
  const connectEnabled = Boolean(wallet.stripe_connect_enabled && accountId);

  if (!accountId || !connectEnabled) {
    return Response.json(
      {
        success: false,
        error:
          'Connect your bank account with Stripe Express before requesting a payout.',
        walletBalance: balance,
        stripeConnectRequired: true,
      },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  if (!stripe || !stripeEnv.secretKey()) {
    return Response.json(
      { success: false, error: 'Stripe is not configured' },
      { status: 503 }
    );
  }

  const inserted = await sql`
    INSERT INTO public.payouts (
      workspace_id, seller_user_id, amount_sek, status
    )
    VALUES (
      ${workspaceId},
      ${session.user.id},
      ${amountSek},
      'requested'
    )
    RETURNING id, workspace_id, amount_sek, status, created_at
  `;

  const payoutRow = inserted?.[0] as Record<string, unknown> | undefined;
  if (!payoutRow) {
    return Response.json({ error: 'Failed to create payout' }, { status: 500 });
  }

  let status = 'requested';
  let transferId: string | null = null;

  try {
    await sql`
      UPDATE public.payouts
      SET status = 'processing'
      WHERE id = ${payoutRow.id}
    `;

    // Transfer from platform balance → connected Express account (öre).
    const transfer = await stripe.transfers.create({
      amount: amountSek * 100,
      currency: 'sek',
      destination: accountId,
      metadata: {
        workspace_id: workspaceId,
        payout_id: String(payoutRow.id),
        seller_user_id: session.user.id,
      },
    });
    transferId = transfer.id;
    status = 'completed';

    await sql`
      UPDATE public.payouts
      SET
        status = 'completed',
        stripe_transfer_id = ${transferId},
        completed_at = now()
      WHERE id = ${payoutRow.id}
    `;
  } catch (error) {
    console.warn('[payouts] stripe transfer', error);
    status = 'failed';
    await sql`
      UPDATE public.payouts
      SET status = 'failed'
      WHERE id = ${payoutRow.id}
    `;
    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Stripe transfer failed — wallet not deducted',
        payout: {
          id: payoutRow.id,
          amountSek,
          status,
        },
      },
      { status: 502 }
    );
  }

  // Deduct wallet only after a successful Stripe transfer.
  await sql`
    UPDATE public.workspaces
    SET
      wallet_balance_sek = GREATEST(0, COALESCE(wallet_balance_sek, 0) - ${amountSek}),
      updated_at = now()
    WHERE id = ${workspaceId}
      AND COALESCE(wallet_balance_sek, 0) >= ${amountSek}
  `;

  const refreshed = await sql`
    SELECT COALESCE(wallet_balance_sek, 0)::float AS wallet_balance_sek
    FROM public.workspaces
    WHERE id = ${workspaceId}
    LIMIT 1
  `;

  return Response.json({
    success: true,
    payout: {
      id: payoutRow.id,
      amountSek,
      status,
      stripeTransferId: transferId,
      createdAt: payoutRow.created_at
        ? new Date(String(payoutRow.created_at)).toISOString()
        : new Date().toISOString(),
    },
    walletBalance: Number(refreshed?.[0]?.wallet_balance_sek) || 0,
  });
}

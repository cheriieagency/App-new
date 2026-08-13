/**
 * GET /api/analytics/revenue?workspaceId=…
 * Live storefront revenue KPIs, product breakdown, 30-day series, wallet.
 */

import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
} from '@/lib/social/persist';
import { ensureCommerceSchema } from '@/lib/commerce/orders';

function emptyPayload(workspaceId: string | null) {
  return {
    ok: true,
    workspaceId,
    grossRevenue: 0,
    netEarnings: 0,
    totalOrders: 0,
    walletBalance: 0,
    stripeConnectEnabled: false,
    stripeConnectAccountId: null as string | null,
    salesByProduct: [] as Array<{
      productTitle: string;
      orderCount: number;
      revenue: number;
    }>,
    dailyRevenueSeries: [] as Array<{ date: string; revenue: number; orders: number }>,
    recentTransactions: [] as Array<{
      id: number | string;
      buyerEmail: string | null;
      productTitle: string;
      amountGrossSek: number;
      platformFeeSek: number;
      amountNetSek: number;
      createdAt: string;
    }>,
  };
}

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized', ...emptyPayload(null) }, { status: 401 });
    }

    const url = new URL(request.url);
    const jar = await cookies();
    const workspaceId =
      url.searchParams.get('workspaceId')?.trim() ||
      request.headers.get('x-workspace-id')?.trim() ||
      request.headers.get('x-active-workspace-id')?.trim() ||
      jar.get(ACTIVE_WORKSPACE_COOKIE)?.value ||
      jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value ||
      null;

    if (!workspaceId) {
      return Response.json({
        ...emptyPayload(null),
        message: 'Select a workspace to load revenue analytics.',
      });
    }

    if (!process.env.DATABASE_URL?.trim()) {
      return Response.json({
        ...emptyPayload(workspaceId),
        message: 'DATABASE_URL not configured',
      });
    }

    await ensureCommerceSchema();

    // Ensure workspace row exists for wallet / Connect fields.
    try {
      await sql`
        INSERT INTO public.workspaces (id, user_id)
        VALUES (${workspaceId}, ${session.user.id})
        ON CONFLICT (id) DO UPDATE SET
          user_id = COALESCE(workspaces.user_id, EXCLUDED.user_id),
          updated_at = now()
      `;
    } catch {
      /* soft-fail */
    }

    const totals = await sql`
      SELECT
        COALESCE(SUM(amount_gross_sek), 0)::float AS gross,
        COALESCE(SUM(amount_net_sek), 0)::float AS net,
        COUNT(*)::int AS orders
      FROM public.orders
      WHERE workspace_id = ${workspaceId}
        AND status = 'completed'
    `;

    const byProduct = await sql`
      SELECT
        product_title AS title,
        COUNT(*)::int AS order_count,
        COALESCE(SUM(amount_gross_sek), 0)::float AS revenue
      FROM public.orders
      WHERE workspace_id = ${workspaceId}
        AND status = 'completed'
      GROUP BY product_title
      ORDER BY revenue DESC
      LIMIT 20
    `;

    const series = await sql`
      SELECT
        to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
        COALESCE(SUM(amount_gross_sek), 0)::float AS revenue,
        COUNT(*)::int AS orders
      FROM public.orders
      WHERE workspace_id = ${workspaceId}
        AND status = 'completed'
        AND created_at >= (now() - interval '30 days')
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    const recent = await sql`
      SELECT
        id, buyer_email, product_title, amount_gross_sek,
        platform_fee_sek, amount_net_sek, created_at
      FROM public.orders
      WHERE workspace_id = ${workspaceId}
        AND status = 'completed'
      ORDER BY created_at DESC
      LIMIT 10
    `;

    let wallet = await sql`
      SELECT
        COALESCE(wallet_balance_sek, 0)::float AS wallet_balance_sek,
        stripe_connect_account_id,
        COALESCE(stripe_connect_enabled, false) AS stripe_connect_enabled
      FROM public.workspaces
      WHERE id = ${workspaceId}
      LIMIT 1
    `;

    // Soft-refresh Connect status when returning from Stripe onboarding.
    const accountId = wallet?.[0]?.stripe_connect_account_id
      ? String(wallet[0].stripe_connect_account_id)
      : null;
    if (accountId && !wallet?.[0]?.stripe_connect_enabled) {
      try {
        const { getStripe } = await import('@/lib/commerce/stripe');
        const stripe = getStripe();
        if (stripe) {
          const account = await stripe.accounts.retrieve(accountId);
          const ready = Boolean(account.charges_enabled && account.payouts_enabled);
          if (ready) {
            await sql`
              UPDATE public.workspaces
              SET stripe_connect_enabled = true, updated_at = now()
              WHERE id = ${workspaceId}
            `;
            wallet = await sql`
              SELECT
                COALESCE(wallet_balance_sek, 0)::float AS wallet_balance_sek,
                stripe_connect_account_id,
                COALESCE(stripe_connect_enabled, false) AS stripe_connect_enabled
              FROM public.workspaces
              WHERE id = ${workspaceId}
              LIMIT 1
            `;
          }
        }
      } catch {
        /* ignore */
      }
    }

    // Fill missing days in the last 30 for chart continuity.
    const byDay = new Map<string, { revenue: number; orders: number }>();
    for (const row of series || []) {
      byDay.set(String(row.day), {
        revenue: Number(row.revenue) || 0,
        orders: Number(row.orders) || 0,
      });
    }
    const dailyRevenueSeries: Array<{
      date: string;
      revenue: number;
      orders: number;
    }> = [];
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date();
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      const hit = byDay.get(key);
      dailyRevenueSeries.push({
        date: key,
        revenue: hit?.revenue ?? 0,
        orders: hit?.orders ?? 0,
      });
    }

    const t = totals?.[0] as Record<string, unknown> | undefined;
    const w = wallet?.[0] as Record<string, unknown> | undefined;

    return Response.json({
      ok: true,
      workspaceId,
      // Spec aliases + camelCase used by RevenueAnalyticsPanel.
      grossRevenue: Number(t?.gross) || 0,
      totalGrossRevenue: Number(t?.gross) || 0,
      netEarnings: Number(t?.net) || 0,
      totalNetEarnings: Number(t?.net) || 0,
      totalOrders: Number(t?.orders) || 0,
      totalOrdersCount: Number(t?.orders) || 0,
      walletBalance: Number(w?.wallet_balance_sek) || 0,
      stripeConnectEnabled: Boolean(w?.stripe_connect_enabled && w?.stripe_connect_account_id),
      stripeConnectAccountId: w?.stripe_connect_account_id
        ? String(w.stripe_connect_account_id)
        : null,
      salesByProduct: (byProduct || []).map((row) => ({
        productTitle: String(row.title || 'Product'),
        orderCount: Number(row.order_count) || 0,
        revenue: Number(row.revenue) || 0,
      })),
      dailyRevenueSeries,
      recentTransactions: (recent || []).map((row) => ({
        id: row.id as number | string,
        buyerEmail: row.buyer_email != null ? String(row.buyer_email) : null,
        productTitle: String(row.product_title || 'Product'),
        amountGrossSek: Number(row.amount_gross_sek) || 0,
        platformFeeSek: Number(row.platform_fee_sek) || 0,
        amountNetSek: Number(row.amount_net_sek) || 0,
        createdAt: row.created_at
          ? new Date(String(row.created_at)).toISOString()
          : new Date().toISOString(),
      })),
    });
  } catch (error) {
    console.warn('[analytics/revenue]', error);
    return Response.json({
      ...emptyPayload(null),
      ok: false,
      message:
        error instanceof Error ? error.message : 'Failed to load revenue analytics',
    });
  }
}

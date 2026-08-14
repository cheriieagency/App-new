/**
 * Storefront order ledger + creator wallet credits.
 */

import sql from '@/app/api/utils/sql';
import {
  getPlanLimits,
  normalizeWorkspacePlan,
  type WorkspacePlan,
} from '@/lib/config/plans';
import { getProfileSubscription } from '@/lib/subscription-profile';

export type RecordOrderInput = {
  workspaceId: string;
  sellerUserId: string;
  buyerEmail?: string | null;
  buyerName?: string | null;
  productId?: string | null;
  productTitle: string;
  amountGrossSek: number;
  provider?: 'demo' | 'stripe' | 'manual';
  externalId?: string | null;
  metadata?: Record<string, unknown>;
};

/** Providers that count toward Revenue / wallet (paid or staff-recorded). */
export const REAL_ORDER_PROVIDERS = ['stripe', 'manual'] as const;

export function isRealOrderProvider(
  provider: string | null | undefined
): boolean {
  return (
    provider === 'stripe' ||
    provider === 'manual'
  );
}

export type RecordedOrder = {
  id: number | string;
  workspace_id: string;
  amount_gross_sek: number;
  platform_fee_sek: number;
  amount_net_sek: number;
  platform_fee_percent: number;
  wallet_balance_sek: number;
};

let schemaReady: Promise<void> | null = null;
/** Bump when ALTER healers are added so hot servers re-run schema ensure. */
const COMMERCE_SCHEMA_VERSION = 4;
let schemaVersionApplied = 0;

async function safeAlter(label: string, run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    console.warn(`[commerce] schema heal skipped (${label})`, error);
  }
}

export async function ensureCommerceSchema(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  if (schemaReady && schemaVersionApplied >= COMMERCE_SCHEMA_VERSION) {
    return schemaReady;
  }

  schemaReady = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS public.workspaces (
        id                      text PRIMARY KEY,
        user_id                 text NOT NULL,
        name                    text,
        slug                    text,
        default_community_slug  text,
        custom_domain           text,
        custom_domain_verified  boolean NOT NULL DEFAULT false,
        created_at              timestamptz NOT NULL DEFAULT now(),
        updated_at              timestamptz NOT NULL DEFAULT now()
      )
    `;
    await safeAlter('workspaces.wallet_balance_sek', () => sql`
      ALTER TABLE public.workspaces
        ADD COLUMN IF NOT EXISTS wallet_balance_sek numeric(14, 2) NOT NULL DEFAULT 0
    `);
    await safeAlter('workspaces.total_revenue_sek', () => sql`
      ALTER TABLE public.workspaces
        ADD COLUMN IF NOT EXISTS total_revenue_sek numeric(14, 2) NOT NULL DEFAULT 0
    `);
    await safeAlter('workspaces.stripe_connect_account_id', () => sql`
      ALTER TABLE public.workspaces
        ADD COLUMN IF NOT EXISTS stripe_connect_account_id text
    `);
    await safeAlter('workspaces.stripe_connect_enabled', () => sql`
      ALTER TABLE public.workspaces
        ADD COLUMN IF NOT EXISTS stripe_connect_enabled boolean NOT NULL DEFAULT false
    `);
    await safeAlter('workspaces.created_at', () => sql`
      ALTER TABLE public.workspaces
        ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now()
    `);
    await safeAlter('workspaces.updated_at', () => sql`
      ALTER TABLE public.workspaces
        ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now()
    `);

    await sql`
      CREATE TABLE IF NOT EXISTS public.orders (
        id                   serial PRIMARY KEY,
        workspace_id         text NOT NULL,
        seller_user_id       text NOT NULL,
        buyer_email          text,
        buyer_name           text,
        product_id           text,
        product_title        text NOT NULL DEFAULT 'Product',
        amount_gross_sek     numeric(14, 2) NOT NULL DEFAULT 0,
        platform_fee_sek     numeric(14, 2) NOT NULL DEFAULT 0,
        amount_net_sek       numeric(14, 2) NOT NULL DEFAULT 0,
        platform_fee_percent numeric(5, 2) NOT NULL DEFAULT 0,
        status               text NOT NULL DEFAULT 'completed',
        provider             text NOT NULL DEFAULT 'demo',
        external_id          text,
        google_meet_url      text,
        metadata             jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at           timestamptz NOT NULL DEFAULT now()
      )
    `;

    // Heal older `orders` tables that predate the full ledger columns.
    await safeAlter('orders.workspace_id', () => sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS workspace_id text`);
    await safeAlter('orders.seller_user_id', () => sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS seller_user_id text`);
    await safeAlter('orders.buyer_email', () => sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_email text`);
    await safeAlter('orders.buyer_name', () => sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_name text`);
    await safeAlter('orders.product_id', () => sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS product_id text`);
    await safeAlter('orders.product_title', () => sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS product_title text DEFAULT 'Product'`);
    await safeAlter('orders.amount_gross_sek', () => sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS amount_gross_sek numeric(14, 2) DEFAULT 0`);
    await safeAlter('orders.platform_fee_sek', () => sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS platform_fee_sek numeric(14, 2) DEFAULT 0`);
    await safeAlter('orders.amount_net_sek', () => sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS amount_net_sek numeric(14, 2) DEFAULT 0`);
    await safeAlter('orders.platform_fee_percent', () => sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS platform_fee_percent numeric(5, 2) DEFAULT 0`);
    await safeAlter('orders.status', () => sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status text DEFAULT 'completed'`);
    await safeAlter('orders.provider', () => sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS provider text DEFAULT 'demo'`);
    await safeAlter('orders.external_id', () => sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS external_id text`);
    await safeAlter('orders.google_meet_url', () => sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS google_meet_url text`);
    await safeAlter('orders.metadata', () => sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb`);
    await safeAlter('orders.created_at', () => sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now()`);

    await safeAlter('orders_external_id_uidx', () => sql`
      CREATE UNIQUE INDEX IF NOT EXISTS orders_external_id_uidx
        ON public.orders (provider, external_id)
        WHERE external_id IS NOT NULL
    `);
    await safeAlter('orders_workspace_idx', () => sql`
      CREATE INDEX IF NOT EXISTS orders_workspace_idx
        ON public.orders (workspace_id, created_at DESC)
    `);

    await sql`
      CREATE TABLE IF NOT EXISTS public.payouts (
        id                  serial PRIMARY KEY,
        workspace_id        text NOT NULL,
        seller_user_id      text NOT NULL,
        amount_sek          numeric(14, 2) NOT NULL DEFAULT 0,
        status              text NOT NULL DEFAULT 'requested',
        stripe_transfer_id  text,
        created_at          timestamptz NOT NULL DEFAULT now(),
        completed_at        timestamptz
      )
    `;
    await safeAlter('payouts.workspace_id', () => sql`ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS workspace_id text`);
    await safeAlter('payouts.seller_user_id', () => sql`ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS seller_user_id text`);
    await safeAlter('payouts.amount_sek', () => sql`ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS amount_sek numeric(14, 2) DEFAULT 0`);
    await safeAlter('payouts.status', () => sql`ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS status text DEFAULT 'requested'`);
    await safeAlter('payouts.stripe_transfer_id', () => sql`ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS stripe_transfer_id text`);
    await safeAlter('payouts.created_at', () => sql`
      ALTER TABLE public.payouts
        ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now()
    `);
    await safeAlter('payouts.completed_at', () => sql`
      ALTER TABLE public.payouts
        ADD COLUMN IF NOT EXISTS completed_at timestamptz
    `);
    await safeAlter('payouts_workspace_idx', () => sql`
      CREATE INDEX IF NOT EXISTS payouts_workspace_idx
        ON public.payouts (workspace_id, created_at DESC)
    `);

    schemaVersionApplied = COMMERCE_SCHEMA_VERSION;
  })().catch((error) => {
    schemaReady = null;
    schemaVersionApplied = 0;
    throw error;
  });

  return schemaReady;
}

export function calcPlatformFee(
  plan: WorkspacePlan,
  amountGrossSek: number
): { feePercent: number; feeSek: number; netSek: number } {
  const feePercent = getPlanLimits(plan).platformFeePercent;
  const gross = Math.max(0, Math.round(Number(amountGrossSek) || 0));
  const feeSek = Math.round((gross * feePercent) / 100);
  const netSek = Math.max(0, gross - feeSek);
  return { feePercent, feeSek, netSek };
}

async function resolveSellerPlan(sellerUserId: string): Promise<WorkspacePlan> {
  try {
    const sub = await getProfileSubscription({ userId: sellerUserId });
    return normalizeWorkspacePlan(sub.plan);
  } catch {
    return 'starter';
  }
}

async function ensureWorkspaceRow(input: {
  workspaceId: string;
  sellerUserId: string;
}): Promise<void> {
  try {
    await sql`
      INSERT INTO public.workspaces (id, user_id)
      VALUES (${input.workspaceId}, ${input.sellerUserId})
      ON CONFLICT (id) DO UPDATE SET
        user_id = COALESCE(workspaces.user_id, EXCLUDED.user_id),
        updated_at = now()
    `;
  } catch (error) {
    // FK / missing auth user — still attempt wallet update if the row exists.
    console.warn('[commerce] workspace upsert skipped', error);
  }
}

/**
 * Insert a completed order and credit the creator wallet (idempotent on external_id).
 * Demo / simulated checkouts are NOT persisted — Revenue stays real-payment only.
 */
export async function recordCompletedOrder(
  input: RecordOrderInput
): Promise<RecordedOrder | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  await ensureCommerceSchema();

  const provider = input.provider || 'demo';
  // Simulated 1-tap / Instant Checkout must not inflate Revenue or wallet.
  if (!isRealOrderProvider(provider)) {
    const plan = await resolveSellerPlan(input.sellerUserId);
    const { feePercent, feeSek, netSek } = calcPlatformFee(
      plan,
      input.amountGrossSek
    );
    return {
      id: `demo_${Date.now()}`,
      workspace_id: input.workspaceId,
      amount_gross_sek: Math.max(0, Math.round(input.amountGrossSek)),
      platform_fee_sek: feeSek,
      amount_net_sek: netSek,
      platform_fee_percent: feePercent,
      wallet_balance_sek: 0,
    };
  }

  const externalId = input.externalId?.trim() || null;

  if (externalId) {
    const existing = await sql`
      SELECT id, workspace_id, amount_gross_sek, platform_fee_sek, amount_net_sek,
             platform_fee_percent
      FROM public.orders
      WHERE provider = ${provider} AND external_id = ${externalId}
      LIMIT 1
    `;
    if (Array.isArray(existing) && existing[0]) {
      const wallet = await sql`
        SELECT wallet_balance_sek FROM public.workspaces
        WHERE id = ${input.workspaceId} LIMIT 1
      `;
      const row = existing[0] as Record<string, unknown>;
      return {
        id: (row.id as number | string) ?? String(Date.now()),
        workspace_id: String(row.workspace_id),
        amount_gross_sek: Number(row.amount_gross_sek),
        platform_fee_sek: Number(row.platform_fee_sek),
        amount_net_sek: Number(row.amount_net_sek),
        platform_fee_percent: Number(row.platform_fee_percent),
        wallet_balance_sek: Number(wallet?.[0]?.wallet_balance_sek) || 0,
      };
    }
  }

  const plan = await resolveSellerPlan(input.sellerUserId);
  const { feePercent, feeSek, netSek } = calcPlatformFee(
    plan,
    input.amountGrossSek
  );

  await ensureWorkspaceRow({
    workspaceId: input.workspaceId,
    sellerUserId: input.sellerUserId,
  });

  const inserted = await sql`
    INSERT INTO public.orders (
      workspace_id, seller_user_id, buyer_email, buyer_name,
      product_id, product_title, amount_gross_sek, platform_fee_sek,
      amount_net_sek, platform_fee_percent, status, provider, external_id, metadata
    )
    VALUES (
      ${input.workspaceId},
      ${input.sellerUserId},
      ${input.buyerEmail ?? null},
      ${input.buyerName ?? null},
      ${input.productId ?? null},
      ${input.productTitle},
      ${Math.max(0, Math.round(input.amountGrossSek))},
      ${feeSek},
      ${netSek},
      ${feePercent},
      'completed',
      ${provider},
      ${externalId},
      ${JSON.stringify(input.metadata || {})}
    )
    RETURNING id, workspace_id, amount_gross_sek, platform_fee_sek, amount_net_sek, platform_fee_percent
  `;

  const order = inserted?.[0] as Record<string, unknown> | undefined;
  if (!order) return null;

  const walletRows = await sql`
    UPDATE public.workspaces
    SET
      wallet_balance_sek = COALESCE(wallet_balance_sek, 0) + ${netSek},
      total_revenue_sek = COALESCE(total_revenue_sek, 0) + ${Math.max(0, Math.round(input.amountGrossSek))},
      updated_at = now()
    WHERE id = ${input.workspaceId}
    RETURNING wallet_balance_sek
  `;

  return {
    id: (order.id as number | string) ?? String(Date.now()),
    workspace_id: String(order.workspace_id),
    amount_gross_sek: Number(order.amount_gross_sek),
    platform_fee_sek: Number(order.platform_fee_sek),
    amount_net_sek: Number(order.amount_net_sek),
    platform_fee_percent: Number(order.platform_fee_percent),
    wallet_balance_sek: Number(walletRows?.[0]?.wallet_balance_sek) || netSek,
  };
}

/**
 * Remove simulated demo orders and rebuild wallet from real Stripe/manual sales only.
 */
export async function purgeDemoOrdersAndRecalcWallet(
  workspaceId?: string | null
): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  await ensureCommerceSchema();

  try {
    if (workspaceId?.trim()) {
      await sql`
        DELETE FROM public.orders
        WHERE workspace_id = ${workspaceId}
          AND (
            provider = 'demo'
            OR provider IS NULL
            OR COALESCE(external_id, '') LIKE 'demo_%'
            OR COALESCE(external_id, '') LIKE 'test_rev_%'
          )
      `;
      await sql`
        UPDATE public.workspaces w
        SET
          wallet_balance_sek = GREATEST(
            0,
            COALESCE((
              SELECT SUM(o.amount_net_sek)
              FROM public.orders o
              WHERE o.workspace_id = w.id
                AND o.status = 'completed'
                AND o.provider IN ('stripe', 'manual')
            ), 0)
            - COALESCE((
              SELECT SUM(p.amount_sek)
              FROM public.payouts p
              WHERE p.workspace_id = w.id
                AND p.status IN ('requested', 'processing', 'completed')
            ), 0)
          ),
          total_revenue_sek = COALESCE((
            SELECT SUM(o.amount_gross_sek)
            FROM public.orders o
            WHERE o.workspace_id = w.id
              AND o.status = 'completed'
              AND o.provider IN ('stripe', 'manual')
          ), 0),
          updated_at = now()
        WHERE w.id = ${workspaceId}
      `;
      return;
    }

    await sql`
      DELETE FROM public.orders
      WHERE provider = 'demo'
         OR provider IS NULL
         OR COALESCE(external_id, '') LIKE 'demo_%'
         OR COALESCE(external_id, '') LIKE 'test_rev_%'
    `;
  } catch (error) {
    console.warn('[commerce] purge demo orders', error);
  }
}

/** Attach a Google Meet link to an order + merge into metadata. */
export async function attachGoogleMeetToOrder(input: {
  orderId: number | string;
  meetUrl: string;
  eventId?: string | null;
  htmlLink?: string | null;
}): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  await ensureCommerceSchema();
  await sql`
    UPDATE public.orders
    SET
      google_meet_url = ${input.meetUrl},
      metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({
        google_meet_url: input.meetUrl,
        google_event_id: input.eventId ?? null,
        google_event_html: input.htmlLink ?? null,
      })}::jsonb
    WHERE id = ${input.orderId}
  `;
}

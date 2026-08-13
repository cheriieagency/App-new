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

export async function ensureCommerceSchema(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  if (schemaReady) return schemaReady;

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
    await sql`
      ALTER TABLE public.workspaces
        ADD COLUMN IF NOT EXISTS wallet_balance_sek numeric(14, 2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_revenue_sek numeric(14, 2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS stripe_connect_account_id text,
        ADD COLUMN IF NOT EXISTS stripe_connect_enabled boolean NOT NULL DEFAULT false
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS public.orders (
        id                   serial PRIMARY KEY,
        workspace_id         text NOT NULL,
        seller_user_id       text NOT NULL,
        buyer_email          text,
        buyer_name           text,
        product_id           text,
        product_title        text NOT NULL,
        amount_gross_sek     numeric(14, 2) NOT NULL CHECK (amount_gross_sek >= 0),
        platform_fee_sek     numeric(14, 2) NOT NULL DEFAULT 0,
        amount_net_sek       numeric(14, 2) NOT NULL DEFAULT 0,
        platform_fee_percent numeric(5, 2) NOT NULL DEFAULT 0,
        status               text NOT NULL DEFAULT 'completed'
                               CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
        provider             text NOT NULL DEFAULT 'demo',
        external_id          text,
        google_meet_url      text,
        metadata             jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at           timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`
      ALTER TABLE public.orders
        ADD COLUMN IF NOT EXISTS google_meet_url text
    `;
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS orders_external_id_uidx
        ON public.orders (provider, external_id)
        WHERE external_id IS NOT NULL
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS orders_workspace_idx
        ON public.orders (workspace_id, created_at DESC)
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS public.payouts (
        id                  serial PRIMARY KEY,
        workspace_id        text NOT NULL,
        seller_user_id      text NOT NULL,
        amount_sek          numeric(14, 2) NOT NULL CHECK (amount_sek > 0),
        status              text NOT NULL DEFAULT 'requested'
                              CHECK (status IN ('requested', 'processing', 'completed', 'failed')),
        stripe_transfer_id  text,
        created_at          timestamptz NOT NULL DEFAULT now(),
        completed_at        timestamptz
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS payouts_workspace_idx
        ON public.payouts (workspace_id, created_at DESC)
    `;
  })().catch((error) => {
    schemaReady = null;
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
 */
export async function recordCompletedOrder(
  input: RecordOrderInput
): Promise<RecordedOrder | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  await ensureCommerceSchema();

  const provider = input.provider || 'demo';
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
        id: Number(row.id),
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
    id: Number(order.id),
    workspace_id: String(order.workspace_id),
    amount_gross_sek: Number(order.amount_gross_sek),
    platform_fee_sek: Number(order.platform_fee_sek),
    amount_net_sek: Number(order.amount_net_sek),
    platform_fee_percent: Number(order.platform_fee_percent),
    wallet_balance_sek: Number(walletRows?.[0]?.wallet_balance_sek) || netSek,
  };
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

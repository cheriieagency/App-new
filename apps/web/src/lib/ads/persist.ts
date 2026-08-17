/**
 * Durable Meta Ads hierarchy synced into Supabase:
 * meta_campaigns → meta_adsets → meta_ads (+ daily insight series).
 */

import sql from '@/app/api/utils/sql';
import type {
  MetaAdAccount,
  MetaAdRemote,
  MetaAdSetRemote,
  MetaCampaignRemote,
  MetaInsightDay,
} from '@/lib/meta/marketing-api';
import { budgetMinorToMajor } from '@/lib/meta/marketing-api';

let schemaReady: Promise<void> | null = null;

export type MetaCampaignRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  ad_account_id: string;
  name: string;
  status: string;
  objective: string | null;
  daily_budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  cpc: number;
  conversions: number;
  purchase_roas: number;
  currency: string;
  synced_at: string;
};

export type MetaAdSetRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  ad_account_id: string;
  campaign_id: string;
  name: string;
  status: string;
  daily_budget: number;
  targeting_summary: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  cpc: number;
  conversions: number;
  currency: string;
  synced_at: string;
};

export type MetaAdRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  ad_account_id: string;
  campaign_id: string;
  adset_id: string;
  name: string;
  status: string;
  creative_thumbnail: string | null;
  headline: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  cpc: number;
  conversions: number;
  currency: string;
  synced_at: string;
};

export async function ensureMetaCampaignsSchema(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  if (schemaReady) return schemaReady;

  schemaReady = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS public.meta_campaigns (
        id             text PRIMARY KEY,
        workspace_id   text NOT NULL DEFAULT '',
        user_id        text NOT NULL DEFAULT '',
        ad_account_id  text NOT NULL DEFAULT '',
        name           text NOT NULL DEFAULT '',
        status         text NOT NULL DEFAULT 'PAUSED',
        objective      text,
        daily_budget   numeric NOT NULL DEFAULT 0,
        spend          numeric NOT NULL DEFAULT 0,
        impressions    bigint NOT NULL DEFAULT 0,
        clicks         bigint NOT NULL DEFAULT 0,
        cpc            numeric NOT NULL DEFAULT 0,
        currency       text NOT NULL DEFAULT 'SEK',
        synced_at      timestamptz NOT NULL DEFAULT now(),
        created_at     timestamptz NOT NULL DEFAULT now(),
        updated_at     timestamptz NOT NULL DEFAULT now()
      )
    `;
    // Heal older/partial tables column-by-column (multi-ADD batches abort entirely on failure).
    const heal = async (fn: () => Promise<unknown>) => {
      try {
        await fn();
      } catch {
        /* column may already exist or type conflict — keep healing */
      }
    };
    await heal(
      () => sql`ALTER TABLE public.meta_campaigns ADD COLUMN IF NOT EXISTS workspace_id text`
    );
    await heal(
      () => sql`ALTER TABLE public.meta_campaigns ADD COLUMN IF NOT EXISTS user_id text`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_campaigns ADD COLUMN IF NOT EXISTS ad_account_id text`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_campaigns ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT ''`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_campaigns ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'PAUSED'`
    );
    await heal(
      () => sql`ALTER TABLE public.meta_campaigns ADD COLUMN IF NOT EXISTS objective text`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_campaigns ADD COLUMN IF NOT EXISTS daily_budget numeric NOT NULL DEFAULT 0`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_campaigns ADD COLUMN IF NOT EXISTS spend numeric NOT NULL DEFAULT 0`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_campaigns ADD COLUMN IF NOT EXISTS impressions bigint NOT NULL DEFAULT 0`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_campaigns ADD COLUMN IF NOT EXISTS clicks bigint NOT NULL DEFAULT 0`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_campaigns ADD COLUMN IF NOT EXISTS cpc numeric NOT NULL DEFAULT 0`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_campaigns ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'SEK'`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_campaigns ADD COLUMN IF NOT EXISTS synced_at timestamptz NOT NULL DEFAULT now()`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_campaigns ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_campaigns ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_campaigns ADD COLUMN IF NOT EXISTS conversions numeric NOT NULL DEFAULT 0`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_campaigns ADD COLUMN IF NOT EXISTS purchase_roas numeric NOT NULL DEFAULT 0`
    );
    // Widen uuid columns to text — Meta ids are strings; demo seeds need non-uuid forms too.
    await heal(
      () =>
        sql`ALTER TABLE public.meta_campaigns ALTER COLUMN id TYPE text USING id::text`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_campaigns ALTER COLUMN ad_account_id TYPE text USING ad_account_id::text`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_campaigns ALTER COLUMN workspace_id TYPE text USING workspace_id::text`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_campaigns ALTER COLUMN user_id TYPE text USING user_id::text`
    );
    await heal(
      () => sql`
        CREATE INDEX IF NOT EXISTS meta_campaigns_ws_idx
          ON public.meta_campaigns (workspace_id, synced_at DESC)
      `
    );

    await sql`
      CREATE TABLE IF NOT EXISTS public.meta_ad_accounts (
        id             text PRIMARY KEY,
        workspace_id   text NOT NULL DEFAULT '',
        user_id        text NOT NULL DEFAULT '',
        account_id     text NOT NULL DEFAULT '',
        name           text NOT NULL DEFAULT '',
        currency       text NOT NULL DEFAULT 'SEK',
        account_status int,
        synced_at      timestamptz NOT NULL DEFAULT now(),
        updated_at     timestamptz NOT NULL DEFAULT now()
      )
    `;
    await heal(
      () =>
        sql`ALTER TABLE public.meta_ad_accounts ADD COLUMN IF NOT EXISTS workspace_id text`
    );
    await heal(
      () => sql`ALTER TABLE public.meta_ad_accounts ADD COLUMN IF NOT EXISTS user_id text`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_ad_accounts ADD COLUMN IF NOT EXISTS account_id text`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_ad_accounts ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT ''`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_ad_accounts ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'SEK'`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_ad_accounts ADD COLUMN IF NOT EXISTS account_status int`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_ad_accounts ADD COLUMN IF NOT EXISTS synced_at timestamptz NOT NULL DEFAULT now()`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_ad_accounts ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_ad_accounts ALTER COLUMN id TYPE text USING id::text`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_ad_accounts ALTER COLUMN account_id TYPE text USING account_id::text`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_ad_accounts ALTER COLUMN workspace_id TYPE text USING workspace_id::text`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_ad_accounts ALTER COLUMN user_id TYPE text USING user_id::text`
    );
    await heal(
      () => sql`
        CREATE INDEX IF NOT EXISTS meta_ad_accounts_ws_idx
          ON public.meta_ad_accounts (workspace_id)
      `
    );

    await sql`
      CREATE TABLE IF NOT EXISTS public.meta_adsets (
        id                 text PRIMARY KEY,
        workspace_id       text NOT NULL DEFAULT '',
        user_id            text NOT NULL DEFAULT '',
        ad_account_id      text NOT NULL DEFAULT '',
        campaign_id        text NOT NULL DEFAULT '',
        name               text NOT NULL DEFAULT '',
        status             text NOT NULL DEFAULT 'PAUSED',
        daily_budget       numeric NOT NULL DEFAULT 0,
        targeting_summary  text,
        spend              numeric NOT NULL DEFAULT 0,
        impressions        bigint NOT NULL DEFAULT 0,
        clicks             bigint NOT NULL DEFAULT 0,
        cpc                numeric NOT NULL DEFAULT 0,
        conversions        numeric NOT NULL DEFAULT 0,
        currency           text NOT NULL DEFAULT 'SEK',
        synced_at          timestamptz NOT NULL DEFAULT now(),
        created_at         timestamptz NOT NULL DEFAULT now(),
        updated_at         timestamptz NOT NULL DEFAULT now()
      )
    `;
    await heal(
      () => sql`ALTER TABLE public.meta_adsets ADD COLUMN IF NOT EXISTS workspace_id text`
    );
    await heal(
      () => sql`ALTER TABLE public.meta_adsets ADD COLUMN IF NOT EXISTS user_id text`
    );
    await heal(
      () => sql`ALTER TABLE public.meta_adsets ADD COLUMN IF NOT EXISTS ad_account_id text`
    );
    await heal(
      () => sql`ALTER TABLE public.meta_adsets ADD COLUMN IF NOT EXISTS campaign_id text`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_adsets ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT ''`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_adsets ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'PAUSED'`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_adsets ADD COLUMN IF NOT EXISTS daily_budget numeric NOT NULL DEFAULT 0`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_adsets ADD COLUMN IF NOT EXISTS targeting_summary text`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_adsets ADD COLUMN IF NOT EXISTS spend numeric NOT NULL DEFAULT 0`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_adsets ADD COLUMN IF NOT EXISTS impressions bigint NOT NULL DEFAULT 0`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_adsets ADD COLUMN IF NOT EXISTS clicks bigint NOT NULL DEFAULT 0`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_adsets ADD COLUMN IF NOT EXISTS cpc numeric NOT NULL DEFAULT 0`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_adsets ADD COLUMN IF NOT EXISTS conversions numeric NOT NULL DEFAULT 0`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_adsets ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'SEK'`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_adsets ADD COLUMN IF NOT EXISTS synced_at timestamptz NOT NULL DEFAULT now()`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_adsets ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_adsets ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`
    );
    await heal(
      () => sql`
        CREATE INDEX IF NOT EXISTS meta_adsets_ws_campaign_idx
          ON public.meta_adsets (workspace_id, campaign_id)
      `
    );

    await sql`
      CREATE TABLE IF NOT EXISTS public.meta_ads (
        id                   text PRIMARY KEY,
        workspace_id         text NOT NULL DEFAULT '',
        user_id              text NOT NULL DEFAULT '',
        ad_account_id        text NOT NULL DEFAULT '',
        campaign_id          text NOT NULL DEFAULT '',
        adset_id             text NOT NULL DEFAULT '',
        name                 text NOT NULL DEFAULT '',
        status               text NOT NULL DEFAULT 'PAUSED',
        creative_thumbnail   text,
        headline             text,
        spend                numeric NOT NULL DEFAULT 0,
        impressions          bigint NOT NULL DEFAULT 0,
        clicks               bigint NOT NULL DEFAULT 0,
        cpc                  numeric NOT NULL DEFAULT 0,
        conversions          numeric NOT NULL DEFAULT 0,
        currency             text NOT NULL DEFAULT 'SEK',
        synced_at            timestamptz NOT NULL DEFAULT now(),
        created_at           timestamptz NOT NULL DEFAULT now(),
        updated_at           timestamptz NOT NULL DEFAULT now()
      )
    `;
    await heal(
      () => sql`ALTER TABLE public.meta_ads ADD COLUMN IF NOT EXISTS workspace_id text`
    );
    await heal(
      () => sql`ALTER TABLE public.meta_ads ADD COLUMN IF NOT EXISTS user_id text`
    );
    await heal(
      () => sql`ALTER TABLE public.meta_ads ADD COLUMN IF NOT EXISTS ad_account_id text`
    );
    await heal(
      () => sql`ALTER TABLE public.meta_ads ADD COLUMN IF NOT EXISTS campaign_id text`
    );
    await heal(
      () => sql`ALTER TABLE public.meta_ads ADD COLUMN IF NOT EXISTS adset_id text`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_ads ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT ''`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_ads ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'PAUSED'`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_ads ADD COLUMN IF NOT EXISTS creative_thumbnail text`
    );
    await heal(
      () => sql`ALTER TABLE public.meta_ads ADD COLUMN IF NOT EXISTS headline text`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_ads ADD COLUMN IF NOT EXISTS spend numeric NOT NULL DEFAULT 0`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_ads ADD COLUMN IF NOT EXISTS impressions bigint NOT NULL DEFAULT 0`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_ads ADD COLUMN IF NOT EXISTS clicks bigint NOT NULL DEFAULT 0`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_ads ADD COLUMN IF NOT EXISTS cpc numeric NOT NULL DEFAULT 0`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_ads ADD COLUMN IF NOT EXISTS conversions numeric NOT NULL DEFAULT 0`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_ads ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'SEK'`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_ads ADD COLUMN IF NOT EXISTS synced_at timestamptz NOT NULL DEFAULT now()`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_ads ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_ads ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`
    );
    await heal(
      () => sql`
        CREATE INDEX IF NOT EXISTS meta_ads_ws_adset_idx
          ON public.meta_ads (workspace_id, adset_id)
      `
    );

    await sql`
      CREATE TABLE IF NOT EXISTS public.meta_ads_insight_days (
        workspace_id   text NOT NULL DEFAULT '',
        user_id        text NOT NULL DEFAULT '',
        ad_account_id  text NOT NULL DEFAULT '',
        day            date NOT NULL DEFAULT CURRENT_DATE,
        spend          numeric NOT NULL DEFAULT 0,
        impressions    bigint NOT NULL DEFAULT 0,
        clicks         bigint NOT NULL DEFAULT 0,
        cpc            numeric NOT NULL DEFAULT 0,
        conversions    numeric NOT NULL DEFAULT 0,
        purchase_roas  numeric NOT NULL DEFAULT 0,
        PRIMARY KEY (workspace_id, user_id, day)
      )
    `;
    await heal(
      () =>
        sql`ALTER TABLE public.meta_ads_insight_days ADD COLUMN IF NOT EXISTS workspace_id text`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_ads_insight_days ADD COLUMN IF NOT EXISTS user_id text`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_ads_insight_days ADD COLUMN IF NOT EXISTS ad_account_id text`
    );
    await heal(
      () => sql`ALTER TABLE public.meta_ads_insight_days ADD COLUMN IF NOT EXISTS day date`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_ads_insight_days ADD COLUMN IF NOT EXISTS spend numeric NOT NULL DEFAULT 0`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_ads_insight_days ADD COLUMN IF NOT EXISTS impressions bigint NOT NULL DEFAULT 0`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_ads_insight_days ADD COLUMN IF NOT EXISTS clicks bigint NOT NULL DEFAULT 0`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_ads_insight_days ADD COLUMN IF NOT EXISTS cpc numeric NOT NULL DEFAULT 0`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_ads_insight_days ADD COLUMN IF NOT EXISTS conversions numeric NOT NULL DEFAULT 0`
    );
    await heal(
      () =>
        sql`ALTER TABLE public.meta_ads_insight_days ADD COLUMN IF NOT EXISTS purchase_roas numeric NOT NULL DEFAULT 0`
    );
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });

  return schemaReady;
}

function mapCampaignRow(row: Record<string, unknown>): MetaCampaignRow {
  return {
    id: String(row.id),
    workspace_id: String(row.workspace_id),
    user_id: String(row.user_id),
    ad_account_id: String(row.ad_account_id),
    name: String(row.name || ''),
    status: String(row.status || 'PAUSED').toUpperCase(),
    objective: row.objective != null ? String(row.objective) : null,
    daily_budget: Number(row.daily_budget) || 0,
    spend: Number(row.spend) || 0,
    impressions: Number(row.impressions) || 0,
    clicks: Number(row.clicks) || 0,
    cpc: Number(row.cpc) || 0,
    conversions: Number(row.conversions) || 0,
    purchase_roas: Number(row.purchase_roas) || 0,
    currency: String(row.currency || 'SEK'),
    synced_at: row.synced_at
      ? new Date(String(row.synced_at)).toISOString()
      : new Date().toISOString(),
  };
}

function mapAdSetRow(row: Record<string, unknown>): MetaAdSetRow {
  return {
    id: String(row.id),
    workspace_id: String(row.workspace_id),
    user_id: String(row.user_id),
    ad_account_id: String(row.ad_account_id),
    campaign_id: String(row.campaign_id),
    name: String(row.name || ''),
    status: String(row.status || 'PAUSED').toUpperCase(),
    daily_budget: Number(row.daily_budget) || 0,
    targeting_summary:
      row.targeting_summary != null ? String(row.targeting_summary) : null,
    spend: Number(row.spend) || 0,
    impressions: Number(row.impressions) || 0,
    clicks: Number(row.clicks) || 0,
    cpc: Number(row.cpc) || 0,
    conversions: Number(row.conversions) || 0,
    currency: String(row.currency || 'SEK'),
    synced_at: row.synced_at
      ? new Date(String(row.synced_at)).toISOString()
      : new Date().toISOString(),
  };
}

function mapAdRow(row: Record<string, unknown>): MetaAdRow {
  return {
    id: String(row.id),
    workspace_id: String(row.workspace_id),
    user_id: String(row.user_id),
    ad_account_id: String(row.ad_account_id),
    campaign_id: String(row.campaign_id),
    adset_id: String(row.adset_id),
    name: String(row.name || ''),
    status: String(row.status || 'PAUSED').toUpperCase(),
    creative_thumbnail:
      row.creative_thumbnail != null ? String(row.creative_thumbnail) : null,
    headline: row.headline != null ? String(row.headline) : null,
    spend: Number(row.spend) || 0,
    impressions: Number(row.impressions) || 0,
    clicks: Number(row.clicks) || 0,
    cpc: Number(row.cpc) || 0,
    conversions: Number(row.conversions) || 0,
    currency: String(row.currency || 'SEK'),
    synced_at: row.synced_at
      ? new Date(String(row.synced_at)).toISOString()
      : new Date().toISOString(),
  };
}

export async function listMetaCampaigns(input: {
  workspaceId: string;
  userId: string;
}): Promise<MetaCampaignRow[]> {
  await ensureMetaCampaignsSchema();
  const rows = await sql`
    SELECT *
    FROM public.meta_campaigns
    WHERE workspace_id = ${input.workspaceId}
      AND user_id = ${input.userId}
    ORDER BY spend DESC, name ASC
  `;
  return ((rows as Array<Record<string, unknown>>) || []).map(mapCampaignRow);
}

export async function listMetaAdAccounts(input: {
  workspaceId: string;
  userId: string;
}): Promise<MetaAdAccount[]> {
  await ensureMetaCampaignsSchema();
  const rows = await sql`
    SELECT id, account_id, name, currency, account_status
    FROM public.meta_ad_accounts
    WHERE workspace_id = ${input.workspaceId}
      AND user_id = ${input.userId}
    ORDER BY name ASC
  `;
  return ((rows as Array<Record<string, unknown>>) || []).map((row) => ({
    id: String(row.id),
    account_id: String(row.account_id),
    name: String(row.name || ''),
    currency: String(row.currency || 'SEK'),
    account_status:
      row.account_status != null ? Number(row.account_status) : null,
  }));
}

export async function upsertMetaAdAccounts(input: {
  workspaceId: string;
  userId: string;
  accounts: MetaAdAccount[];
}): Promise<void> {
  await ensureMetaCampaignsSchema();
  for (const account of input.accounts) {
    await sql`
      INSERT INTO public.meta_ad_accounts
        (id, workspace_id, user_id, account_id, name, currency, account_status, synced_at, updated_at)
      VALUES (
        ${account.id},
        ${input.workspaceId},
        ${input.userId},
        ${account.account_id},
        ${account.name},
        ${account.currency},
        ${account.account_status},
        now(),
        now()
      )
      ON CONFLICT (id) DO UPDATE SET
        workspace_id = EXCLUDED.workspace_id,
        user_id = EXCLUDED.user_id,
        account_id = EXCLUDED.account_id,
        name = EXCLUDED.name,
        currency = EXCLUDED.currency,
        account_status = EXCLUDED.account_status,
        synced_at = now(),
        updated_at = now()
    `;
  }
}

export async function upsertMetaCampaignsFromRemote(input: {
  workspaceId: string;
  userId: string;
  currency: string;
  campaigns: MetaCampaignRemote[];
}): Promise<MetaCampaignRow[]> {
  await ensureMetaCampaignsSchema();
  const currency = input.currency || 'SEK';
  const out: MetaCampaignRow[] = [];

  for (const campaign of input.campaigns) {
    const dailyMajor = budgetMinorToMajor(campaign.daily_budget);
    const rows = await sql`
      INSERT INTO public.meta_campaigns (
        id, workspace_id, user_id, ad_account_id, name, status, objective,
        daily_budget, spend, impressions, clicks, cpc, conversions, purchase_roas,
        currency, synced_at, updated_at
      )
      VALUES (
        ${campaign.id},
        ${input.workspaceId},
        ${input.userId},
        ${campaign.ad_account_id},
        ${campaign.name},
        ${campaign.status},
        ${campaign.objective},
        ${dailyMajor},
        ${campaign.insights.spend},
        ${Math.round(campaign.insights.impressions)},
        ${Math.round(campaign.insights.clicks)},
        ${campaign.insights.cpc},
        ${campaign.insights.conversions || 0},
        ${campaign.insights.purchase_roas || 0},
        ${currency},
        now(),
        now()
      )
      ON CONFLICT (id) DO UPDATE SET
        workspace_id = EXCLUDED.workspace_id,
        user_id = EXCLUDED.user_id,
        ad_account_id = EXCLUDED.ad_account_id,
        name = EXCLUDED.name,
        status = EXCLUDED.status,
        objective = EXCLUDED.objective,
        daily_budget = EXCLUDED.daily_budget,
        spend = EXCLUDED.spend,
        impressions = EXCLUDED.impressions,
        clicks = EXCLUDED.clicks,
        cpc = EXCLUDED.cpc,
        conversions = EXCLUDED.conversions,
        purchase_roas = EXCLUDED.purchase_roas,
        currency = EXCLUDED.currency,
        synced_at = now(),
        updated_at = now()
      RETURNING *
    `;
    const row = rows?.[0] as Record<string, unknown> | undefined;
    if (row) out.push(mapCampaignRow(row));
  }

  return out;
}

export async function listMetaAdSets(input: {
  workspaceId: string;
  userId: string;
  campaignId?: string | null;
}): Promise<MetaAdSetRow[]> {
  await ensureMetaCampaignsSchema();
  const rows = input.campaignId
    ? await sql`
        SELECT * FROM public.meta_adsets
        WHERE workspace_id = ${input.workspaceId}
          AND user_id = ${input.userId}
          AND campaign_id = ${input.campaignId}
        ORDER BY spend DESC, name ASC
      `
    : await sql`
        SELECT * FROM public.meta_adsets
        WHERE workspace_id = ${input.workspaceId}
          AND user_id = ${input.userId}
        ORDER BY spend DESC, name ASC
      `;
  return ((rows as Array<Record<string, unknown>>) || []).map(mapAdSetRow);
}

export async function listMetaAds(input: {
  workspaceId: string;
  userId: string;
  adsetId?: string | null;
  campaignId?: string | null;
}): Promise<MetaAdRow[]> {
  await ensureMetaCampaignsSchema();
  if (input.adsetId) {
    const rows = await sql`
      SELECT * FROM public.meta_ads
      WHERE workspace_id = ${input.workspaceId}
        AND user_id = ${input.userId}
        AND adset_id = ${input.adsetId}
      ORDER BY spend DESC, name ASC
    `;
    return ((rows as Array<Record<string, unknown>>) || []).map(mapAdRow);
  }
  if (input.campaignId) {
    const rows = await sql`
      SELECT * FROM public.meta_ads
      WHERE workspace_id = ${input.workspaceId}
        AND user_id = ${input.userId}
        AND campaign_id = ${input.campaignId}
      ORDER BY spend DESC, name ASC
    `;
    return ((rows as Array<Record<string, unknown>>) || []).map(mapAdRow);
  }
  const rows = await sql`
    SELECT * FROM public.meta_ads
    WHERE workspace_id = ${input.workspaceId}
      AND user_id = ${input.userId}
    ORDER BY spend DESC, name ASC
  `;
  return ((rows as Array<Record<string, unknown>>) || []).map(mapAdRow);
}

export async function upsertMetaAdSetsFromRemote(input: {
  workspaceId: string;
  userId: string;
  currency: string;
  adsets: MetaAdSetRemote[];
}): Promise<void> {
  await ensureMetaCampaignsSchema();
  const currency = input.currency || 'SEK';
  for (const adset of input.adsets) {
    const dailyMajor = budgetMinorToMajor(adset.daily_budget);
    await sql`
      INSERT INTO public.meta_adsets (
        id, workspace_id, user_id, ad_account_id, campaign_id, name, status,
        daily_budget, targeting_summary, spend, impressions, clicks, cpc,
        conversions, currency, synced_at, updated_at
      )
      VALUES (
        ${adset.id},
        ${input.workspaceId},
        ${input.userId},
        ${adset.ad_account_id},
        ${adset.campaign_id},
        ${adset.name},
        ${adset.status},
        ${dailyMajor},
        ${adset.targeting_summary},
        ${adset.insights.spend},
        ${Math.round(adset.insights.impressions)},
        ${Math.round(adset.insights.clicks)},
        ${adset.insights.cpc},
        ${adset.insights.conversions || 0},
        ${currency},
        now(),
        now()
      )
      ON CONFLICT (id) DO UPDATE SET
        workspace_id = EXCLUDED.workspace_id,
        user_id = EXCLUDED.user_id,
        ad_account_id = EXCLUDED.ad_account_id,
        campaign_id = EXCLUDED.campaign_id,
        name = EXCLUDED.name,
        status = EXCLUDED.status,
        daily_budget = EXCLUDED.daily_budget,
        targeting_summary = EXCLUDED.targeting_summary,
        spend = EXCLUDED.spend,
        impressions = EXCLUDED.impressions,
        clicks = EXCLUDED.clicks,
        cpc = EXCLUDED.cpc,
        conversions = EXCLUDED.conversions,
        currency = EXCLUDED.currency,
        synced_at = now(),
        updated_at = now()
    `;
  }
}

export async function upsertMetaAdsFromRemote(input: {
  workspaceId: string;
  userId: string;
  currency: string;
  ads: MetaAdRemote[];
}): Promise<void> {
  await ensureMetaCampaignsSchema();
  const currency = input.currency || 'SEK';
  for (const ad of input.ads) {
    await sql`
      INSERT INTO public.meta_ads (
        id, workspace_id, user_id, ad_account_id, campaign_id, adset_id, name, status,
        creative_thumbnail, headline, spend, impressions, clicks, cpc,
        conversions, currency, synced_at, updated_at
      )
      VALUES (
        ${ad.id},
        ${input.workspaceId},
        ${input.userId},
        ${ad.ad_account_id},
        ${ad.campaign_id},
        ${ad.adset_id},
        ${ad.name},
        ${ad.status},
        ${ad.creative_thumbnail},
        ${ad.headline},
        ${ad.insights.spend},
        ${Math.round(ad.insights.impressions)},
        ${Math.round(ad.insights.clicks)},
        ${ad.insights.cpc},
        ${ad.insights.conversions || 0},
        ${currency},
        now(),
        now()
      )
      ON CONFLICT (id) DO UPDATE SET
        workspace_id = EXCLUDED.workspace_id,
        user_id = EXCLUDED.user_id,
        ad_account_id = EXCLUDED.ad_account_id,
        campaign_id = EXCLUDED.campaign_id,
        adset_id = EXCLUDED.adset_id,
        name = EXCLUDED.name,
        status = EXCLUDED.status,
        creative_thumbnail = EXCLUDED.creative_thumbnail,
        headline = EXCLUDED.headline,
        spend = EXCLUDED.spend,
        impressions = EXCLUDED.impressions,
        clicks = EXCLUDED.clicks,
        cpc = EXCLUDED.cpc,
        conversions = EXCLUDED.conversions,
        currency = EXCLUDED.currency,
        synced_at = now(),
        updated_at = now()
    `;
  }
}

export async function replaceInsightSeries(input: {
  workspaceId: string;
  userId: string;
  adAccountId: string;
  days: MetaInsightDay[];
}): Promise<void> {
  await ensureMetaCampaignsSchema();
  for (const day of input.days) {
    await sql`
      INSERT INTO public.meta_ads_insight_days (
        workspace_id, user_id, ad_account_id, day,
        spend, impressions, clicks, cpc, conversions, purchase_roas
      )
      VALUES (
        ${input.workspaceId},
        ${input.userId},
        ${input.adAccountId},
        ${day.date}::date,
        ${day.spend},
        ${Math.round(day.impressions)},
        ${Math.round(day.clicks)},
        ${day.cpc},
        ${day.conversions},
        ${day.purchase_roas}
      )
      ON CONFLICT (workspace_id, user_id, day) DO UPDATE SET
        ad_account_id = EXCLUDED.ad_account_id,
        spend = EXCLUDED.spend,
        impressions = EXCLUDED.impressions,
        clicks = EXCLUDED.clicks,
        cpc = EXCLUDED.cpc,
        conversions = EXCLUDED.conversions,
        purchase_roas = EXCLUDED.purchase_roas
    `;
  }
}

export async function listInsightSeries(input: {
  workspaceId: string;
  userId: string;
  since: string;
  until: string;
}): Promise<MetaInsightDay[]> {
  await ensureMetaCampaignsSchema();
  const rows = await sql`
    SELECT day, spend, impressions, clicks, cpc, conversions, purchase_roas
    FROM public.meta_ads_insight_days
    WHERE workspace_id = ${input.workspaceId}
      AND user_id = ${input.userId}
      AND day >= ${input.since}::date
      AND day <= ${input.until}::date
    ORDER BY day ASC
  `;
  return ((rows as Array<Record<string, unknown>>) || []).map((row) => ({
    date: String(row.day).slice(0, 10),
    spend: Number(row.spend) || 0,
    impressions: Number(row.impressions) || 0,
    clicks: Number(row.clicks) || 0,
    cpc: Number(row.cpc) || 0,
    conversions: Number(row.conversions) || 0,
    purchase_roas: Number(row.purchase_roas) || 0,
  }));
}

export async function updateLocalAdSetStatus(input: {
  workspaceId: string;
  userId: string;
  adsetId: string;
  status: 'ACTIVE' | 'PAUSED';
}): Promise<MetaAdSetRow | null> {
  await ensureMetaCampaignsSchema();
  const rows = await sql`
    UPDATE public.meta_adsets
    SET status = ${input.status}, updated_at = now()
    WHERE id = ${input.adsetId}
      AND workspace_id = ${input.workspaceId}
      AND user_id = ${input.userId}
    RETURNING *
  `;
  const row = rows?.[0] as Record<string, unknown> | undefined;
  return row ? mapAdSetRow(row) : null;
}

export async function updateLocalAdStatus(input: {
  workspaceId: string;
  userId: string;
  adId: string;
  status: 'ACTIVE' | 'PAUSED';
}): Promise<MetaAdRow | null> {
  await ensureMetaCampaignsSchema();
  const rows = await sql`
    UPDATE public.meta_ads
    SET status = ${input.status}, updated_at = now()
    WHERE id = ${input.adId}
      AND workspace_id = ${input.workspaceId}
      AND user_id = ${input.userId}
    RETURNING *
  `;
  const row = rows?.[0] as Record<string, unknown> | undefined;
  return row ? mapAdRow(row) : null;
}

export async function updateLocalAdSetBudget(input: {
  workspaceId: string;
  userId: string;
  adsetId: string;
  dailyBudget: number;
}): Promise<MetaAdSetRow | null> {
  await ensureMetaCampaignsSchema();
  const daily = Math.max(0, Number(input.dailyBudget) || 0);
  const rows = await sql`
    UPDATE public.meta_adsets
    SET daily_budget = ${daily}, updated_at = now()
    WHERE id = ${input.adsetId}
      AND workspace_id = ${input.workspaceId}
      AND user_id = ${input.userId}
    RETURNING *
  `;
  const row = rows?.[0] as Record<string, unknown> | undefined;
  return row ? mapAdSetRow(row) : null;
}

/** Insert a locally created campaign (wizard / demo). */
export async function insertLocalCampaign(input: {
  id: string;
  workspaceId: string;
  userId: string;
  adAccountId: string;
  name: string;
  status: string;
  objective: string;
  dailyBudget: number;
  currency?: string;
}): Promise<MetaCampaignRow> {
  await ensureMetaCampaignsSchema();
  const rows = await sql`
    INSERT INTO public.meta_campaigns (
      id, workspace_id, user_id, ad_account_id, name, status, objective,
      daily_budget, spend, impressions, clicks, cpc, conversions, purchase_roas,
      currency, synced_at, updated_at
    )
    VALUES (
      ${input.id},
      ${input.workspaceId},
      ${input.userId},
      ${input.adAccountId},
      ${input.name},
      ${input.status},
      ${input.objective},
      ${Math.max(0, input.dailyBudget)},
      0, 0, 0, 0, 0, 0,
      ${input.currency || 'SEK'},
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      status = EXCLUDED.status,
      objective = EXCLUDED.objective,
      daily_budget = EXCLUDED.daily_budget,
      updated_at = now()
    RETURNING *
  `;
  return mapCampaignRow(rows[0] as Record<string, unknown>);
}

export async function insertLocalAdSet(input: {
  id: string;
  workspaceId: string;
  userId: string;
  adAccountId: string;
  campaignId: string;
  name: string;
  status: string;
  dailyBudget: number;
  targetingSummary: string | null;
  currency?: string;
}): Promise<MetaAdSetRow> {
  await ensureMetaCampaignsSchema();
  const rows = await sql`
    INSERT INTO public.meta_adsets (
      id, workspace_id, user_id, ad_account_id, campaign_id, name, status,
      daily_budget, targeting_summary, spend, impressions, clicks, cpc,
      conversions, currency, synced_at, updated_at
    )
    VALUES (
      ${input.id},
      ${input.workspaceId},
      ${input.userId},
      ${input.adAccountId},
      ${input.campaignId},
      ${input.name},
      ${input.status},
      ${Math.max(0, input.dailyBudget)},
      ${input.targetingSummary},
      0, 0, 0, 0, 0,
      ${input.currency || 'SEK'},
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      status = EXCLUDED.status,
      daily_budget = EXCLUDED.daily_budget,
      targeting_summary = EXCLUDED.targeting_summary,
      updated_at = now()
    RETURNING *
  `;
  return mapAdSetRow(rows[0] as Record<string, unknown>);
}

export async function insertLocalAd(input: {
  id: string;
  workspaceId: string;
  userId: string;
  adAccountId: string;
  campaignId: string;
  adsetId: string;
  name: string;
  status: string;
  creativeThumbnail: string | null;
  headline: string | null;
  currency?: string;
}): Promise<MetaAdRow> {
  await ensureMetaCampaignsSchema();
  const rows = await sql`
    INSERT INTO public.meta_ads (
      id, workspace_id, user_id, ad_account_id, campaign_id, adset_id, name, status,
      creative_thumbnail, headline, spend, impressions, clicks, cpc,
      conversions, currency, synced_at, updated_at
    )
    VALUES (
      ${input.id},
      ${input.workspaceId},
      ${input.userId},
      ${input.adAccountId},
      ${input.campaignId},
      ${input.adsetId},
      ${input.name},
      ${input.status},
      ${input.creativeThumbnail},
      ${input.headline},
      0, 0, 0, 0, 0,
      ${input.currency || 'SEK'},
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      status = EXCLUDED.status,
      creative_thumbnail = EXCLUDED.creative_thumbnail,
      headline = EXCLUDED.headline,
      updated_at = now()
    RETURNING *
  `;
  return mapAdRow(rows[0] as Record<string, unknown>);
}

export async function updateLocalCampaignStatus(input: {
  workspaceId: string;
  userId: string;
  campaignId: string;
  status: 'ACTIVE' | 'PAUSED';
}): Promise<MetaCampaignRow | null> {
  await ensureMetaCampaignsSchema();
  const rows = await sql`
    UPDATE public.meta_campaigns
    SET status = ${input.status}, updated_at = now()
    WHERE id = ${input.campaignId}
      AND workspace_id = ${input.workspaceId}
      AND user_id = ${input.userId}
    RETURNING *
  `;
  const row = rows?.[0] as Record<string, unknown> | undefined;
  return row ? mapCampaignRow(row) : null;
}

export async function updateLocalCampaignBudget(input: {
  workspaceId: string;
  userId: string;
  campaignId: string;
  /** Major currency units (e.g. SEK). */
  dailyBudget: number;
}): Promise<MetaCampaignRow | null> {
  await ensureMetaCampaignsSchema();
  const daily = Math.max(0, Number(input.dailyBudget) || 0);
  const rows = await sql`
    UPDATE public.meta_campaigns
    SET daily_budget = ${daily}, updated_at = now()
    WHERE id = ${input.campaignId}
      AND workspace_id = ${input.workspaceId}
      AND user_id = ${input.userId}
    RETURNING *
  `;
  const row = rows?.[0] as Record<string, unknown> | undefined;
  return row ? mapCampaignRow(row) : null;
}

export function aggregateCampaignKpis(campaigns: MetaCampaignRow[]) {
  const spend = campaigns.reduce((s, c) => s + (Number(c.spend) || 0), 0);
  const impressions = campaigns.reduce(
    (s, c) => s + (Number(c.impressions) || 0),
    0
  );
  const clicks = campaigns.reduce((s, c) => s + (Number(c.clicks) || 0), 0);
  const conversions = campaigns.reduce(
    (s, c) => s + (Number(c.conversions) || 0),
    0
  );
  const cpc =
    clicks > 0
      ? spend / clicks
      : campaigns.length
        ? campaigns.reduce((s, c) => s + (Number(c.cpc) || 0), 0) /
          campaigns.length
        : 0;
  const roasWeighted = campaigns.reduce((s, c) => {
    const sp = Number(c.spend) || 0;
    return s + (Number(c.purchase_roas) || 0) * sp;
  }, 0);
  const avgRoas = spend > 0 ? roasWeighted / spend : 0;
  return {
    totalSpend: Math.round(spend * 100) / 100,
    impressions,
    clicks,
    conversions: Math.round(conversions * 100) / 100,
    avgCpc: Math.round(cpc * 100) / 100,
    avgRoas: Math.round(avgRoas * 100) / 100,
  };
}

/** Aggregate KPIs from a daily insight series (preferred for date-range views). */
export function aggregateSeriesKpis(days: MetaInsightDay[]) {
  const spend = days.reduce((s, d) => s + d.spend, 0);
  const impressions = days.reduce((s, d) => s + d.impressions, 0);
  const clicks = days.reduce((s, d) => s + d.clicks, 0);
  const conversions = days.reduce((s, d) => s + d.conversions, 0);
  const roasWeighted = days.reduce(
    (s, d) => s + d.purchase_roas * d.spend,
    0
  );
  return {
    totalSpend: Math.round(spend * 100) / 100,
    impressions,
    clicks,
    conversions: Math.round(conversions * 100) / 100,
    avgCpc: clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0,
    avgRoas: spend > 0 ? Math.round((roasWeighted / spend) * 100) / 100 : 0,
  };
}

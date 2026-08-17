-- Meta Ads Management — synced campaigns + ad accounts (workspace-scoped).

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
);

ALTER TABLE public.meta_campaigns
  ADD COLUMN IF NOT EXISTS workspace_id text,
  ADD COLUMN IF NOT EXISTS user_id text,
  ADD COLUMN IF NOT EXISTS ad_account_id text,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS objective text,
  ADD COLUMN IF NOT EXISTS daily_budget numeric,
  ADD COLUMN IF NOT EXISTS spend numeric,
  ADD COLUMN IF NOT EXISTS impressions bigint,
  ADD COLUMN IF NOT EXISTS clicks bigint,
  ADD COLUMN IF NOT EXISTS cpc numeric,
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

CREATE INDEX IF NOT EXISTS meta_campaigns_ws_idx
  ON public.meta_campaigns (workspace_id, synced_at DESC);

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
);

ALTER TABLE public.meta_ad_accounts
  ADD COLUMN IF NOT EXISTS workspace_id text,
  ADD COLUMN IF NOT EXISTS user_id text,
  ADD COLUMN IF NOT EXISTS account_id text,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS account_status int,
  ADD COLUMN IF NOT EXISTS synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

CREATE INDEX IF NOT EXISTS meta_ad_accounts_ws_idx
  ON public.meta_ad_accounts (workspace_id);

ALTER TABLE public.meta_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ad_accounts ENABLE ROW LEVEL SECURITY;

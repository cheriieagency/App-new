-- Meta Ads Manager — ad sets, ads, and daily insight series (v20 hierarchy).

ALTER TABLE public.meta_campaigns
  ADD COLUMN IF NOT EXISTS conversions numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS purchase_roas numeric NOT NULL DEFAULT 0;

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
);

CREATE INDEX IF NOT EXISTS meta_adsets_ws_campaign_idx
  ON public.meta_adsets (workspace_id, campaign_id);

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
);

CREATE INDEX IF NOT EXISTS meta_ads_ws_adset_idx
  ON public.meta_ads (workspace_id, adset_id);

CREATE TABLE IF NOT EXISTS public.meta_ads_insight_days (
  workspace_id   text NOT NULL,
  user_id        text NOT NULL,
  ad_account_id  text NOT NULL DEFAULT '',
  day            date NOT NULL,
  spend          numeric NOT NULL DEFAULT 0,
  impressions    bigint NOT NULL DEFAULT 0,
  clicks         bigint NOT NULL DEFAULT 0,
  cpc            numeric NOT NULL DEFAULT 0,
  conversions    numeric NOT NULL DEFAULT 0,
  purchase_roas  numeric NOT NULL DEFAULT 0,
  PRIMARY KEY (workspace_id, user_id, day)
);

ALTER TABLE public.meta_adsets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ads_insight_days ENABLE ROW LEVEL SECURITY;

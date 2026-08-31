-- Meta Graph IDs are numeric strings (e.g. act_120254718972260350).
-- Older schemas used uuid PKs which reject real Meta account/campaign ids.

ALTER TABLE public.meta_ad_accounts ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.meta_ad_accounts ALTER COLUMN account_id DROP DEFAULT;
ALTER TABLE public.meta_campaigns ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.meta_campaigns ALTER COLUMN ad_account_id DROP DEFAULT;
ALTER TABLE public.meta_adsets ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.meta_adsets ALTER COLUMN ad_account_id DROP DEFAULT;
ALTER TABLE public.meta_adsets ALTER COLUMN campaign_id DROP DEFAULT;
ALTER TABLE public.meta_ads ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.meta_ads ALTER COLUMN ad_account_id DROP DEFAULT;
ALTER TABLE public.meta_ads ALTER COLUMN campaign_id DROP DEFAULT;
ALTER TABLE public.meta_ads ALTER COLUMN adset_id DROP DEFAULT;
ALTER TABLE public.meta_ads_insight_days ALTER COLUMN ad_account_id DROP DEFAULT;

ALTER TABLE public.meta_ad_accounts
  ALTER COLUMN id TYPE text USING id::text,
  ALTER COLUMN account_id TYPE text USING account_id::text,
  ALTER COLUMN workspace_id TYPE text USING workspace_id::text,
  ALTER COLUMN user_id TYPE text USING user_id::text;

ALTER TABLE public.meta_campaigns
  ALTER COLUMN id TYPE text USING id::text,
  ALTER COLUMN ad_account_id TYPE text USING ad_account_id::text,
  ALTER COLUMN workspace_id TYPE text USING workspace_id::text,
  ALTER COLUMN user_id TYPE text USING user_id::text;

ALTER TABLE public.meta_adsets
  ALTER COLUMN id TYPE text USING id::text,
  ALTER COLUMN ad_account_id TYPE text USING ad_account_id::text,
  ALTER COLUMN campaign_id TYPE text USING campaign_id::text,
  ALTER COLUMN workspace_id TYPE text USING workspace_id::text,
  ALTER COLUMN user_id TYPE text USING user_id::text;

ALTER TABLE public.meta_ads
  ALTER COLUMN id TYPE text USING id::text,
  ALTER COLUMN ad_account_id TYPE text USING ad_account_id::text,
  ALTER COLUMN campaign_id TYPE text USING campaign_id::text,
  ALTER COLUMN adset_id TYPE text USING adset_id::text,
  ALTER COLUMN workspace_id TYPE text USING workspace_id::text,
  ALTER COLUMN user_id TYPE text USING user_id::text;

ALTER TABLE public.meta_ads_insight_days
  ALTER COLUMN ad_account_id TYPE text USING ad_account_id::text,
  ALTER COLUMN workspace_id TYPE text USING workspace_id::text,
  ALTER COLUMN user_id TYPE text USING user_id::text;

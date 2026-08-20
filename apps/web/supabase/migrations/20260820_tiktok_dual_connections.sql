-- TikTok dual connections: profile (Login Kit) + business tokens per workspace.
-- Apply: psql "$DATABASE_URL" -f apps/web/supabase/migrations/20260820_tiktok_dual_connections.sql

-- 1) tiktok_tokens: one row per (workspace, user, token_source)
DROP INDEX IF EXISTS public.tiktok_tokens_ws_user_uidx;

CREATE UNIQUE INDEX IF NOT EXISTS tiktok_tokens_ws_user_source_uidx
  ON public.tiktok_tokens (workspace_id, user_id, token_source);

-- 2) social_accounts: allow tiktok_business as a distinct platform row
ALTER TABLE public.social_accounts
  DROP CONSTRAINT IF EXISTS social_accounts_platform_check;

ALTER TABLE public.social_accounts
  ADD CONSTRAINT social_accounts_platform_check
  CHECK (platform IN (
    'instagram', 'facebook', 'tiktok', 'tiktok_business',
    'linkedin', 'youtube', 'pinterest', 'google'
  ));

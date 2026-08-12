-- Persist IG Business profile metrics alongside OAuth tokens.
-- Apply: psql "$DATABASE_URL" -f apps/web/supabase/migrations/20260812_meta_profile_fields.sql

ALTER TABLE public.social_accounts
  ADD COLUMN IF NOT EXISTS followers_count integer;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS followers_count integer,
  ADD COLUMN IF NOT EXISTS handle text;

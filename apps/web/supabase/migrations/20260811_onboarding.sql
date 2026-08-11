-- Additive migration: onboarding questionnaire fields
-- Apply: psql "$DATABASE_URL" -f apps/web/supabase/migrations/20260811_onboarding.sql

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS role_category text,
  ADD COLUMN IF NOT EXISTS primary_use_cases text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS referral_source text,
  ADD COLUMN IF NOT EXISTS brand_name text,
  ADD COLUMN IF NOT EXISTS brand_website text,
  ADD COLUMN IF NOT EXISTS team_size text,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.user_onboarding_responses (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name            text,
  role_category        text,
  primary_use_cases    text[] NOT NULL DEFAULT '{}',
  referral_source      text,
  brand_name           text,
  brand_website        text,
  team_size            text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_onboarding_responses_user_idx
  ON public.user_onboarding_responses (user_id);

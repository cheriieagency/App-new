-- User settings + workspace branding / invites
-- Apply: psql "$DATABASE_URL" -f apps/web/supabase/migrations/20260817_user_settings.sql

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id              text PRIMARY KEY,
  timezone             text NOT NULL DEFAULT 'Europe/Stockholm',
  notification_prefs   jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS pending_invites jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_settings_owner_all ON public.user_settings;
CREATE POLICY user_settings_owner_all ON public.user_settings
  FOR ALL
  USING (auth.uid()::text = user_id OR user_id = auth.uid()::text)
  WITH CHECK (auth.uid()::text = user_id OR user_id = auth.uid()::text);

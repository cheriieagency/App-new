-- Workspace brand profiles (bio + channels) stored on public.workspaces
-- Apply: psql "$DATABASE_URL" -f apps/web/supabase/migrations/20260817_workspace_profiles.sql

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS handle text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS color text DEFAULT '#2B2568',
  ADD COLUMN IF NOT EXISTS channels jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS profile_data jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS workspaces_user_idx
  ON public.workspaces (user_id);

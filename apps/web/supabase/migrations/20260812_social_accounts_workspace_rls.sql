-- Workspace binding + RLS for social_accounts persistence
-- Apply: psql "$DATABASE_URL" -f apps/web/supabase/migrations/20260812_social_accounts_workspace_rls.sql

ALTER TABLE public.social_accounts
  ADD COLUMN IF NOT EXISTS workspace_id text,
  ADD COLUMN IF NOT EXISTS refresh_token text,
  ADD COLUMN IF NOT EXISTS followers_count integer;

CREATE INDEX IF NOT EXISTS social_accounts_workspace_idx
  ON public.social_accounts (workspace_id);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS followers_count integer,
  ADD COLUMN IF NOT EXISTS handle text;

ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users to manage their social accounts" ON public.social_accounts;
CREATE POLICY "Allow users to manage their social accounts"
ON public.social_accounts FOR ALL TO authenticated
USING (auth.uid()::text = user_id OR user_id = auth.uid()::text)
WITH CHECK (auth.uid()::text = user_id OR user_id = auth.uid()::text);

-- Service-role / server SQL (Neon) bypasses RLS; policy protects direct Supabase client access.

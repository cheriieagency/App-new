-- Align live Supabase social_accounts with clikd: OAuth persistence
-- UNIQUE already: (user_id, platform)

ALTER TABLE public.social_accounts
  ADD COLUMN IF NOT EXISTS platform_user_id text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS handle text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS workspace_id text,
  ADD COLUMN IF NOT EXISTS page_id text,
  ADD COLUMN IF NOT EXISTS page_name text,
  ADD COLUMN IF NOT EXISTS followers_count integer,
  ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS connected_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users full access to social accounts" ON public.social_accounts;
CREATE POLICY "Allow authenticated users full access to social accounts"
ON public.social_accounts FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow users to manage their social accounts" ON public.social_accounts;

GRANT ALL ON public.social_accounts TO authenticated, service_role, anon;

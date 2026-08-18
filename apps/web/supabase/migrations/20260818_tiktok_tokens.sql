-- TikTok Business / Login Kit OAuth tokens (Social Inbox + Messaging)
-- Apply: psql "$DATABASE_URL" -f apps/web/supabase/migrations/20260818_tiktok_tokens.sql

CREATE TABLE IF NOT EXISTS public.tiktok_tokens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    text NOT NULL,
  user_id         text NOT NULL,
  open_id         text,
  access_token    text NOT NULL,
  refresh_token   text,
  advertiser_ids  jsonb NOT NULL DEFAULT '[]'::jsonb,
  scope           text,
  token_source    text NOT NULL DEFAULT 'business',
  expires_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tiktok_tokens_ws_user_uidx
  ON public.tiktok_tokens (workspace_id, user_id);

CREATE INDEX IF NOT EXISTS tiktok_tokens_open_id_idx
  ON public.tiktok_tokens (open_id)
  WHERE open_id IS NOT NULL;

ALTER TABLE public.tiktok_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tiktok_tokens_owner_all ON public.tiktok_tokens;
CREATE POLICY tiktok_tokens_owner_all ON public.tiktok_tokens
  FOR ALL
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Live broadcast sessions + chat
-- Apply: psql "$DATABASE_URL" -f apps/web/supabase/migrations/20260817_live_sessions.sql

CREATE TABLE IF NOT EXISTS public.live_sessions (
  slug            text PRIMARY KEY,
  title           text NOT NULL DEFAULT 'Live',
  creator_name    text NOT NULL DEFAULT 'Creator',
  creator_user_id text,
  community_name  text,
  is_live         boolean NOT NULL DEFAULT false,
  viewer_count    integer NOT NULL DEFAULT 0,
  started_at      timestamptz,
  ended_at        timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.live_chat_messages (
  id           text PRIMARY KEY,
  slug         text NOT NULL REFERENCES public.live_sessions(slug) ON DELETE CASCADE,
  name         text NOT NULL DEFAULT 'Gäst',
  msg          text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS live_chat_slug_idx
  ON public.live_chat_messages (slug, created_at DESC);

-- Public watch/chat is intentional; writes go through the Next.js API (service role / DATABASE_URL).
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS live_sessions_public_read ON public.live_sessions;
CREATE POLICY live_sessions_public_read ON public.live_sessions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS live_chat_public_read ON public.live_chat_messages;
CREATE POLICY live_chat_public_read ON public.live_chat_messages
  FOR SELECT USING (true);

-- TikTok Direct Messaging (Social Inbox)
-- Apply: psql "$DATABASE_URL" -f apps/web/supabase/migrations/20260817_tiktok_inbox.sql

CREATE TABLE IF NOT EXISTS public.tiktok_conversations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    text NOT NULL,
  user_id         text,
  tiktok_user_id  text NOT NULL,
  username        text NOT NULL DEFAULT '',
  avatar_url      text,
  last_message    text NOT NULL DEFAULT '',
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tiktok_conversations_ws_user_uidx
  ON public.tiktok_conversations (workspace_id, tiktok_user_id);

CREATE INDEX IF NOT EXISTS tiktok_conversations_ws_updated_idx
  ON public.tiktok_conversations (workspace_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.tiktok_messages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  uuid NOT NULL REFERENCES public.tiktok_conversations(id) ON DELETE CASCADE,
  sender_id        text NOT NULL DEFAULT '',
  content          text NOT NULL DEFAULT '',
  media_url        text,
  is_outgoing      boolean NOT NULL DEFAULT false,
  external_id      text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tiktok_messages_conversation_idx
  ON public.tiktok_messages (conversation_id, created_at ASC);

CREATE UNIQUE INDEX IF NOT EXISTS tiktok_messages_external_uidx
  ON public.tiktok_messages (external_id)
  WHERE external_id IS NOT NULL AND external_id <> '';

ALTER TABLE public.tiktok_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiktok_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tiktok_conversations_owner_all ON public.tiktok_conversations;
CREATE POLICY tiktok_conversations_owner_all ON public.tiktok_conversations
  FOR ALL
  USING (user_id IS NULL OR auth.uid()::text = user_id)
  WITH CHECK (user_id IS NULL OR auth.uid()::text = user_id);

DROP POLICY IF EXISTS tiktok_messages_via_conversation ON public.tiktok_messages;
CREATE POLICY tiktok_messages_via_conversation ON public.tiktok_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tiktok_conversations c
      WHERE c.id = conversation_id
        AND (c.user_id IS NULL OR c.user_id = auth.uid()::text)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tiktok_conversations c
      WHERE c.id = conversation_id
        AND (c.user_id IS NULL OR c.user_id = auth.uid()::text)
    )
  );

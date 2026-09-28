-- In-app creator notifications (admin header bell)
-- Apply: psql "$DATABASE_URL" -f apps/web/supabase/migrations/20260928_user_notifications.sql

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id           bigserial PRIMARY KEY,
  user_id      text NOT NULL,
  pref_key     text NOT NULL,
  title        text NOT NULL,
  body         text,
  href         text,
  meta         jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_notifications_user_created_idx
  ON public.user_notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS user_notifications_user_unread_idx
  ON public.user_notifications (user_id)
  WHERE read_at IS NULL;

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_notifications_owner_all ON public.user_notifications;
CREATE POLICY user_notifications_owner_all ON public.user_notifications
  FOR ALL
  USING (auth.uid()::text = user_id OR user_id = auth.uid()::text)
  WITH CHECK (auth.uid()::text = user_id OR user_id = auth.uid()::text);

-- Rella-style publish modes on planner posts + reminder jobs table.
-- publish_mode: auto_publish | notification_reminder | tiktok_draft

ALTER TABLE public.planner_posts
  ADD COLUMN IF NOT EXISTS publish_mode text NOT NULL DEFAULT 'auto_publish';

ALTER TABLE public.planner_posts
  ADD COLUMN IF NOT EXISTS trending_sound_note text;

ALTER TABLE public.planner_posts
  ADD COLUMN IF NOT EXISTS media_urls jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.planner_posts.publish_mode IS
  'auto_publish | notification_reminder | tiktok_draft';

CREATE TABLE IF NOT EXISTS public.publish_reminder_jobs (
  id                    text PRIMARY KEY,
  workspace_id          text NOT NULL,
  user_id               text NOT NULL,
  post_id               text,
  caption               text NOT NULL DEFAULT '',
  trending_sound_note   text,
  media_urls            jsonb NOT NULL DEFAULT '[]'::jsonb,
  deep_links            jsonb NOT NULL DEFAULT '{}'::jsonb,
  platforms             jsonb NOT NULL DEFAULT '[]'::jsonb,
  status                text NOT NULL DEFAULT 'pending',
  scheduled_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS publish_reminder_jobs_user_idx
  ON public.publish_reminder_jobs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS publish_reminder_jobs_pending_idx
  ON public.publish_reminder_jobs (scheduled_at)
  WHERE status = 'pending';

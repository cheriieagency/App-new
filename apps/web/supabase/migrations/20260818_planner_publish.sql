-- Planner publish failures + cron index for scheduled auto-post
-- Apply: psql "$DATABASE_URL" -f apps/web/supabase/migrations/20260818_planner_publish.sql

ALTER TABLE public.planner_posts
  ADD COLUMN IF NOT EXISTS error_log text;

CREATE INDEX IF NOT EXISTS planner_posts_scheduled_auto_idx
  ON public.planner_posts (scheduled_at)
  WHERE workflow = 'SCHEDULED'
    AND auto_post = true
    AND scheduled_at IS NOT NULL;

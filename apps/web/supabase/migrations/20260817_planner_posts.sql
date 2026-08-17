-- Durable content planner posts (Kanban / Studio)
-- Apply: psql "$DATABASE_URL" -f apps/web/supabase/migrations/20260817_planner_posts.sql

CREATE TABLE IF NOT EXISTS public.planner_posts (
  id              text PRIMARY KEY,
  workspace_id    text,
  user_id         text NOT NULL,
  title           text NOT NULL DEFAULT '',
  caption         text NOT NULL DEFAULT '',
  hashtags        text NOT NULL DEFAULT '',
  platforms       jsonb NOT NULL DEFAULT '[]'::jsonb,
  workflow        text NOT NULL DEFAULT 'IDEA',
  status          text NOT NULL DEFAULT 'draft',
  scheduled_at    timestamptz,
  published_at    timestamptz,
  media_url       text,
  media_type      text,
  media_items     jsonb NOT NULL DEFAULT '[]'::jsonb,
  youtube         jsonb,
  idea_title      text,
  project         text NOT NULL DEFAULT '',
  campaigns       jsonb NOT NULL DEFAULT '[]'::jsonb,
  assignees       jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtasks        jsonb NOT NULL DEFAULT '[]'::jsonb,
  auto_post       boolean NOT NULL DEFAULT false,
  activity        jsonb NOT NULL DEFAULT '[]'::jsonb,
  comments        jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by      text NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS planner_posts_user_idx
  ON public.planner_posts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS planner_posts_workspace_idx
  ON public.planner_posts (workspace_id, created_at DESC)
  WHERE workspace_id IS NOT NULL AND workspace_id <> '';

CREATE INDEX IF NOT EXISTS planner_posts_project_idx
  ON public.planner_posts (user_id, project);

ALTER TABLE public.planner_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_posts_owner_all ON public.planner_posts;
CREATE POLICY planner_posts_owner_all ON public.planner_posts
  FOR ALL
  USING (auth.uid()::text = user_id OR user_id = auth.uid()::text)
  WITH CHECK (auth.uid()::text = user_id OR user_id = auth.uid()::text);

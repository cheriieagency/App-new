-- Planner team roster
-- Apply: psql "$DATABASE_URL" -f apps/web/supabase/migrations/20260817_planner_team.sql

CREATE TABLE IF NOT EXISTS public.planner_team_members (
  id              text PRIMARY KEY,
  owner_user_id   text NOT NULL,
  name            text NOT NULL,
  email           text NOT NULL,
  role            text NOT NULL DEFAULT 'editor',
  project         text NOT NULL DEFAULT '',
  avatar_url      text NOT NULL DEFAULT '',
  planner_access  boolean NOT NULL DEFAULT false,
  status          text NOT NULL DEFAULT 'pending',
  invited_at      timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, email)
);

CREATE INDEX IF NOT EXISTS planner_team_owner_idx
  ON public.planner_team_members (owner_user_id, invited_at DESC);

ALTER TABLE public.planner_team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planner_team_owner_all ON public.planner_team_members;
CREATE POLICY planner_team_owner_all ON public.planner_team_members
  FOR ALL
  USING (auth.uid()::text = owner_user_id OR owner_user_id = auth.uid()::text)
  WITH CHECK (auth.uid()::text = owner_user_id OR owner_user_id = auth.uid()::text);

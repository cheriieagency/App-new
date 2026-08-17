-- Classroom lesson completion progress
-- Apply: psql "$DATABASE_URL" -f apps/web/supabase/migrations/20260817_lesson_completions.sql

CREATE TABLE IF NOT EXISTS public.lesson_completions (
  user_id      text NOT NULL,
  lesson_id    integer NOT NULL,
  course_id    integer,
  community_id integer,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS lesson_completions_user_idx
  ON public.lesson_completions (user_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS lesson_completions_course_idx
  ON public.lesson_completions (user_id, course_id)
  WHERE course_id IS NOT NULL;

ALTER TABLE public.lesson_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lesson_completions_owner_all ON public.lesson_completions;
CREATE POLICY lesson_completions_owner_all ON public.lesson_completions
  FOR ALL
  USING (auth.uid()::text = user_id OR user_id = auth.uid()::text)
  WITH CHECK (auth.uid()::text = user_id OR user_id = auth.uid()::text);

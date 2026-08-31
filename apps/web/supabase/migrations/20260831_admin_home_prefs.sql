-- Per-user Admin Home prefs: quick-access shortcuts + sticky note color.

CREATE TABLE IF NOT EXISTS public.admin_home_prefs (
  workspace_id text NOT NULL,
  user_id      text NOT NULL,
  shortcuts    jsonb NOT NULL DEFAULT '["calendar","analytics","biobuilder"]'::jsonb,
  sticky_color text NOT NULL DEFAULT 'lilac',
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

ALTER TABLE public.admin_home_prefs
  ADD COLUMN IF NOT EXISTS sticky_color text NOT NULL DEFAULT 'lilac';

ALTER TABLE public.admin_home_prefs ENABLE ROW LEVEL SECURITY;

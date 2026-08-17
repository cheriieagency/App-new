-- Client review share links for planner posts (public chat only).

ALTER TABLE public.planner_posts
  ADD COLUMN IF NOT EXISTS share_token text;

ALTER TABLE public.planner_posts
  ADD COLUMN IF NOT EXISTS share_enabled boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS planner_posts_share_token_uidx
  ON public.planner_posts (share_token)
  WHERE share_token IS NOT NULL AND share_token <> '';

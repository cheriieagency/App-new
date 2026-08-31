-- Later-style More Options on planner posts.
-- collaborators | first_comment | location_* | link_in_bio_url | post_tags | campaign_tag

ALTER TABLE public.planner_posts
  ADD COLUMN IF NOT EXISTS collaborators jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.planner_posts
  ADD COLUMN IF NOT EXISTS first_comment text;

ALTER TABLE public.planner_posts
  ADD COLUMN IF NOT EXISTS location_name text;

ALTER TABLE public.planner_posts
  ADD COLUMN IF NOT EXISTS location_id text;

ALTER TABLE public.planner_posts
  ADD COLUMN IF NOT EXISTS link_in_bio_url text;

ALTER TABLE public.planner_posts
  ADD COLUMN IF NOT EXISTS post_tags jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.planner_posts
  ADD COLUMN IF NOT EXISTS campaign_tag text;

COMMENT ON COLUMN public.planner_posts.collaborators IS
  'Up to 3 Instagram usernames invited as collaborators';

COMMENT ON COLUMN public.planner_posts.first_comment IS
  'Optional comment auto-posted via Graph /media/comments after publish';

COMMENT ON COLUMN public.planner_posts.link_in_bio_url IS
  'Optional URL that updates Clikd Link in Bio redirect mapping on publish';

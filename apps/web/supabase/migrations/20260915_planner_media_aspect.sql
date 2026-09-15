-- Feed frame size for Post Studio photos / carousels (1:1, 4:5, 9:16).
ALTER TABLE public.planner_posts
  ADD COLUMN IF NOT EXISTS media_aspect text;

COMMENT ON COLUMN public.planner_posts.media_aspect IS
  'Feed aspect for photos/carousels: 1:1, 4:5, or 9:16 (TikTok).';

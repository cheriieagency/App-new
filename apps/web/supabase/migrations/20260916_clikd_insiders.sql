-- Clikd Insiders: default community every new account joins.
-- Runtime bootstrap (lib/communities/insiders.ts) also heals ownership to hello@clikd.app.
-- This migration is idempotent documentation + safety net for slug/name.

-- Prefer attaching to an existing "Clikd insiders" row if present.
UPDATE public.communities
SET
  name = 'Clikd insiders',
  slug = 'clikd-insiders',
  is_published = true,
  is_featured = true,
  is_free = true,
  monthly_price_sek = 0,
  updated_at = NOW()
WHERE lower(trim(name)) = 'clikd insiders'
   OR slug = 'clikd-insiders';

-- Insert only when no Insiders community exists yet.
INSERT INTO public.communities (
  name,
  slug,
  description,
  category,
  cover_color,
  member_count,
  is_featured,
  is_published,
  workspace_id,
  is_free,
  monthly_price_sek
)
SELECT
  'Clikd insiders',
  'clikd-insiders',
  'Your creator community.',
  'Community',
  '#2C3B2E',
  0,
  true,
  true,
  'clikd-insiders-workspace',
  true,
  0
WHERE NOT EXISTS (
  SELECT 1 FROM public.communities
  WHERE slug = 'clikd-insiders'
     OR lower(trim(name)) = 'clikd insiders'
);

-- Promote hello@clikd.app to owner when that user exists.
UPDATE public.communities c
SET
  creator_id = u.id,
  user_id = u.id,
  creator_name = COALESCE(NULLIF(trim(u.name), ''), 'Clikd QA'),
  creator_image = u.image,
  updated_at = NOW()
FROM public."user" u
WHERE lower(trim(u.email)) = 'hello@clikd.app'
  AND (c.slug = 'clikd-insiders' OR lower(trim(c.name)) = 'clikd insiders');

INSERT INTO public.community_memberships (user_id, community_id, role)
SELECT u.id, c.id, 'owner'
FROM public."user" u
CROSS JOIN public.communities c
WHERE lower(trim(u.email)) = 'hello@clikd.app'
  AND (c.slug = 'clikd-insiders' OR lower(trim(c.name)) = 'clikd insiders')
ON CONFLICT (user_id, community_id) DO UPDATE
  SET role = 'owner';

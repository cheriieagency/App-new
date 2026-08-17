-- Purge known placeholder / demo communities only (safe to re-run).
-- Does NOT truncate communities — real creator communities are preserved.

BEGIN;

WITH demo AS (
  SELECT id
  FROM communities
  WHERE slug IN (
    'nordic-creator',
    'halsa-tillvaxt',
    'healthy-growth',
    'ebba-creator-lab',
    'ebba-live-studio',
    'coaching-lab',
    'creator-finance',
    'ekonomi-kreatörer',
    'ekonomi-kreatore',
    'tech-builders',
    'svensk-ehandel-growth'
  )
  OR lower(name) IN (
    'clikd hub',
    'nordic creator hub',
    'hälsosam tillväxt',
    'halsosam tillvaxt',
    'ebba creator lab',
    'ebba live studio'
  )
)
DELETE FROM community_memberships
WHERE community_id IN (SELECT id FROM demo);

WITH demo AS (
  SELECT id, slug
  FROM communities
  WHERE slug IN (
    'nordic-creator',
    'halsa-tillvaxt',
    'healthy-growth',
    'ebba-creator-lab',
    'ebba-live-studio',
    'coaching-lab',
    'creator-finance',
    'ekonomi-kreatörer',
    'ekonomi-kreatore',
    'tech-builders',
    'svensk-ehandel-growth'
  )
  OR lower(name) IN (
    'clikd hub',
    'nordic creator hub',
    'hälsosam tillväxt',
    'halsosam tillvaxt',
    'ebba creator lab',
    'ebba live studio'
  )
)
DELETE FROM communities
WHERE id IN (SELECT id FROM demo);

COMMIT;

-- Heal bio_blocks for Publish Changes (social icons + theme).
CREATE TABLE IF NOT EXISTS bio_blocks (
  id           bigserial PRIMARY KEY,
  user_id      text NOT NULL,
  blocks       jsonb NOT NULL DEFAULT '[]'::jsonb,
  handle       text,
  display_name text,
  bio_text     text,
  avatar_url   text,
  social_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  theme        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bio_blocks
  ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE bio_blocks
  ADD COLUMN IF NOT EXISTS theme jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS bio_blocks_user_uidx
  ON bio_blocks (user_id);

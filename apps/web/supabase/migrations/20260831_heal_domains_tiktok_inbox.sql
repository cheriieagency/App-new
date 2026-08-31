-- Heal domain + TikTok inbox columns that older DBs may be missing.

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS custom_domain text,
  ADD COLUMN IF NOT EXISTS custom_domain_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS default_community_slug text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS custom_domain text,
  ADD COLUMN IF NOT EXISTS custom_domain_verified boolean DEFAULT false;

ALTER TABLE public.tiktok_conversations
  ADD COLUMN IF NOT EXISTS user_id text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS last_message text NOT NULL DEFAULT '';

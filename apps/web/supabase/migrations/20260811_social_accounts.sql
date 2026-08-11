-- Meta OAuth connected accounts (Instagram Business + Facebook Pages)
CREATE TABLE IF NOT EXISTS public.social_accounts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform           text NOT NULL
                       CHECK (platform IN ('instagram', 'facebook', 'tiktok', 'linkedin', 'youtube')),
  external_id        text NOT NULL,
  handle             text,
  display_name       text,
  avatar_url         text,
  access_token       text NOT NULL,
  token_expires_at   timestamptz,
  page_id            text,
  page_name          text,
  meta               jsonb NOT NULL DEFAULT '{}'::jsonb,
  connected_at       timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform, external_id)
);

CREATE INDEX IF NOT EXISTS social_accounts_user_idx
  ON public.social_accounts (user_id);

CREATE INDEX IF NOT EXISTS social_accounts_platform_idx
  ON public.social_accounts (platform);

-- Durable Link-in-bio click tracking (also auto-created by lib/bio-clicks/persist.ts)

CREATE TABLE IF NOT EXISTS public.bio_link_destinations (
  slug text PRIMARY KEY,
  workspace_id text NOT NULL,
  user_id text,
  handle text,
  title text,
  destination_url text NOT NULL,
  block_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bio_link_destinations_workspace_idx
  ON public.bio_link_destinations (workspace_id);

CREATE INDEX IF NOT EXISTS bio_link_destinations_handle_idx
  ON public.bio_link_destinations (handle);

CREATE TABLE IF NOT EXISTS public.bio_link_clicks (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  user_id text,
  handle text,
  slug text NOT NULL,
  block_id text,
  title text,
  destination_url text,
  visitor_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bio_link_clicks_workspace_created_idx
  ON public.bio_link_clicks (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS bio_link_clicks_slug_created_idx
  ON public.bio_link_clicks (slug, created_at DESC);

CREATE INDEX IF NOT EXISTS bio_link_clicks_handle_created_idx
  ON public.bio_link_clicks (handle, created_at DESC);

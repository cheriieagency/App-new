-- Durable Email CRM (contacts, broadcasts, automations, send history)
-- Apply: psql "$DATABASE_URL" -f apps/web/supabase/migrations/20260818_email_crm.sql

CREATE TABLE IF NOT EXISTS public.email_subscribers (
  id              serial PRIMARY KEY,
  creator_id      text NOT NULL,
  user_id         text,
  name            text NOT NULL DEFAULT '',
  email           text NOT NULL,
  image           text,
  source          text NOT NULL DEFAULT 'community_member',
  tags            text[] NOT NULL DEFAULT '{}'::text[],
  community_id    integer,
  subscribed_at   timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (creator_id, email)
);

CREATE INDEX IF NOT EXISTS email_subscribers_creator_idx
  ON public.email_subscribers (creator_id, subscribed_at DESC);

CREATE TABLE IF NOT EXISTS public.email_broadcasts (
  id                serial PRIMARY KEY,
  creator_id        text NOT NULL,
  subject           text NOT NULL,
  body              text NOT NULL DEFAULT '',
  audience          text NOT NULL DEFAULT 'all',
  audience_label    text NOT NULL DEFAULT 'All subscribers',
  recipient_count   integer NOT NULL DEFAULT 0,
  open_rate         numeric(6, 1) NOT NULL DEFAULT 0,
  click_rate        numeric(6, 1) NOT NULL DEFAULT 0,
  status            text NOT NULL DEFAULT 'sent',
  image_url         text,
  sent_at           timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_broadcasts_creator_idx
  ON public.email_broadcasts (creator_id, sent_at DESC);

CREATE TABLE IF NOT EXISTS public.email_automations (
  id            text PRIMARY KEY,
  creator_id    text NOT NULL,
  community_id  integer,
  name          text NOT NULL,
  description   text NOT NULL DEFAULT '',
  trigger       text NOT NULL,
  subject       text NOT NULL,
  body          text NOT NULL,
  status        text NOT NULL DEFAULT 'active',
  sent_count    integer NOT NULL DEFAULT 0,
  last_sent_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_automations_creator_idx
  ON public.email_automations (creator_id, status);

CREATE TABLE IF NOT EXISTS public.email_message_tracking (
  resend_id     text PRIMARY KEY,
  broadcast_id  integer,
  creator_id    text NOT NULL,
  email         text NOT NULL,
  opened        boolean NOT NULL DEFAULT false,
  clicked       boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  opened_at     timestamptz,
  clicked_at    timestamptz
);

CREATE INDEX IF NOT EXISTS email_message_tracking_broadcast_idx
  ON public.email_message_tracking (broadcast_id);

CREATE TABLE IF NOT EXISTS public.email_automation_sends (
  id              serial PRIMARY KEY,
  automation_id   text,
  creator_id      text NOT NULL,
  community_id    integer,
  community_name  text,
  kind            text NOT NULL DEFAULT 'member_auto',
  subject         text NOT NULL,
  recipient_name  text NOT NULL,
  recipient_email text NOT NULL,
  product_title   text,
  resend_id       text,
  sent_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_automation_sends_creator_idx
  ON public.email_automation_sends (creator_id, sent_at DESC);

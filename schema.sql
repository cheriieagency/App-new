-- =============================================================================
-- clikd: Platform — PostgreSQL schema
-- =============================================================================
-- Self-contained schema for profiles, communities, posts, courses, lessons,
-- payments, events, and supporting tables used by apps/web API routes.
--
-- Compatible with:
--   • Neon / plain PostgreSQL (DATABASE_URL + better-auth)
--   • Supabase (enable RLS; policies use auth.uid()::text)
--
-- Apply:
--   psql "$DATABASE_URL" -f schema.sql
--   # or paste into Supabase SQL Editor
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 0) profiles — created FIRST so helpers/policies/FKs can reference it safely.
--    FK to better-auth "user" is attached after that table exists (below).
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id              text PRIMARY KEY,
  display_name    text,
  handle          text UNIQUE,
  bio             text,
  avatar_url      text,
  role            text NOT NULL DEFAULT 'member'
                    CHECK (role IN ('member', 'creator', 'admin')),
  locale          text NOT NULL DEFAULT 'sv',
  country         text DEFAULT 'SE',
  xp              integer NOT NULL DEFAULT 0 CHECK (xp >= 0),
  level           integer NOT NULL DEFAULT 1 CHECK (level >= 1),
  is_onboarded    boolean NOT NULL DEFAULT false,
  custom_domain   text,
  custom_domain_verified boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_custom_domain_uidx
  ON public.profiles (custom_domain)
  WHERE custom_domain IS NOT NULL;

-- Brand workspaces (custom domain routing for Pro + creator wallet / Connect)
CREATE TABLE IF NOT EXISTS public.workspaces (
  id                         text PRIMARY KEY,
  user_id                    text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name                       text,
  slug                       text,
  default_community_slug     text,
  custom_domain              text,
  custom_domain_verified     boolean NOT NULL DEFAULT false,
  wallet_balance_sek         numeric(14, 2) NOT NULL DEFAULT 0,
  total_revenue_sek          numeric(14, 2) NOT NULL DEFAULT 0,
  stripe_connect_account_id  text,
  stripe_connect_enabled     boolean NOT NULL DEFAULT false,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS wallet_balance_sek numeric(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_revenue_sek numeric(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_connect_enabled boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS workspaces_custom_domain_uidx
  ON public.workspaces (custom_domain)
  WHERE custom_domain IS NOT NULL;

CREATE INDEX IF NOT EXISTS workspaces_user_idx
  ON public.workspaces (user_id);

CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles (role);
CREATE INDEX IF NOT EXISTS profiles_handle_idx ON public.profiles (handle);

-- -----------------------------------------------------------------------------
-- Auth stub (no-op on Supabase where auth.uid() already exists)
-- -----------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS auth;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'auth' AND p.proname = 'uid'
  ) THEN
    EXECUTE $fn$
      CREATE FUNCTION auth.uid()
      RETURNS uuid
      LANGUAGE sql
      STABLE
      AS $body$ SELECT NULL::uuid $body$
    $fn$;
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- Helpers (safe: public.profiles already exists)
-- -----------------------------------------------------------------------------

-- Current authenticated user id (Supabase Auth JWT subject as text).
-- Next.js API routes using the service-role / direct DATABASE_URL bypass RLS.
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(auth.uid()::text, '');
$$;

-- True when the caller is a creator/admin (profiles.role).
CREATE OR REPLACE FUNCTION public.is_creator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = public.current_user_id()
      AND p.role IN ('creator', 'admin')
  );
$$;

-- -----------------------------------------------------------------------------
-- 1) better-auth core tables (apps/web/src/lib/auth.ts)
--    Column names match better-auth defaults (camelCase).
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "user" (
  id            text PRIMARY KEY,
  name          text NOT NULL,
  email         text NOT NULL UNIQUE,
  "emailVerified" boolean NOT NULL DEFAULT false,
  image         text,
  "createdAt"   timestamptz NOT NULL DEFAULT now(),
  "updatedAt"   timestamptz NOT NULL DEFAULT now()
);

-- Wire profiles → "user" now that "user" exists (idempotent).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_id_fkey'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_fkey
      FOREIGN KEY (id) REFERENCES "user"(id) ON DELETE CASCADE;
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS session (
  id          text PRIMARY KEY,
  "userId"    text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  token       text NOT NULL UNIQUE,
  "expiresAt" timestamptz NOT NULL,
  "ipAddress" text,
  "userAgent" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS session_user_id_idx ON session ("userId");

CREATE TABLE IF NOT EXISTS account (
  id                      text PRIMARY KEY,
  "accountId"             text NOT NULL,
  "providerId"            text NOT NULL,
  "userId"               text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "accessToken"           text,
  "refreshToken"          text,
  "idToken"               text,
  "accessTokenExpiresAt"  timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  scope                   text,
  password                text,
  "createdAt"             timestamptz NOT NULL DEFAULT now(),
  "updatedAt"             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS account_user_id_idx ON account ("userId");

CREATE TABLE IF NOT EXISTS verification (
  id            text PRIMARY KEY,
  identifier    text NOT NULL,
  value         text NOT NULL,
  "expiresAt"   timestamptz NOT NULL,
  "createdAt"   timestamptz NOT NULL DEFAULT now(),
  "updatedAt"   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS verification_identifier_idx ON verification (identifier);

-- Keep profiles in sync when a better-auth user is created.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (NEW.id, NEW.name, NEW.image)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_user_created ON "user";
CREATE TRIGGER on_user_created
  AFTER INSERT ON "user"
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 2) communities
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS communities (
  id              serial PRIMARY KEY,
  name            text NOT NULL,
  slug            text UNIQUE,
  description     text,
  category        text,
  creator_id      text REFERENCES "user"(id) ON DELETE SET NULL,
  creator_name    text,
  creator_image   text,
  cover_color     text DEFAULT '#0f1f1c',
  cover_image     text,
  member_count    integer NOT NULL DEFAULT 0 CHECK (member_count >= 0),
  is_featured     boolean NOT NULL DEFAULT false,
  is_published    boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS communities_featured_idx
  ON communities (is_featured DESC, member_count DESC);
CREATE INDEX IF NOT EXISTS communities_category_idx ON communities (category);

CREATE TABLE IF NOT EXISTS community_memberships (
  user_id       text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  community_id  integer NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  role          text NOT NULL DEFAULT 'member'
                  CHECK (role IN ('member', 'moderator', 'owner')),
  joined_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, community_id)
);

CREATE INDEX IF NOT EXISTS community_memberships_community_idx
  ON community_memberships (community_id);

CREATE TABLE IF NOT EXISTS moderator_assignments (
  community_id  integer NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id       text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  assigned_by   text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  assigned_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (community_id, user_id)
);

-- -----------------------------------------------------------------------------
-- 4) posts + social (feed, likes, comments)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS posts (
  id            serial PRIMARY KEY,
  user_id       text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  community_id  integer REFERENCES communities(id) ON DELETE SET NULL,
  user_name     text NOT NULL,
  user_image    text,
  content       text NOT NULL,
  tag           text,
  image_url     text,
  is_pinned     boolean NOT NULL DEFAULT false,
  pinned_at     timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts (created_at DESC);
CREATE INDEX IF NOT EXISTS posts_user_id_idx ON posts (user_id);
CREATE INDEX IF NOT EXISTS posts_community_id_idx ON posts (community_id);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS pinned_at timestamptz;
CREATE INDEX IF NOT EXISTS posts_community_pinned_idx ON posts (community_id, is_pinned DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS likes (
  post_id    integer NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS likes_user_id_idx ON likes (user_id);

CREATE TABLE IF NOT EXISTS comments (
  id          serial PRIMARY KEY,
  post_id     integer NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  user_name   text NOT NULL,
  content     text NOT NULL,
  parent_id   integer REFERENCES comments(id) ON DELETE CASCADE,
  media_url   text,
  media_type  text,
  is_pinned   boolean NOT NULL DEFAULT false,
  pinned_at   timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Safe upgrade for existing databases.
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS pinned_at timestamptz;

CREATE INDEX IF NOT EXISTS comments_post_id_idx ON comments (post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS comments_post_pinned_idx ON comments (post_id, is_pinned DESC, created_at ASC);

-- -----------------------------------------------------------------------------
-- 5) courses + lessons (classroom)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS courses (
  id            serial PRIMARY KEY,
  community_id  integer REFERENCES communities(id) ON DELETE SET NULL,
  creator_id    text REFERENCES "user"(id) ON DELETE SET NULL,
  title         text NOT NULL,
  description   text,
  category      text NOT NULL DEFAULT 'Allmänt',
  cover_image   text,
  video_url     text,
  pdf_url       text,
  is_published  boolean NOT NULL DEFAULT true,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Safe upgrades for existing databases.
ALTER TABLE courses ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Allmänt';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS pdf_url text;

CREATE INDEX IF NOT EXISTS courses_community_id_idx ON courses (community_id);

CREATE TABLE IF NOT EXISTS lessons (
  id            serial PRIMARY KEY,
  course_id     integer NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title         text NOT NULL,
  description   text,
  video_url     text,
  pdf_url       text,
  content       text,
  "order"       integer NOT NULL DEFAULT 0,
  duration_sec  integer,
  is_published  boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Safe upgrade for existing databases created before pdf_url existed.
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS pdf_url text;

CREATE INDEX IF NOT EXISTS lessons_course_order_idx ON lessons (course_id, "order" ASC);

CREATE TABLE IF NOT EXISTS lesson_progress (
  user_id       text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  lesson_id     integer NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed     boolean NOT NULL DEFAULT false,
  completed_at  timestamptz,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);

-- -----------------------------------------------------------------------------
-- 6) products + payments (mobile / Stripe-ready)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS products (
  id            serial PRIMARY KEY,
  creator_id    text REFERENCES "user"(id) ON DELETE SET NULL,
  community_id  integer REFERENCES communities(id) ON DELETE SET NULL,
  name          text NOT NULL,
  description   text,
  price         numeric(12, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  currency      text NOT NULL DEFAULT 'SEK',
  type          text NOT NULL DEFAULT 'ebook'
                  CHECK (type IN ('ebook', 'course', 'coaching', 'community', 'service', 'digital', 'other')),
  kind          text NOT NULL DEFAULT 'product'
                  CHECK (kind IN ('product', 'service')),
  image_url     text,
  collect_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  order_bump    jsonb,
  vat_rate      numeric(5, 2) NOT NULL DEFAULT 25.00,
  is_published  boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_price_idx ON products (price ASC);
CREATE INDEX IF NOT EXISTS products_community_id_idx ON products (community_id);

-- Migrate older product type checks + optional columns.
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_type_check;
ALTER TABLE products ADD CONSTRAINT products_type_check
  CHECK (type IN ('ebook', 'course', 'coaching', 'community', 'service', 'digital', 'other'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'product';
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS collect_fields jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS order_bump jsonb;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_kind_check;
ALTER TABLE products ADD CONSTRAINT products_kind_check
  CHECK (kind IN ('product', 'service'));

CREATE TABLE IF NOT EXISTS payments (
  id                serial PRIMARY KEY,
  user_id           text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  product_id        integer REFERENCES products(id) ON DELETE SET NULL,
  community_id      integer REFERENCES communities(id) ON DELETE SET NULL,
  amount            numeric(12, 2) NOT NULL CHECK (amount >= 0),
  currency          text NOT NULL DEFAULT 'SEK',
  vat_rate          numeric(5, 2) NOT NULL DEFAULT 25.00,
  vat_amount        numeric(12, 2) NOT NULL DEFAULT 0,
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  provider          text NOT NULL DEFAULT 'swish'
                      CHECK (provider IN ('swish', 'vipps', 'stripe', 'manual', 'other')),
  external_id       text,
  receipt_url       text,
  fortnox_voucher   text,
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
  paid_at           timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_user_id_idx ON payments (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payments_status_idx ON payments (status);
CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_external_uidx
  ON payments (provider, external_id)
  WHERE external_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 6a) Storefront orders + creator payouts (Link-in-Bio revenue)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.orders (
  id                   serial PRIMARY KEY,
  workspace_id         text NOT NULL,
  seller_user_id       text NOT NULL,
  buyer_email          text,
  buyer_name           text,
  product_id           text,
  product_title        text NOT NULL,
  amount_gross_sek     numeric(14, 2) NOT NULL CHECK (amount_gross_sek >= 0),
  platform_fee_sek     numeric(14, 2) NOT NULL DEFAULT 0,
  amount_net_sek       numeric(14, 2) NOT NULL DEFAULT 0,
  platform_fee_percent numeric(5, 2) NOT NULL DEFAULT 0,
  status               text NOT NULL DEFAULT 'completed'
                         CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
  provider             text NOT NULL DEFAULT 'demo',
  external_id          text,
  google_meet_url      text,
  metadata             jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS google_meet_url text;

CREATE UNIQUE INDEX IF NOT EXISTS orders_external_id_uidx
  ON public.orders (provider, external_id)
  WHERE external_id IS NOT NULL;

-- Media library (Google Drive imports + uploads)
CREATE TABLE IF NOT EXISTS public.media_library (
  id            serial PRIMARY KEY,
  workspace_id  text NOT NULL,
  user_id       text,
  file_name     text NOT NULL,
  file_url      text NOT NULL,
  file_type     text NOT NULL DEFAULT 'application/octet-stream',
  size_bytes    bigint NOT NULL DEFAULT 0,
  source        text NOT NULL DEFAULT 'upload',
  external_id   text,
  target        text NOT NULL DEFAULT 'media_library',
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS media_library_workspace_idx
  ON public.media_library (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS orders_workspace_idx
  ON public.orders (workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.payouts (
  id                 serial PRIMARY KEY,
  workspace_id       text NOT NULL,
  seller_user_id     text NOT NULL,
  amount_sek         numeric(14, 2) NOT NULL CHECK (amount_sek > 0),
  status             text NOT NULL DEFAULT 'requested'
                       CHECK (status IN ('requested', 'processing', 'completed', 'failed')),
  stripe_transfer_id text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  completed_at       timestamptz
);

CREATE INDEX IF NOT EXISTS payouts_workspace_idx
  ON public.payouts (workspace_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 6b) email CRM (subscribers + broadcasts)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS email_subscribers (
  id            serial PRIMARY KEY,
  creator_id    text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  user_id       text REFERENCES "user"(id) ON DELETE SET NULL,
  community_id  integer REFERENCES communities(id) ON DELETE SET NULL,
  name          text NOT NULL,
  email         text NOT NULL,
  image         text,
  source        text NOT NULL DEFAULT 'community_member',
  tags          text[] NOT NULL DEFAULT '{}',
  subscribed_at timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (creator_id, email)
);

CREATE INDEX IF NOT EXISTS email_subscribers_creator_idx
  ON email_subscribers (creator_id, subscribed_at DESC);
CREATE INDEX IF NOT EXISTS email_subscribers_source_idx
  ON email_subscribers (creator_id, source);

CREATE TABLE IF NOT EXISTS email_broadcasts (
  id               serial PRIMARY KEY,
  creator_id       text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  subject          text NOT NULL,
  body             text NOT NULL,
  audience         text NOT NULL DEFAULT 'all',
  audience_label   text,
  recipient_count  integer NOT NULL DEFAULT 0,
  open_rate        numeric(5, 2) NOT NULL DEFAULT 0,
  click_rate       numeric(5, 2) NOT NULL DEFAULT 0,
  status           text NOT NULL DEFAULT 'sent'
                     CHECK (status IN ('sent', 'draft', 'test')),
  sent_at          timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_broadcasts_creator_idx
  ON email_broadcasts (creator_id, sent_at DESC);

CREATE TABLE IF NOT EXISTS email_automations (
  id            text PRIMARY KEY,
  creator_id    text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  community_id  integer REFERENCES communities(id) ON DELETE SET NULL,
  name          text NOT NULL,
  description   text NOT NULL DEFAULT '',
  trigger       text NOT NULL,
  subject       text NOT NULL,
  body          text NOT NULL,
  status        text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'paused')),
  sent_count    integer NOT NULL DEFAULT 0,
  last_sent_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_automations_creator_idx
  ON email_automations (creator_id, status);

CREATE TABLE IF NOT EXISTS email_message_tracking (
  resend_id     text PRIMARY KEY,
  broadcast_id  integer REFERENCES email_broadcasts(id) ON DELETE CASCADE,
  creator_id    text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  email         text NOT NULL,
  opened        boolean NOT NULL DEFAULT false,
  clicked       boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  opened_at     timestamptz,
  clicked_at    timestamptz
);

CREATE INDEX IF NOT EXISTS email_message_tracking_broadcast_idx
  ON email_message_tracking (broadcast_id);

CREATE TABLE IF NOT EXISTS email_automation_sends (
  id              serial PRIMARY KEY,
  automation_id   text REFERENCES email_automations(id) ON DELETE SET NULL,
  creator_id      text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  community_id    integer,
  community_name  text,
  kind            text NOT NULL DEFAULT 'member_auto',
  subject         text NOT NULL,
  recipient_name  text NOT NULL,
  recipient_email text NOT NULL,
  resend_id       text,
  sent_at         timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 7) events + RSVPs + live chat
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS events (
  id              serial PRIMARY KEY,
  community_id    integer REFERENCES communities(id) ON DELETE SET NULL,
  creator_id      text REFERENCES "user"(id) ON DELETE SET NULL,
  title           text NOT NULL,
  description     text,
  start_time      timestamptz NOT NULL,
  end_time        timestamptz,
  stream_url      text,
  image_url       text,
  cover_color     text,
  speaker_name    text DEFAULT 'Sofia Bergström',
  speaker_bio     text,
  speaker_image   text,
  category        text DEFAULT 'Webinar',
  -- online | in_person
  location_type   text NOT NULL DEFAULT 'online',
  location_address text,
  -- invite_only | selected | community
  audience        text NOT NULL DEFAULT 'community',
  invited_member_ids text[] NOT NULL DEFAULT '{}',
  is_published    boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE events ADD COLUMN IF NOT EXISTS location_type text NOT NULL DEFAULT 'online';
ALTER TABLE events ADD COLUMN IF NOT EXISTS location_address text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'community';
ALTER TABLE events ADD COLUMN IF NOT EXISTS invited_member_ids text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS events_start_time_idx ON events (start_time ASC);
CREATE INDEX IF NOT EXISTS events_community_id_idx ON events (community_id);

CREATE TABLE IF NOT EXISTS rsvps (
  event_id    integer NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id     text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS rsvps_user_id_idx ON rsvps (user_id);

CREATE TABLE IF NOT EXISTS event_chat (
  id          serial PRIMARY KEY,
  event_id    integer NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id     text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  user_name   text NOT NULL,
  user_image  text,
  message     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_chat_event_created_idx
  ON event_chat (event_id, created_at ASC);

-- -----------------------------------------------------------------------------
-- 8) Supporting tables used by admin / growth features
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS bio_blocks (
  id            serial PRIMARY KEY,
  user_id       text NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
  blocks        jsonb NOT NULL DEFAULT '[]'::jsonb,
  handle        text,
  display_name  text,
  bio_text      text,
  avatar_url    text,
  social_links  jsonb NOT NULL DEFAULT '[]'::jsonb,
  theme         jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bio_blocks ADD COLUMN IF NOT EXISTS theme jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS referrals (
  id                      serial PRIMARY KEY,
  user_id                 text NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
  referral_code           text NOT NULL UNIQUE,
  total_invites           integer NOT NULL DEFAULT 0 CHECK (total_invites >= 0),
  earned_commission_sek   numeric(12, 2) NOT NULL DEFAULT 0,
  bonus_xp                integer NOT NULL DEFAULT 0,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referral_uses (
  id                  serial PRIMARY KEY,
  referral_code       text NOT NULL REFERENCES referrals(referral_code) ON DELETE CASCADE,
  used_by_email       text NOT NULL,
  product_name        text,
  purchase_amount     numeric(12, 2) NOT NULL DEFAULT 0,
  commission_earned   numeric(12, 2) NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referral_uses_code_idx ON referral_uses (referral_code);

-- -----------------------------------------------------------------------------
-- 9) updated_at touch triggers
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles',
    'communities',
    'posts',
    'courses',
    'lessons',
    'products',
    'payments',
    'events',
    'bio_blocks',
    'referrals'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I', t);
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at()',
      t
    );
  END LOOP;
END;
$$;

-- -----------------------------------------------------------------------------
-- 10) Row Level Security
-- -----------------------------------------------------------------------------

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderator_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE bio_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_uses ENABLE ROW LEVEL SECURITY;

-- better-auth tables: typically accessed only via server (service role).
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE session ENABLE ROW LEVEL SECURITY;
ALTER TABLE account ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (idempotent re-runs)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END;
$$;

-- ----- profiles -----
CREATE POLICY profiles_select_all
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY profiles_update_own
  ON profiles FOR UPDATE
  USING (id = public.current_user_id())
  WITH CHECK (id = public.current_user_id());

CREATE POLICY profiles_insert_own
  ON profiles FOR INSERT
  WITH CHECK (id = public.current_user_id());

-- ----- communities -----
CREATE POLICY communities_select_published
  ON communities FOR SELECT
  USING (is_published = true OR creator_id = public.current_user_id() OR public.is_creator());

CREATE POLICY communities_insert_creator
  ON communities FOR INSERT
  WITH CHECK (public.current_user_id() IS NOT NULL);

CREATE POLICY communities_update_owner_or_creator
  ON communities FOR UPDATE
  USING (creator_id = public.current_user_id() OR public.is_creator());

CREATE POLICY communities_delete_owner_or_admin
  ON communities FOR DELETE
  USING (creator_id = public.current_user_id() OR public.is_creator());

-- ----- community_memberships -----
CREATE POLICY memberships_select_all
  ON community_memberships FOR SELECT
  USING (true);

CREATE POLICY memberships_insert_own
  ON community_memberships FOR INSERT
  WITH CHECK (user_id = public.current_user_id());

CREATE POLICY memberships_delete_own
  ON community_memberships FOR DELETE
  USING (user_id = public.current_user_id() OR public.is_creator());

-- ----- moderator_assignments -----
CREATE POLICY moderators_select_all
  ON moderator_assignments FOR SELECT
  USING (true);

CREATE POLICY moderators_manage_creators
  ON moderator_assignments FOR ALL
  USING (public.is_creator())
  WITH CHECK (public.is_creator());

-- ----- posts -----
CREATE POLICY posts_select_all
  ON posts FOR SELECT
  USING (true);

CREATE POLICY posts_insert_own
  ON posts FOR INSERT
  WITH CHECK (user_id = public.current_user_id());

CREATE POLICY posts_update_own
  ON posts FOR UPDATE
  USING (user_id = public.current_user_id() OR public.is_creator());

CREATE POLICY posts_delete_own
  ON posts FOR DELETE
  USING (user_id = public.current_user_id() OR public.is_creator());

-- ----- likes -----
CREATE POLICY likes_select_all
  ON likes FOR SELECT
  USING (true);

CREATE POLICY likes_insert_own
  ON likes FOR INSERT
  WITH CHECK (user_id = public.current_user_id());

CREATE POLICY likes_delete_own
  ON likes FOR DELETE
  USING (user_id = public.current_user_id());

-- ----- comments -----
CREATE POLICY comments_select_all
  ON comments FOR SELECT
  USING (true);

CREATE POLICY comments_insert_own
  ON comments FOR INSERT
  WITH CHECK (user_id = public.current_user_id());

CREATE POLICY comments_delete_own
  ON comments FOR DELETE
  USING (user_id = public.current_user_id() OR public.is_creator());

-- ----- courses / lessons -----
CREATE POLICY courses_select_published
  ON courses FOR SELECT
  USING (is_published = true OR creator_id = public.current_user_id() OR public.is_creator());

CREATE POLICY courses_manage_creators
  ON courses FOR ALL
  USING (creator_id = public.current_user_id() OR public.is_creator())
  WITH CHECK (creator_id = public.current_user_id() OR public.is_creator());

CREATE POLICY lessons_select_published
  ON lessons FOR SELECT
  USING (
    is_published = true
    OR EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = lessons.course_id
        AND (c.creator_id = public.current_user_id() OR public.is_creator())
    )
  );

CREATE POLICY lessons_manage_creators
  ON lessons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = lessons.course_id
        AND (c.creator_id = public.current_user_id() OR public.is_creator())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = lessons.course_id
        AND (c.creator_id = public.current_user_id() OR public.is_creator())
    )
  );

CREATE POLICY lesson_progress_own
  ON lesson_progress FOR ALL
  USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

-- ----- products -----
CREATE POLICY products_select_published
  ON products FOR SELECT
  USING (is_published = true OR creator_id = public.current_user_id() OR public.is_creator());

CREATE POLICY products_manage_creators
  ON products FOR ALL
  USING (creator_id = public.current_user_id() OR public.is_creator())
  WITH CHECK (creator_id = public.current_user_id() OR public.is_creator());

-- ----- payments -----
CREATE POLICY payments_select_own
  ON payments FOR SELECT
  USING (user_id = public.current_user_id() OR public.is_creator());

CREATE POLICY payments_insert_own
  ON payments FOR INSERT
  WITH CHECK (user_id = public.current_user_id());

CREATE POLICY payments_update_creators
  ON payments FOR UPDATE
  USING (public.is_creator());

-- ----- events -----
CREATE POLICY events_select_published
  ON events FOR SELECT
  USING (is_published = true OR creator_id = public.current_user_id() OR public.is_creator());

CREATE POLICY events_manage_creators
  ON events FOR ALL
  USING (creator_id = public.current_user_id() OR public.is_creator())
  WITH CHECK (creator_id = public.current_user_id() OR public.is_creator());

-- ----- rsvps -----
CREATE POLICY rsvps_select_all
  ON rsvps FOR SELECT
  USING (true);

CREATE POLICY rsvps_insert_own
  ON rsvps FOR INSERT
  WITH CHECK (user_id = public.current_user_id());

CREATE POLICY rsvps_delete_own
  ON rsvps FOR DELETE
  USING (user_id = public.current_user_id());

-- ----- event_chat -----
CREATE POLICY event_chat_select_all
  ON event_chat FOR SELECT
  USING (true);

CREATE POLICY event_chat_insert_own
  ON event_chat FOR INSERT
  WITH CHECK (user_id = public.current_user_id());

CREATE POLICY event_chat_delete_own
  ON event_chat FOR DELETE
  USING (user_id = public.current_user_id() OR public.is_creator());

-- ----- bio_blocks -----
CREATE POLICY bio_blocks_select_all
  ON bio_blocks FOR SELECT
  USING (true);

CREATE POLICY bio_blocks_upsert_own
  ON bio_blocks FOR ALL
  USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

-- ----- referrals -----
CREATE POLICY referrals_select_own
  ON referrals FOR SELECT
  USING (user_id = public.current_user_id() OR public.is_creator());

CREATE POLICY referrals_manage_own
  ON referrals FOR ALL
  USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

CREATE POLICY referral_uses_select_owner
  ON referral_uses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM referrals r
      WHERE r.referral_code = referral_uses.referral_code
        AND (r.user_id = public.current_user_id() OR public.is_creator())
    )
  );

CREATE POLICY referral_uses_insert_authenticated
  ON referral_uses FOR INSERT
  WITH CHECK (public.current_user_id() IS NOT NULL);

-- ----- better-auth: users can read own row; mutations via service role -----
CREATE POLICY user_select_own
  ON "user" FOR SELECT
  USING (id = public.current_user_id() OR public.is_creator());

CREATE POLICY session_select_own
  ON session FOR SELECT
  USING ("userId" = public.current_user_id());

CREATE POLICY account_select_own
  ON account FOR SELECT
  USING ("userId" = public.current_user_id());

CREATE POLICY verification_deny_client
  ON verification FOR ALL
  USING (false)
  WITH CHECK (false);

-- -----------------------------------------------------------------------------
-- 11) No starter community / course seed — creators add their own via Admin.
-- -----------------------------------------------------------------------------

COMMIT;

-- =============================================================================
-- Onboarding questionnaire fields (additive / idempotent)
-- =============================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS role_category text,
  ADD COLUMN IF NOT EXISTS primary_use_cases text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS referral_source text,
  ADD COLUMN IF NOT EXISTS brand_name text,
  ADD COLUMN IF NOT EXISTS brand_website text,
  ADD COLUMN IF NOT EXISTS team_size text,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.user_onboarding_responses (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name            text,
  role_category        text,
  primary_use_cases    text[] NOT NULL DEFAULT '{}',
  referral_source      text,
  brand_name           text,
  brand_website        text,
  team_size            text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_onboarding_responses_user_idx
  ON public.user_onboarding_responses (user_id);

-- Meta OAuth connected accounts (Instagram Business + Facebook Pages)
CREATE TABLE IF NOT EXISTS public.social_accounts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform           text NOT NULL
                       CHECK (platform IN ('instagram', 'facebook', 'tiktok', 'linkedin', 'youtube', 'pinterest', 'google')),
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

ALTER TABLE public.user_onboarding_responses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_onboarding_responses'
      AND policyname = 'onboarding_responses_select_own'
  ) THEN
    CREATE POLICY onboarding_responses_select_own
      ON public.user_onboarding_responses FOR SELECT
      USING (user_id = public.current_user_id() OR public.is_creator());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_onboarding_responses'
      AND policyname = 'onboarding_responses_insert_own'
  ) THEN
    CREATE POLICY onboarding_responses_insert_own
      ON public.user_onboarding_responses FOR INSERT
      WITH CHECK (user_id = public.current_user_id());
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- Monthly analytics reports (see also supabase_analytics_reports_schema.sql)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.report_automation_configs (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id            text NOT NULL,
  user_id                 text NOT NULL,
  enabled                 boolean NOT NULL DEFAULT false,
  recipient_emails        text[] NOT NULL DEFAULT '{}',
  platforms               text[] NOT NULL DEFAULT ARRAY['instagram', 'facebook', 'tiktok']::text[],
  custom_email_note       text,
  subject_template        text NOT NULL DEFAULT 'Your {{month}} performance report — {{workspace}}',
  hide_ai_on_public_link  boolean NOT NULL DEFAULT false,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, workspace_id)
);

CREATE TABLE IF NOT EXISTS public.monthly_reports (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id            text NOT NULL,
  user_id                 text NOT NULL,
  workspace_name          text,
  title                   text NOT NULL DEFAULT 'Monthly Analytics Report',
  period_start            date NOT NULL,
  period_end              date NOT NULL,
  start_date              date,
  end_date                date,
  date_range_label        text NOT NULL DEFAULT '',
  platforms               text[] NOT NULL DEFAULT '{}',
  metrics                 jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_insights             jsonb,
  include_ai_analysis     boolean NOT NULL DEFAULT true,
  hide_ai_on_public_link  boolean NOT NULL DEFAULT false,
  is_automated            boolean NOT NULL DEFAULT false,
  public_share_enabled    boolean NOT NULL DEFAULT true,
  public_share_token      text NOT NULL UNIQUE,
  public_link_expires_at  timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS monthly_reports_workspace_idx
  ON public.monthly_reports (workspace_id, created_at DESC);

-- =============================================================================
-- Notes
-- =============================================================================
-- • apps/web API routes connect with DATABASE_URL (service role) and bypass RLS.
-- • RLS protects direct client access (Supabase anon key / PostgREST).
-- • On plain Neon/Postgres, a stub auth.uid() is created so this file applies;
--   JWT-backed auth.uid() on Supabase is left untouched if already present.
-- =============================================================================

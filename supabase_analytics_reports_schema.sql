-- =============================================================================
-- clikd: Monthly Analytics Reports — Supabase / Postgres schema
-- =============================================================================
-- Run in Supabase SQL Editor (or: psql "$DATABASE_URL" -f supabase_analytics_reports_schema.sql)
-- Creates automation configs + frozen monthly report snapshots with public share tokens.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Automation settings (1st-of-month email reports)
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

CREATE INDEX IF NOT EXISTS report_automation_enabled_idx
  ON public.report_automation_configs (enabled)
  WHERE enabled = true;

-- -----------------------------------------------------------------------------
-- Frozen monthly / custom date-range reports
-- -----------------------------------------------------------------------------
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
  public_share_token      text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  public_link_expires_at  timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.monthly_reports ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE public.monthly_reports ADD COLUMN IF NOT EXISTS end_date date;
ALTER TABLE public.monthly_reports ADD COLUMN IF NOT EXISTS date_range_label text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS monthly_reports_workspace_idx
  ON public.monthly_reports (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS monthly_reports_share_token_idx
  ON public.monthly_reports (public_share_token)
  WHERE public_share_enabled = true;

ALTER TABLE public.report_automation_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;

COMMIT;

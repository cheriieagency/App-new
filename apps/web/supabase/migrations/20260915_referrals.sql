-- Member referral codes + attributed uses (Ref & Earn)
-- Apply: psql "$DATABASE_URL" -f apps/web/supabase/migrations/20260915_referrals.sql

CREATE TABLE IF NOT EXISTS public.referrals (
  id                    serial PRIMARY KEY,
  user_id               text NOT NULL UNIQUE REFERENCES public."user"(id) ON DELETE CASCADE,
  referral_code         text NOT NULL UNIQUE,
  total_invites         integer NOT NULL DEFAULT 0 CHECK (total_invites >= 0),
  earned_commission_sek numeric(12, 2) NOT NULL DEFAULT 0,
  bonus_xp              integer NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referral_uses (
  id                serial PRIMARY KEY,
  referral_code     text NOT NULL REFERENCES public.referrals(referral_code) ON DELETE CASCADE,
  used_by_email     text NOT NULL,
  product_name      text,
  purchase_amount   numeric(12, 2) NOT NULL DEFAULT 0,
  commission_earned numeric(12, 2) NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referral_uses_code_idx
  ON public.referral_uses (referral_code);

-- One attribution per referred email per code (idempotent joins/purchases).
-- Emails are stored lowercased by the API.
CREATE UNIQUE INDEX IF NOT EXISTS referral_uses_code_email_uidx
  ON public.referral_uses (referral_code, used_by_email);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_uses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS referrals_select_own ON public.referrals;
CREATE POLICY referrals_select_own
  ON public.referrals FOR SELECT
  USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS referrals_manage_own ON public.referrals;
CREATE POLICY referrals_manage_own
  ON public.referrals FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS referral_uses_select_owner ON public.referral_uses;
CREATE POLICY referral_uses_select_owner
  ON public.referral_uses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.referrals r
      WHERE r.referral_code = referral_uses.referral_code
        AND r.user_id = auth.uid()::text
    )
  );

-- Inserts go through the server API (DATABASE_URL / service role), not anon clients.
DROP POLICY IF EXISTS referral_uses_insert_authenticated ON public.referral_uses;
CREATE POLICY referral_uses_insert_authenticated
  ON public.referral_uses FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

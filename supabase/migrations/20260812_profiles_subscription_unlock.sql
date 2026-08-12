-- Persist subscription entitlements on profiles (Vercel-safe; not in-memory).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_status text,
  ADD COLUMN IF NOT EXISTS subscription_plan text,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS full_name text;

-- Manual unlock for Ebba / QA accounts (run in Supabase SQL Editor as needed).
UPDATE public.profiles p
SET
  email = COALESCE(p.email, u.email),
  subscription_status = 'active',
  subscription_plan = 'pro',
  onboarding_completed = true,
  updated_at = now()
FROM public."user" u
WHERE p.id = u.id
  AND (
    lower(u.email) IN (
      'ebbabrobeck@gmail.com',
      'ebbabrobeck@test.se',
      'hello@clikd.app'
    )
    OR coalesce(p.full_name, '') ILIKE '%Ebba%'
    OR coalesce(p.display_name, '') ILIKE '%Ebba%'
  );

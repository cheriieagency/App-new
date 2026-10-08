-- Grant Pro/Agency to UGC by Felicia (manual unlock).
UPDATE public.profiles p
SET
  email = COALESCE(p.email, u.email),
  subscription_status = 'active',
  subscription_plan = 'pro',
  onboarding_completed = true,
  updated_at = now()
FROM public."user" u
WHERE p.id = u.id
  AND lower(u.email) = 'contact@ugcbyfelicia.se';

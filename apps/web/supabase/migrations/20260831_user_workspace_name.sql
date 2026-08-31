-- better-auth additional field: workspaceName chosen at signup
ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "workspaceName" text;

-- Comment-to-DM: claim each Meta comment_id before send (webhook + cron race-safe).
-- Unique for any non-failed status so 'processing' locks the comment until sent/skipped/failed.

-- Drop older partial unique if present, then recreate with processing included.
DROP INDEX IF EXISTS public.dm_logs_comment_id_processed_uidx;

-- Keep the newest non-failed row when duplicates already exist.
DELETE FROM public.dm_logs a
USING public.dm_logs b
WHERE a.comment_id IS NOT NULL
  AND a.comment_id = b.comment_id
  AND a.status <> 'failed'
  AND b.status <> 'failed'
  AND a.id < b.id;

CREATE UNIQUE INDEX IF NOT EXISTS dm_logs_comment_id_processed_uidx
  ON public.dm_logs (comment_id)
  WHERE comment_id IS NOT NULL
    AND status <> 'failed';

CREATE INDEX IF NOT EXISTS dm_logs_comment_id_idx
  ON public.dm_logs (comment_id)
  WHERE comment_id IS NOT NULL;

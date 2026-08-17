-- Optional deadline date on Admin Home kanban tasks.

ALTER TABLE public.admin_home_kanban
  ADD COLUMN IF NOT EXISTS due_date date;

CREATE INDEX IF NOT EXISTS admin_home_kanban_due_idx
  ON public.admin_home_kanban (workspace_id, due_date)
  WHERE due_date IS NOT NULL;

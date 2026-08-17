-- Admin Home Command Center: sticky focus notes + kanban tasks (per workspace).

CREATE TABLE IF NOT EXISTS public.admin_home_stickies (
  id           text PRIMARY KEY,
  workspace_id text NOT NULL,
  user_id      text NOT NULL,
  text         text NOT NULL,
  done         boolean NOT NULL DEFAULT false,
  sort_order   int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_home_stickies_ws_idx
  ON public.admin_home_stickies (workspace_id, sort_order, created_at);

CREATE TABLE IF NOT EXISTS public.admin_home_kanban (
  id           text PRIMARY KEY,
  workspace_id text NOT NULL,
  user_id      text NOT NULL,
  title        text NOT NULL,
  category     text NOT NULL DEFAULT 'admin.catGeneral',
  assignee     text NOT NULL DEFAULT 'U',
  column_id    text NOT NULL DEFAULT 'todo',
  sort_order   int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_home_kanban_column_chk
    CHECK (column_id IN ('todo', 'doing', 'done'))
);

CREATE INDEX IF NOT EXISTS admin_home_kanban_ws_idx
  ON public.admin_home_kanban (workspace_id, column_id, sort_order, created_at);

ALTER TABLE public.admin_home_stickies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_home_kanban ENABLE ROW LEVEL SECURITY;

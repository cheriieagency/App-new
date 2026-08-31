/**
 * Admin Home Command Center — sticky focus notes + kanban tasks (per workspace).
 */

import sql from '@/app/api/utils/sql';

let schemaReady: Promise<void> | null = null;

export type HomeSticky = {
  id: string;
  text: string;
  done: boolean;
  sort_order: number;
};

export type HomeKanbanColumn = 'todo' | 'doing' | 'done';

export type HomeKanbanTask = {
  id: string;
  title: string;
  category: string;
  assignee: string;
  column: HomeKanbanColumn;
  /** ISO date `YYYY-MM-DD`, or null when unset. */
  due_date: string | null;
  sort_order: number;
};

/** Normalize Postgres date / Date / string into `YYYY-MM-DD` or null. */
function normalizeDueDate(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const raw = String(value).trim();
  if (!raw) return null;
  // Accept ISO timestamps and plain dates.
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

export async function ensureAdminHomeSchema(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  if (schemaReady) return schemaReady;

  schemaReady = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS public.admin_home_stickies (
        id           text PRIMARY KEY,
        workspace_id text NOT NULL,
        user_id      text NOT NULL,
        text         text NOT NULL,
        done         boolean NOT NULL DEFAULT false,
        sort_order   int NOT NULL DEFAULT 0,
        created_at   timestamptz NOT NULL DEFAULT now(),
        updated_at   timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS admin_home_stickies_ws_idx
        ON public.admin_home_stickies (workspace_id, sort_order, created_at)
    `;
    await sql`
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
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS admin_home_kanban_ws_idx
        ON public.admin_home_kanban (workspace_id, column_id, sort_order, created_at)
    `;
    // Heal additive deadline column on existing DBs without waiting for migrations.
    await sql`
      ALTER TABLE public.admin_home_kanban
        ADD COLUMN IF NOT EXISTS due_date date
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS public.admin_home_prefs (
        workspace_id text NOT NULL,
        user_id      text NOT NULL,
        shortcuts    jsonb NOT NULL DEFAULT '["calendar","analytics","biobuilder"]'::jsonb,
        sticky_color text NOT NULL DEFAULT 'lilac',
        updated_at   timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (workspace_id, user_id)
      )
    `;
    await sql`
      ALTER TABLE public.admin_home_prefs
        ADD COLUMN IF NOT EXISTS sticky_color text NOT NULL DEFAULT 'lilac'
    `;
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });

  return schemaReady;
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function listAdminHomeBoard(input: {
  workspaceId: string;
  userId: string;
}): Promise<{
  stickies: HomeSticky[];
  kanban: HomeKanbanTask[];
  shortcuts: string[];
  stickyColor: string;
}> {
  await ensureAdminHomeSchema();
  const [stickyRows, kanbanRows, prefRows] = await Promise.all([
    sql`
      SELECT id, text, done, sort_order
      FROM public.admin_home_stickies
      WHERE workspace_id = ${input.workspaceId}
        AND user_id = ${input.userId}
      ORDER BY sort_order ASC, created_at ASC
    `,
    sql`
      SELECT id, title, category, assignee, column_id, due_date, sort_order
      FROM public.admin_home_kanban
      WHERE workspace_id = ${input.workspaceId}
        AND user_id = ${input.userId}
      ORDER BY sort_order ASC, created_at DESC
    `,
    sql`
      SELECT shortcuts, sticky_color
      FROM public.admin_home_prefs
      WHERE workspace_id = ${input.workspaceId}
        AND user_id = ${input.userId}
      LIMIT 1
    `,
  ]);

  const stickies: HomeSticky[] = (stickyRows || []).map((row) => ({
    id: String(row.id),
    text: String(row.text || ''),
    done: Boolean(row.done),
    sort_order: Number(row.sort_order) || 0,
  }));

  const kanban: HomeKanbanTask[] = (kanbanRows || []).map((row) => {
    const col = String(row.column_id || 'todo');
    const column: HomeKanbanColumn =
      col === 'doing' || col === 'done' ? col : 'todo';
    return {
      id: String(row.id),
      title: String(row.title || ''),
      category: String(row.category || 'admin.catGeneral'),
      assignee: String(row.assignee || 'U').slice(0, 2).toUpperCase(),
      column,
      due_date: normalizeDueDate(row.due_date),
      sort_order: Number(row.sort_order) || 0,
    };
  });

  const { normalizeHomeShortcuts } = await import('@/lib/admin-home/shortcuts');
  const { normalizeStickyColor } = await import('@/lib/admin-home/sticky-colors');
  const pref = prefRows?.[0] as
    | { shortcuts?: unknown; sticky_color?: unknown }
    | undefined;
  const shortcuts = normalizeHomeShortcuts(pref?.shortcuts);
  const stickyColor = normalizeStickyColor(pref?.sticky_color);

  return { stickies, kanban, shortcuts, stickyColor };
}

export async function saveHomeShortcuts(input: {
  workspaceId: string;
  userId: string;
  shortcuts: string[];
}): Promise<string[]> {
  await ensureAdminHomeSchema();
  const { normalizeHomeShortcuts } = await import('@/lib/admin-home/shortcuts');
  const shortcuts = normalizeHomeShortcuts(input.shortcuts);
  await sql`
    INSERT INTO public.admin_home_prefs (workspace_id, user_id, shortcuts, updated_at)
    VALUES (
      ${input.workspaceId},
      ${input.userId},
      ${JSON.stringify(shortcuts)},
      now()
    )
    ON CONFLICT (workspace_id, user_id) DO UPDATE SET
      shortcuts = EXCLUDED.shortcuts,
      updated_at = now()
  `;
  return shortcuts;
}

export async function saveHomeStickyColor(input: {
  workspaceId: string;
  userId: string;
  stickyColor: string;
}): Promise<string> {
  await ensureAdminHomeSchema();
  const { normalizeStickyColor } = await import('@/lib/admin-home/sticky-colors');
  const { DEFAULT_HOME_SHORTCUTS } = await import('@/lib/admin-home/shortcuts');
  const stickyColor = normalizeStickyColor(input.stickyColor);
  await sql`
    INSERT INTO public.admin_home_prefs (workspace_id, user_id, shortcuts, sticky_color, updated_at)
    VALUES (
      ${input.workspaceId},
      ${input.userId},
      ${JSON.stringify(DEFAULT_HOME_SHORTCUTS)}::jsonb,
      ${stickyColor},
      now()
    )
    ON CONFLICT (workspace_id, user_id) DO UPDATE SET
      sticky_color = EXCLUDED.sticky_color,
      updated_at = now()
  `;
  return stickyColor;
}

export async function createHomeSticky(input: {
  workspaceId: string;
  userId: string;
  text: string;
}): Promise<HomeSticky> {
  await ensureAdminHomeSchema();
  const text = input.text.trim();
  if (!text) throw new Error('text_required');
  const id = newId('sticky');
  const rows = await sql`
    INSERT INTO public.admin_home_stickies
      (id, workspace_id, user_id, text, done, sort_order, created_at, updated_at)
    VALUES (
      ${id},
      ${input.workspaceId},
      ${input.userId},
      ${text},
      false,
      (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM public.admin_home_stickies
        WHERE workspace_id = ${input.workspaceId} AND user_id = ${input.userId}),
      now(),
      now()
    )
    RETURNING id, text, done, sort_order
  `;
  const row = rows?.[0] as Record<string, unknown> | undefined;
  return {
    id: String(row?.id || id),
    text: String(row?.text || text),
    done: Boolean(row?.done),
    sort_order: Number(row?.sort_order) || 0,
  };
}

export async function createHomeKanbanTask(input: {
  workspaceId: string;
  userId: string;
  title: string;
  assignee?: string;
  category?: string;
  column?: HomeKanbanColumn;
  dueDate?: string | null;
}): Promise<HomeKanbanTask> {
  await ensureAdminHomeSchema();
  const title = input.title.trim();
  if (!title) throw new Error('title_required');
  const id = newId('task');
  const column: HomeKanbanColumn = input.column || 'todo';
  const category = (input.category || 'admin.catGeneral').trim() || 'admin.catGeneral';
  const assignee = (input.assignee || 'U').trim().slice(0, 2).toUpperCase() || 'U';
  const dueDate = normalizeDueDate(input.dueDate);
  const rows = await sql`
    INSERT INTO public.admin_home_kanban
      (id, workspace_id, user_id, title, category, assignee, column_id, due_date, sort_order, created_at, updated_at)
    VALUES (
      ${id},
      ${input.workspaceId},
      ${input.userId},
      ${title},
      ${category},
      ${assignee},
      ${column},
      ${dueDate},
      0,
      now(),
      now()
    )
    RETURNING id, title, category, assignee, column_id, due_date, sort_order
  `;
  const row = rows?.[0] as Record<string, unknown> | undefined;
  return {
    id: String(row?.id || id),
    title: String(row?.title || title),
    category: String(row?.category || category),
    assignee: String(row?.assignee || assignee),
    column,
    due_date: normalizeDueDate(row?.due_date) ?? dueDate,
    sort_order: Number(row?.sort_order) || 0,
  };
}

export async function updateHomeSticky(input: {
  workspaceId: string;
  userId: string;
  id: string;
  done?: boolean;
  text?: string;
}): Promise<HomeSticky | null> {
  await ensureAdminHomeSchema();
  const current = await sql`
    SELECT id, text, done, sort_order
    FROM public.admin_home_stickies
    WHERE id = ${input.id}
      AND workspace_id = ${input.workspaceId}
      AND user_id = ${input.userId}
    LIMIT 1
  `;
  const row = current?.[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  const done = typeof input.done === 'boolean' ? input.done : Boolean(row.done);
  const text =
    typeof input.text === 'string' && input.text.trim()
      ? input.text.trim()
      : String(row.text || '');
  const updated = await sql`
    UPDATE public.admin_home_stickies
    SET done = ${done}, text = ${text}, updated_at = now()
    WHERE id = ${input.id}
      AND workspace_id = ${input.workspaceId}
      AND user_id = ${input.userId}
    RETURNING id, text, done, sort_order
  `;
  const u = updated?.[0] as Record<string, unknown> | undefined;
  if (!u) return null;
  return {
    id: String(u.id),
    text: String(u.text || ''),
    done: Boolean(u.done),
    sort_order: Number(u.sort_order) || 0,
  };
}

export async function updateHomeKanbanTask(input: {
  workspaceId: string;
  userId: string;
  id: string;
  title?: string;
  column?: HomeKanbanColumn;
  /** Pass `null` to clear; omit to leave unchanged. */
  dueDate?: string | null;
}): Promise<HomeKanbanTask | null> {
  await ensureAdminHomeSchema();
  const current = await sql`
    SELECT id, title, category, assignee, column_id, due_date, sort_order
    FROM public.admin_home_kanban
    WHERE id = ${input.id}
      AND workspace_id = ${input.workspaceId}
      AND user_id = ${input.userId}
    LIMIT 1
  `;
  const row = current?.[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  const title =
    typeof input.title === 'string' && input.title.trim()
      ? input.title.trim()
      : String(row.title || '');
  const column: HomeKanbanColumn =
    input.column === 'todo' || input.column === 'doing' || input.column === 'done'
      ? input.column
      : String(row.column_id) === 'doing' || String(row.column_id) === 'done'
        ? (String(row.column_id) as HomeKanbanColumn)
        : 'todo';
  const dueDate =
    input.dueDate === undefined
      ? normalizeDueDate(row.due_date)
      : normalizeDueDate(input.dueDate);
  const updated = await sql`
    UPDATE public.admin_home_kanban
    SET title = ${title},
        column_id = ${column},
        due_date = ${dueDate},
        updated_at = now()
    WHERE id = ${input.id}
      AND workspace_id = ${input.workspaceId}
      AND user_id = ${input.userId}
    RETURNING id, title, category, assignee, column_id, due_date, sort_order
  `;
  const u = updated?.[0] as Record<string, unknown> | undefined;
  if (!u) return null;
  return {
    id: String(u.id),
    title: String(u.title || ''),
    category: String(u.category || 'admin.catGeneral'),
    assignee: String(u.assignee || 'U'),
    column,
    due_date: normalizeDueDate(u.due_date),
    sort_order: Number(u.sort_order) || 0,
  };
}

export async function deleteHomeSticky(input: {
  workspaceId: string;
  userId: string;
  id: string;
}): Promise<boolean> {
  await ensureAdminHomeSchema();
  const rows = await sql`
    DELETE FROM public.admin_home_stickies
    WHERE id = ${input.id}
      AND workspace_id = ${input.workspaceId}
      AND user_id = ${input.userId}
    RETURNING id
  `;
  return Array.isArray(rows) && rows.length > 0;
}

export async function deleteHomeKanbanTask(input: {
  workspaceId: string;
  userId: string;
  id: string;
}): Promise<boolean> {
  await ensureAdminHomeSchema();
  const rows = await sql`
    DELETE FROM public.admin_home_kanban
    WHERE id = ${input.id}
      AND workspace_id = ${input.workspaceId}
      AND user_id = ${input.userId}
    RETURNING id
  `;
  return Array.isArray(rows) && rows.length > 0;
}

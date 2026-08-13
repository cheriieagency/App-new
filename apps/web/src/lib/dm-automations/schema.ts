/**
 * Comment-to-DM automation tables (ManyChat-style keyword triggers).
 */

import sql from '@/app/api/utils/sql';

let tableReady: Promise<void> | null = null;

async function addColumnSafe(ddl: ReturnType<typeof sql>): Promise<void> {
  try {
    await ddl;
  } catch (error) {
    console.warn('[dm-automations/schema] add column skipped', error);
  }
}

/** Idempotent — safe to call on every request. */
export async function ensureDmAutomationsSchema(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;

  if (!tableReady) {
    tableReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS public.dm_automations (
          id                          serial PRIMARY KEY,
          workspace_id                text NOT NULL,
          user_id                     text,
          title                       text NOT NULL DEFAULT 'Comment-to-DM rule',
          trigger_keywords            text[] NOT NULL DEFAULT '{}',
          dm_message_text             text NOT NULL DEFAULT '',
          cta_button_url              text,
          reply_to_comment_publicly   boolean NOT NULL DEFAULT false,
          public_comment_text         text,
          is_active                   boolean NOT NULL DEFAULT true,
          total_dms_sent              integer NOT NULL DEFAULT 0,
          storefront_clicks           integer NOT NULL DEFAULT 0
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS public.dm_logs (
          id                  serial PRIMARY KEY,
          workspace_id        text NOT NULL,
          automation_id       integer,
          comment_id          text,
          media_id            text,
          commenter_id        text NOT NULL,
          commenter_username  text,
          comment_text        text,
          dm_message_id       text,
          matched_keyword     text,
          status              text NOT NULL DEFAULT 'sent',
          error_message       text
        )
      `;
    })().catch((error) => {
      tableReady = null;
      console.warn('[dm-automations/schema] table ensure', error);
      throw error;
    });
  }

  await tableReady;

  // Reconcile columns on older table shapes (CREATE IF NOT EXISTS won't add them).
  await addColumnSafe(sql`
    ALTER TABLE public.dm_automations
      ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now()
  `);
  await addColumnSafe(sql`
    ALTER TABLE public.dm_automations
      ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now()
  `);
  await addColumnSafe(sql`
    ALTER TABLE public.dm_automations
      ADD COLUMN IF NOT EXISTS cta_button_label text
  `);
  await addColumnSafe(sql`
    ALTER TABLE public.dm_automations
      ADD COLUMN IF NOT EXISTS cta_button_title text
  `);
  await addColumnSafe(sql`
    ALTER TABLE public.dm_automations
      ADD COLUMN IF NOT EXISTS total_dms_sent integer NOT NULL DEFAULT 0
  `);
  await addColumnSafe(sql`
    ALTER TABLE public.dm_automations
      ADD COLUMN IF NOT EXISTS storefront_clicks integer NOT NULL DEFAULT 0
  `);

  await addColumnSafe(sql`
    ALTER TABLE public.dm_logs
      ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now()
  `);
  await addColumnSafe(sql`
    ALTER TABLE public.dm_logs
      ADD COLUMN IF NOT EXISTS sent_at timestamptz DEFAULT now()
  `);
  await addColumnSafe(sql`
    ALTER TABLE public.dm_logs
      ADD COLUMN IF NOT EXISTS matched_keyword text
  `);
  await addColumnSafe(sql`
    ALTER TABLE public.dm_logs
      ADD COLUMN IF NOT EXISTS dm_message_id text
  `);

  // Soft sync CTA aliases.
  try {
    await sql`
      UPDATE public.dm_automations
      SET cta_button_title = COALESCE(NULLIF(cta_button_title, ''), cta_button_label)
      WHERE (cta_button_title IS NULL OR cta_button_title = '')
        AND cta_button_label IS NOT NULL
        AND cta_button_label <> ''
    `;
  } catch {
    /* ignore */
  }
  try {
    await sql`
      UPDATE public.dm_automations
      SET cta_button_label = COALESCE(NULLIF(cta_button_label, ''), cta_button_title)
      WHERE (cta_button_label IS NULL OR cta_button_label = '')
        AND cta_button_title IS NOT NULL
        AND cta_button_title <> ''
    `;
  } catch {
    /* ignore */
  }

  // Indexes — ignore if timestamp columns still missing.
  try {
    await sql`
      CREATE INDEX IF NOT EXISTS dm_automations_workspace_idx
        ON public.dm_automations (workspace_id, is_active)
    `;
  } catch {
    /* ignore */
  }
  try {
    await sql`
      CREATE INDEX IF NOT EXISTS dm_logs_workspace_idx
        ON public.dm_logs (workspace_id, id DESC)
    `;
  } catch {
    /* ignore */
  }
  try {
    await sql`
      CREATE INDEX IF NOT EXISTS dm_logs_rate_idx
        ON public.dm_logs (workspace_id, commenter_id, id DESC)
    `;
  } catch {
    /* ignore */
  }
}

/** Which CTA text columns exist on public.dm_automations. */
export async function getDmAutomationCtaColumns(): Promise<{
  hasLabel: boolean;
  hasTitle: boolean;
}> {
  if (!process.env.DATABASE_URL?.trim()) {
    return { hasLabel: false, hasTitle: false };
  }
  try {
    const rows = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'dm_automations'
        AND column_name IN ('cta_button_label', 'cta_button_title')
    `;
    const names = new Set(
      (Array.isArray(rows) ? rows : []).map((r) => String(r.column_name))
    );
    return {
      hasLabel: names.has('cta_button_label'),
      hasTitle: names.has('cta_button_title'),
    };
  } catch {
    return { hasLabel: true, hasTitle: true };
  }
}

/** Timestamp / sort columns available on dm_automations. */
export async function getDmAutomationSortColumns(): Promise<{
  hasCreatedAt: boolean;
  hasUpdatedAt: boolean;
}> {
  if (!process.env.DATABASE_URL?.trim()) {
    return { hasCreatedAt: false, hasUpdatedAt: false };
  }
  try {
    const rows = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'dm_automations'
        AND column_name IN ('created_at', 'updated_at')
    `;
    const names = new Set(
      (Array.isArray(rows) ? rows : []).map((r) => String(r.column_name))
    );
    return {
      hasCreatedAt: names.has('created_at'),
      hasUpdatedAt: names.has('updated_at'),
    };
  } catch {
    return { hasCreatedAt: false, hasUpdatedAt: false };
  }
}

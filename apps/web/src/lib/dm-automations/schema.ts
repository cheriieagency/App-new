/**
 * Comment-to-DM automation tables (ManyChat-style keyword triggers).
 */

import sql from '@/app/api/utils/sql';

let ready: Promise<void> | null = null;

export async function ensureDmAutomationsSchema(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;
  if (ready) return ready;

  ready = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS public.dm_automations (
        id                          serial PRIMARY KEY,
        workspace_id                text NOT NULL,
        user_id                     text,
        title                       text NOT NULL DEFAULT 'Comment-to-DM rule',
        trigger_keywords            text[] NOT NULL DEFAULT '{}',
        dm_message_text             text NOT NULL DEFAULT '',
        cta_button_label            text,
        cta_button_url              text,
        reply_to_comment_publicly   boolean NOT NULL DEFAULT false,
        public_comment_text         text,
        is_active                   boolean NOT NULL DEFAULT true,
        total_dms_sent              integer NOT NULL DEFAULT 0,
        storefront_clicks           integer NOT NULL DEFAULT 0,
        created_at                  timestamptz NOT NULL DEFAULT now(),
        updated_at                  timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS dm_automations_workspace_idx
        ON public.dm_automations (workspace_id, is_active)
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS public.dm_logs (
        id                  serial PRIMARY KEY,
        workspace_id        text NOT NULL,
        automation_id       integer REFERENCES public.dm_automations(id) ON DELETE SET NULL,
        comment_id          text,
        media_id            text,
        commenter_id        text NOT NULL,
        commenter_username  text,
        comment_text        text,
        dm_message_id       text,
        matched_keyword     text,
        status              text NOT NULL DEFAULT 'sent',
        error_message       text,
        created_at          timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS dm_logs_workspace_idx
        ON public.dm_logs (workspace_id, created_at DESC)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS dm_logs_rate_idx
        ON public.dm_logs (workspace_id, commenter_id, created_at DESC)
    `;
  })().catch((error) => {
    ready = null;
    console.warn('[dm-automations/schema]', error);
    throw error;
  });

  return ready;
}

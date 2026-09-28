/**
 * Instagram DM chat-flow schema healer (ManyChat-style).
 * Idempotent — safe on every webhook / engine call.
 */

import sql from '@/app/api/utils/sql';

let ready: Promise<void> | null = null;

async function safe(ddl: ReturnType<typeof sql>): Promise<void> {
  try {
    await ddl;
  } catch (error) {
    console.warn('[dm-flows/schema] skipped', error);
  }
}

export async function ensureDmFlowSchema(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;

  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS public.automation_flows (
          id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          workspace_id    text NOT NULL,
          user_id         text,
          title           text NOT NULL DEFAULT 'DM chat flow',
          description     text,
          is_active       boolean NOT NULL DEFAULT true,
          entry_step_id   uuid,
          created_at      timestamptz NOT NULL DEFAULT now(),
          updated_at      timestamptz NOT NULL DEFAULT now()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS public.flow_triggers (
          id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          flow_id         uuid NOT NULL REFERENCES public.automation_flows(id) ON DELETE CASCADE,
          workspace_id    text NOT NULL,
          match_type      text NOT NULL DEFAULT 'contains',
          keyword         text NOT NULL,
          case_sensitive  boolean NOT NULL DEFAULT false,
          created_at      timestamptz NOT NULL DEFAULT now()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS public.flow_steps (
          id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          flow_id           uuid NOT NULL REFERENCES public.automation_flows(id) ON DELETE CASCADE,
          workspace_id      text NOT NULL,
          step_type         text NOT NULL DEFAULT 'message',
          name              text NOT NULL DEFAULT 'Step',
          message_text      text,
          link_url          text,
          buttons           jsonb NOT NULL DEFAULT '[]'::jsonb,
          condition         jsonb NOT NULL DEFAULT '{"type":"none"}'::jsonb,
          next_step_id      uuid,
          position          integer NOT NULL DEFAULT 0,
          created_at        timestamptz NOT NULL DEFAULT now(),
          updated_at        timestamptz NOT NULL DEFAULT now()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS public.flow_sessions (
          id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          workspace_id      text NOT NULL,
          flow_id           uuid NOT NULL REFERENCES public.automation_flows(id) ON DELETE CASCADE,
          current_step_id   uuid,
          sender_id         text NOT NULL,
          page_id           text,
          ig_user_id        text,
          last_payload      text,
          status            text NOT NULL DEFAULT 'active',
          created_at        timestamptz NOT NULL DEFAULT now(),
          updated_at        timestamptz NOT NULL DEFAULT now(),
          UNIQUE (workspace_id, sender_id, flow_id)
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS public.flow_event_logs (
          id              bigserial PRIMARY KEY,
          workspace_id    text NOT NULL,
          flow_id         uuid,
          step_id         uuid,
          sender_id       text NOT NULL,
          event_type      text NOT NULL,
          payload         jsonb,
          error_message   text,
          created_at      timestamptz NOT NULL DEFAULT now()
        )
      `;
      await safe(sql`
        CREATE INDEX IF NOT EXISTS automation_flows_workspace_idx
          ON public.automation_flows (workspace_id, is_active)
      `);
      await safe(sql`
        CREATE INDEX IF NOT EXISTS flow_triggers_keyword_idx
          ON public.flow_triggers (workspace_id, lower(keyword))
      `);
      await safe(sql`
        CREATE INDEX IF NOT EXISTS flow_sessions_sender_idx
          ON public.flow_sessions (workspace_id, sender_id, status)
      `);
    })().catch((error) => {
      ready = null;
      throw error;
    });
  }

  await ready;
}

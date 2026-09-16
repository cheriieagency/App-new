-- ManyChat-style Instagram DM automation flows (keyword → Quick Reply → condition → link).
-- Complements Comment-to-DM (dm_automations) which handles comment keywords → Private Reply.

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
);

CREATE TABLE IF NOT EXISTS public.flow_triggers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id         uuid NOT NULL REFERENCES public.automation_flows(id) ON DELETE CASCADE,
  workspace_id    text NOT NULL,
  -- keyword | exact | contains | regex
  match_type      text NOT NULL DEFAULT 'contains',
  keyword         text NOT NULL,
  case_sensitive  boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.flow_steps (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id           uuid NOT NULL REFERENCES public.automation_flows(id) ON DELETE CASCADE,
  workspace_id      text NOT NULL,
  -- message | condition | end
  step_type         text NOT NULL DEFAULT 'message',
  name              text NOT NULL DEFAULT 'Step',
  -- Bot reply body (supports {link} placeholder)
  message_text      text,
  -- Optional CTA URL appended / substituted into message_text
  link_url          text,
  -- Quick Reply buttons: [{ title, payload, next_step_id }]
  buttons           jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Condition gate (evaluated before sending this step or choosing branch)
  -- { "type": "none" | "is_follower" | "always", "on_true_step_id": "...", "on_false_step_id": "..." }
  condition         jsonb NOT NULL DEFAULT '{"type":"none"}'::jsonb,
  -- Default next step when no button payload matches
  next_step_id      uuid,
  position          integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Track where each Instagram user is inside a flow (for button postbacks).
CREATE TABLE IF NOT EXISTS public.flow_sessions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      text NOT NULL,
  flow_id           uuid NOT NULL REFERENCES public.automation_flows(id) ON DELETE CASCADE,
  current_step_id   uuid REFERENCES public.flow_steps(id) ON DELETE SET NULL,
  -- Instagram-scoped sender id (IGSID)
  sender_id         text NOT NULL,
  page_id           text,
  ig_user_id        text,
  last_payload      text,
  status            text NOT NULL DEFAULT 'active', -- active | completed | expired
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, sender_id, flow_id)
);

CREATE TABLE IF NOT EXISTS public.flow_event_logs (
  id              bigserial PRIMARY KEY,
  workspace_id    text NOT NULL,
  flow_id         uuid,
  step_id         uuid,
  sender_id       text NOT NULL,
  event_type      text NOT NULL, -- trigger_match | button_click | condition | message_sent | error
  payload         jsonb,
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS automation_flows_workspace_idx
  ON public.automation_flows (workspace_id, is_active);

CREATE INDEX IF NOT EXISTS flow_triggers_keyword_idx
  ON public.flow_triggers (workspace_id, lower(keyword));

CREATE INDEX IF NOT EXISTS flow_triggers_flow_idx
  ON public.flow_triggers (flow_id);

CREATE INDEX IF NOT EXISTS flow_steps_flow_idx
  ON public.flow_steps (flow_id, position);

CREATE INDEX IF NOT EXISTS flow_sessions_sender_idx
  ON public.flow_sessions (workspace_id, sender_id, status);

CREATE INDEX IF NOT EXISTS flow_event_logs_workspace_idx
  ON public.flow_event_logs (workspace_id, created_at DESC);

-- Entry step FK (added after flow_steps exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'automation_flows_entry_step_fk'
  ) THEN
    ALTER TABLE public.automation_flows
      ADD CONSTRAINT automation_flows_entry_step_fk
      FOREIGN KEY (entry_step_id) REFERENCES public.flow_steps(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.automation_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_event_logs ENABLE ROW LEVEL SECURITY;

-- Service role / server uses DATABASE_URL (bypasses RLS). Policies for future Supabase clients:
DROP POLICY IF EXISTS automation_flows_service_all ON public.automation_flows;
CREATE POLICY automation_flows_service_all ON public.automation_flows
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS flow_triggers_service_all ON public.flow_triggers;
CREATE POLICY flow_triggers_service_all ON public.flow_triggers
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS flow_steps_service_all ON public.flow_steps;
CREATE POLICY flow_steps_service_all ON public.flow_steps
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS flow_sessions_service_all ON public.flow_sessions;
CREATE POLICY flow_sessions_service_all ON public.flow_sessions
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS flow_event_logs_service_all ON public.flow_event_logs;
CREATE POLICY flow_event_logs_service_all ON public.flow_event_logs
  FOR ALL USING (true) WITH CHECK (true);

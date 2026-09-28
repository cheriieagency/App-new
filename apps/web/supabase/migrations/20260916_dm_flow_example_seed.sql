-- Example ManyChat-style flow (replace WORKSPACE_ID before running).
-- Keyword "Hey Eve!" → Quick Reply → follower check → link message.
--
-- Usage (psql / Supabase SQL editor):
--   1. Set workspace_id below to your brand workspace id
--   2. Run this script once
--   3. Subscribe Page webhooks: messages, messaging_postbacks
--   4. DM the IG account: Hey Eve!

DO $$
DECLARE
  v_workspace text := 'WORKSPACE_ID'; -- ← replace
  v_flow_id uuid;
  v_step_welcome uuid;
  v_step_condition uuid;
  v_step_follower uuid;
  v_step_not_follower uuid;
BEGIN
  IF v_workspace = 'WORKSPACE_ID' THEN
    RAISE NOTICE 'Skip seed: set WORKSPACE_ID first';
    RETURN;
  END IF;

  INSERT INTO public.automation_flows (workspace_id, title, description, is_active)
  VALUES (
    v_workspace,
    'Hey Eve! welcome flow',
    'Keyword DM → Quick Reply → follower gate → storefront link',
    true
  )
  RETURNING id INTO v_flow_id;

  INSERT INTO public.flow_triggers (flow_id, workspace_id, match_type, keyword, case_sensitive)
  VALUES (v_flow_id, v_workspace, 'contains', 'Hey Eve!', false);

  -- Step 1: welcome + Quick Reply
  INSERT INTO public.flow_steps (
    flow_id, workspace_id, step_type, name, message_text, buttons, position
  ) VALUES (
    v_flow_id,
    v_workspace,
    'message',
    'Welcome',
    'Hey! Want the free link? Tap below 👇',
    '[{"title":"Yes, send link","payload":"EVE_YES_LINK","next_step_id":null}]'::jsonb,
    0
  )
  RETURNING id INTO v_step_welcome;

  -- Step 2: condition (follower?)
  INSERT INTO public.flow_steps (
    flow_id, workspace_id, step_type, name, condition, position
  ) VALUES (
    v_flow_id,
    v_workspace,
    'condition',
    'Follow check',
    jsonb_build_object(
      'type', 'is_follower',
      'on_true_step_id', null,
      'on_false_step_id', null
    ),
    1
  )
  RETURNING id INTO v_step_condition;

  -- Step 3a: follower → link
  INSERT INTO public.flow_steps (
    flow_id, workspace_id, step_type, name, message_text, link_url, buttons, position
  ) VALUES (
    v_flow_id,
    v_workspace,
    'message',
    'Send link',
    'Here is the link you have been waiting for! {link}',
    'https://www.clikd.app/',
    '[]'::jsonb,
    2
  )
  RETURNING id INTO v_step_follower;

  -- Step 3b: not follower
  INSERT INTO public.flow_steps (
    flow_id, workspace_id, step_type, name, message_text, buttons, position
  ) VALUES (
    v_flow_id,
    v_workspace,
    'message',
    'Ask to follow',
    'Please follow this account first, then tap Yes again 💛',
    '[{"title":"I follow now","payload":"EVE_YES_LINK","next_step_id":null}]'::jsonb,
    3
  )
  RETURNING id INTO v_step_not_follower;

  -- Wire button → condition, condition branches, re-tap loops to condition
  UPDATE public.flow_steps
  SET buttons = jsonb_build_array(
    jsonb_build_object(
      'title', 'Yes, send link',
      'payload', 'EVE_YES_LINK',
      'next_step_id', v_step_condition
    )
  )
  WHERE id = v_step_welcome;

  UPDATE public.flow_steps
  SET condition = jsonb_build_object(
    'type', 'is_follower',
    'on_true_step_id', v_step_follower,
    'on_false_step_id', v_step_not_follower
  )
  WHERE id = v_step_condition;

  UPDATE public.flow_steps
  SET buttons = jsonb_build_array(
    jsonb_build_object(
      'title', 'I follow now',
      'payload', 'EVE_YES_LINK',
      'next_step_id', v_step_condition
    )
  )
  WHERE id = v_step_not_follower;

  UPDATE public.automation_flows
  SET entry_step_id = v_step_welcome, updated_at = now()
  WHERE id = v_flow_id;

  RAISE NOTICE 'Seeded DM flow % for workspace %', v_flow_id, v_workspace;
END $$;

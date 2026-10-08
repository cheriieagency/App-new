/**
 * Instagram DM chat-flow engine (ManyChat-style).
 *
 * Flow:
 *  1. Keyword DM match → entry step (text + Quick Replies)
 *  2. Button payload → optional condition (e.g. is_follower)
 *  3. Final message with web link
 */

import sql from '@/app/api/utils/sql';
import { ensureDmFlowSchema } from '@/lib/dm-flows/schema';
import type {
  AutomationFlowRow,
  FlowCondition,
  FlowEngineResult,
  FlowQuickReplyButton,
  FlowStepRow,
  FlowTriggerRow,
  IncomingDmEvent,
} from '@/lib/dm-flows/types';
import {
  checkInstagramUserFollowsBusiness,
  sendInstagramDmWithQuickReplies,
} from '@/lib/meta/graph-api';
import { ensureSocialAccountsSchema } from '@/lib/social/persist';

type ResolvedAccount = {
  workspaceId: string;
  igUserId: string;
  pageId: string;
  pageAccessToken: string;
};

function parseButtons(raw: unknown): FlowQuickReplyButton[] {
  if (!raw) return [];
  let value: unknown = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  const out: FlowQuickReplyButton[] = [];
  for (const b of value) {
    const row = b as Record<string, unknown>;
    const title = String(row.title || '').trim();
    const payload = String(row.payload || '').trim();
    if (!title || !payload) continue;
    out.push({
      title: title.slice(0, 20),
      payload,
      next_step_id: row.next_step_id ? String(row.next_step_id) : null,
    });
  }
  return out;
}

function parseCondition(raw: unknown): FlowCondition {
  if (!raw || typeof raw !== 'object') return { type: 'none' };
  const c = raw as Record<string, unknown>;
  const type = String(c.type || 'none') as FlowCondition['type'];
  return {
    type:
      type === 'is_follower' || type === 'always' || type === 'none'
        ? type
        : 'none',
    on_true_step_id: c.on_true_step_id
      ? String(c.on_true_step_id)
      : null,
    on_false_step_id: c.on_false_step_id
      ? String(c.on_false_step_id)
      : null,
  };
}

function keywordMatches(
  text: string,
  trigger: FlowTriggerRow
): boolean {
  const hay = trigger.case_sensitive ? text : text.toLowerCase();
  const needle = trigger.case_sensitive
    ? trigger.keyword.trim()
    : trigger.keyword.trim().toLowerCase();
  if (!needle) return false;

  switch (trigger.match_type) {
    case 'exact':
      return hay.trim() === needle;
    case 'keyword':
    case 'contains':
      return hay.includes(needle);
    case 'regex':
      try {
        return new RegExp(trigger.keyword, trigger.case_sensitive ? '' : 'i').test(
          text
        );
      } catch {
        return false;
      }
    default:
      return hay.includes(needle);
  }
}

function renderMessage(step: FlowStepRow): string {
  let text = String(step.message_text || '').trim();
  const link = String(step.link_url || '').trim();
  if (link) {
    if (text.includes('{link}')) {
      text = text.replaceAll('{link}', link);
    } else if (!text.includes(link)) {
      text = `${text}\n\n${link}`.trim();
    }
  }
  return text;
}

async function resolveAccount(
  event: IncomingDmEvent
): Promise<ResolvedAccount | null> {
  await ensureSocialAccountsSchema();
  const ids = [event.pageId, event.igAccountId].filter(
    (v): v is string => Boolean(v && String(v).trim())
  );
  if (ids.length === 0) return null;

  for (const id of ids) {
    const rows = await sql`
      SELECT workspace_id, platform, platform_user_id, page_id, access_token, meta
      FROM public.social_accounts
      WHERE platform IN ('instagram', 'facebook')
        AND (
          platform_user_id = ${id}
          OR page_id = ${id}
          OR COALESCE(meta->>'page_id', '') = ${id}
          OR COALESCE(meta->>'ig_user_id', '') = ${id}
        )
      LIMIT 5
    `;
    const list = Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
    const ig =
      list.find((r) => String(r.platform) === 'instagram') || list[0];
    const fb = list.find((r) => String(r.platform) === 'facebook');
    if (!ig) continue;

    const workspaceId = String(ig.workspace_id || '').trim();
    const meta =
      ig.meta && typeof ig.meta === 'object'
        ? (ig.meta as Record<string, unknown>)
        : {};
    const fbMeta =
      fb?.meta && typeof fb.meta === 'object'
        ? (fb.meta as Record<string, unknown>)
        : {};
    const pageAccessToken =
      (typeof meta.page_access_token === 'string' &&
        meta.page_access_token.trim()) ||
      (typeof fbMeta.page_access_token === 'string' &&
        fbMeta.page_access_token.trim()) ||
      String(fb?.access_token || ig.access_token || '').trim();
    const pageId = String(
      ig.page_id ||
        fb?.page_id ||
        (typeof meta.page_id === 'string' ? meta.page_id : '') ||
        event.pageId ||
        ''
    ).trim();
    if (!workspaceId || !pageAccessToken || !pageId) continue;

    return {
      workspaceId,
      igUserId: String(ig.platform_user_id || event.igAccountId || ''),
      pageId,
      pageAccessToken,
    };
  }
  return null;
}

async function logEvent(input: {
  workspaceId: string;
  flowId?: string | null;
  stepId?: string | null;
  senderId: string;
  eventType: string;
  payload?: unknown;
  error?: string | null;
}): Promise<void> {
  try {
    await sql`
      INSERT INTO public.flow_event_logs (
        workspace_id, flow_id, step_id, sender_id, event_type, payload, error_message
      ) VALUES (
        ${input.workspaceId},
        ${input.flowId ?? null},
        ${input.stepId ?? null},
        ${input.senderId},
        ${input.eventType},
        ${JSON.stringify(input.payload ?? null)}::jsonb,
        ${input.error ?? null}
      )
    `;
  } catch (error) {
    console.warn('[dm-flows] logEvent', error);
  }
}

async function loadStep(stepId: string): Promise<FlowStepRow | null> {
  const rows = await sql`
    SELECT * FROM public.flow_steps WHERE id = ${stepId} LIMIT 1
  `;
  const r = Array.isArray(rows) ? rows[0] : null;
  if (!r) return null;
  return {
    id: String(r.id),
    flow_id: String(r.flow_id),
    workspace_id: String(r.workspace_id),
    step_type: String(r.step_type || 'message') as FlowStepRow['step_type'],
    name: String(r.name || 'Step'),
    message_text: r.message_text != null ? String(r.message_text) : null,
    link_url: r.link_url != null ? String(r.link_url) : null,
    buttons: parseButtons(r.buttons),
    condition: parseCondition(r.condition),
    next_step_id: r.next_step_id != null ? String(r.next_step_id) : null,
    position: Number(r.position) || 0,
  };
}

async function findTriggerMatch(
  workspaceId: string,
  text: string
): Promise<{ flow: AutomationFlowRow; trigger: FlowTriggerRow } | null> {
  const rows = await sql`
    SELECT
      t.id AS trigger_id,
      t.flow_id,
      t.workspace_id,
      t.match_type,
      t.keyword,
      t.case_sensitive,
      f.id AS flow_table_id,
      f.title,
      f.is_active,
      f.entry_step_id,
      f.user_id
    FROM public.flow_triggers t
    INNER JOIN public.automation_flows f ON f.id = t.flow_id
    WHERE t.workspace_id = ${workspaceId}
      AND f.is_active = true
    ORDER BY length(t.keyword) DESC, t.created_at ASC
  `;
  const list = Array.isArray(rows) ? rows : [];
  for (const r of list) {
    const trigger: FlowTriggerRow = {
      id: String(r.trigger_id),
      flow_id: String(r.flow_id),
      workspace_id: String(r.workspace_id),
      match_type: String(r.match_type || 'contains') as FlowTriggerRow['match_type'],
      keyword: String(r.keyword || ''),
      case_sensitive: Boolean(r.case_sensitive),
    };
    if (!keywordMatches(text, trigger)) continue;
    return {
      flow: {
        id: String(r.flow_table_id || r.flow_id),
        workspace_id: String(r.workspace_id),
        user_id: r.user_id != null ? String(r.user_id) : null,
        title: String(r.title || 'Flow'),
        is_active: Boolean(r.is_active),
        entry_step_id: r.entry_step_id != null ? String(r.entry_step_id) : null,
      },
      trigger,
    };
  }
  return null;
}

async function upsertSession(input: {
  workspaceId: string;
  flowId: string;
  stepId: string | null;
  senderId: string;
  pageId: string;
  igUserId: string;
  payload?: string | null;
  status?: string;
}): Promise<void> {
  await sql`
    INSERT INTO public.flow_sessions (
      workspace_id, flow_id, current_step_id, sender_id, page_id, ig_user_id,
      last_payload, status, updated_at
    ) VALUES (
      ${input.workspaceId},
      ${input.flowId},
      ${input.stepId},
      ${input.senderId},
      ${input.pageId},
      ${input.igUserId},
      ${input.payload ?? null},
      ${input.status || 'active'},
      now()
    )
    ON CONFLICT (workspace_id, sender_id, flow_id) DO UPDATE SET
      current_step_id = EXCLUDED.current_step_id,
      last_payload = EXCLUDED.last_payload,
      status = EXCLUDED.status,
      page_id = EXCLUDED.page_id,
      ig_user_id = EXCLUDED.ig_user_id,
      updated_at = now()
  `;
}

async function findActiveSession(
  workspaceId: string,
  senderId: string
): Promise<{ flow_id: string; current_step_id: string | null } | null> {
  const rows = await sql`
    SELECT flow_id, current_step_id
    FROM public.flow_sessions
    WHERE workspace_id = ${workspaceId}
      AND sender_id = ${senderId}
      AND status = 'active'
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  const r = Array.isArray(rows) ? rows[0] : null;
  if (!r) return null;
  return {
    flow_id: String(r.flow_id),
    current_step_id: r.current_step_id != null ? String(r.current_step_id) : null,
  };
}

async function evaluateCondition(
  condition: FlowCondition,
  account: ResolvedAccount,
  senderId: string
): Promise<boolean> {
  if (!condition || condition.type === 'none' || condition.type === 'always') {
    return true;
  }
  if (condition.type === 'is_follower') {
    return checkInstagramUserFollowsBusiness({
      pageId: account.pageId,
      pageAccessToken: account.pageAccessToken,
      igUserId: account.igUserId,
      senderId,
    });
  }
  return true;
}

async function sendStep(input: {
  account: ResolvedAccount;
  senderId: string;
  step: FlowStepRow;
}): Promise<{ messageId: string }> {
  const text = renderMessage(input.step);
  if (!text && input.step.buttons.length === 0) {
    throw new Error('empty_step_message');
  }
  return sendInstagramDmWithQuickReplies({
    pageId: input.account.pageId,
    pageAccessToken: input.account.pageAccessToken,
    recipientId: input.senderId,
    text: text || ' ',
    quickReplies: input.step.buttons.map((b) => ({
      title: b.title,
      payload: b.payload,
    })),
  });
}

/**
 * Resolve next step after a button payload on the current step.
 */
function nextStepFromPayload(
  step: FlowStepRow,
  payload: string
): string | null {
  const button = step.buttons.find((b) => b.payload === payload);
  if (button?.next_step_id) return button.next_step_id;
  return step.next_step_id;
}

/**
 * Process one incoming Instagram DM / postback through the flow engine.
 */
export async function processDmFlowEvent(
  event: IncomingDmEvent
): Promise<FlowEngineResult> {
  if (!process.env.DATABASE_URL?.trim()) {
    return { matched: false, sent: false, error: 'no_database' };
  }
  if (!event.senderId) {
    return { matched: false, sent: false, error: 'no_sender' };
  }

  await ensureDmFlowSchema();

  const account = await resolveAccount(event);
  if (!account) {
    return { matched: false, sent: false, error: 'account_not_found' };
  }

  try {
    // ── Button / quick-reply payload path ─────────────────────────────────
    if (event.payload) {
      const session = await findActiveSession(
        account.workspaceId,
        event.senderId
      );
      if (!session?.current_step_id) {
        return { matched: false, sent: false, error: 'no_active_session' };
      }

      const current = await loadStep(session.current_step_id);
      if (!current) {
        return { matched: false, sent: false, error: 'step_missing' };
      }

      await logEvent({
        workspaceId: account.workspaceId,
        flowId: current.flow_id,
        stepId: current.id,
        senderId: event.senderId,
        eventType: 'button_click',
        payload: { payload: event.payload, text: event.text },
      });

      let nextId = nextStepFromPayload(current, event.payload);
      if (!nextId) {
        return {
          matched: true,
          sent: false,
          flowId: current.flow_id,
          stepId: current.id,
          error: 'no_next_step',
        };
      }

      let next = await loadStep(nextId);
      if (!next) {
        return { matched: true, sent: false, error: 'next_step_missing' };
      }

      // Condition steps branch without sending a message themselves.
      if (next.step_type === 'condition') {
        const ok = await evaluateCondition(
          next.condition,
          account,
          event.senderId
        );
        await logEvent({
          workspaceId: account.workspaceId,
          flowId: next.flow_id,
          stepId: next.id,
          senderId: event.senderId,
          eventType: 'condition',
          payload: { type: next.condition.type, result: ok },
        });
        const branchId = ok
          ? next.condition.on_true_step_id
          : next.condition.on_false_step_id;
        if (!branchId) {
          return {
            matched: true,
            sent: false,
            flowId: next.flow_id,
            stepId: next.id,
            error: 'condition_branch_missing',
          };
        }
        next = (await loadStep(branchId))!;
        if (!next) {
          return { matched: true, sent: false, error: 'branch_step_missing' };
        }
      }

      if (next.step_type === 'end') {
        await upsertSession({
          workspaceId: account.workspaceId,
          flowId: next.flow_id,
          stepId: next.id,
          senderId: event.senderId,
          pageId: account.pageId,
          igUserId: account.igUserId,
          payload: event.payload,
          status: 'completed',
        });
        return {
          matched: true,
          sent: false,
          flowId: next.flow_id,
          stepId: next.id,
        };
      }

      const sent = await sendStep({
        account,
        senderId: event.senderId,
        step: next,
      });
      await upsertSession({
        workspaceId: account.workspaceId,
        flowId: next.flow_id,
        stepId: next.id,
        senderId: event.senderId,
        pageId: account.pageId,
        igUserId: account.igUserId,
        payload: event.payload,
        status: next.buttons.length === 0 ? 'completed' : 'active',
      });
      await logEvent({
        workspaceId: account.workspaceId,
        flowId: next.flow_id,
        stepId: next.id,
        senderId: event.senderId,
        eventType: 'message_sent',
        payload: { messageId: sent.messageId },
      });
      return {
        matched: true,
        sent: true,
        flowId: next.flow_id,
        stepId: next.id,
        messageId: sent.messageId,
      };
    }

    // ── Keyword text path ─────────────────────────────────────────────────
    const text = String(event.text || '').trim();
    if (!text) {
      return { matched: false, sent: false, error: 'empty_text' };
    }

    const hit = await findTriggerMatch(account.workspaceId, text);
    if (!hit?.flow.entry_step_id) {
      return { matched: false, sent: false };
    }

    await logEvent({
      workspaceId: account.workspaceId,
      flowId: hit.flow.id,
      senderId: event.senderId,
      eventType: 'trigger_match',
      payload: { keyword: hit.trigger.keyword, text },
    });

    const entry = await loadStep(hit.flow.entry_step_id);
    if (!entry) {
      return {
        matched: true,
        sent: false,
        flowId: hit.flow.id,
        error: 'entry_step_missing',
      };
    }

    const sent = await sendStep({
      account,
      senderId: event.senderId,
      step: entry,
    });
    await upsertSession({
      workspaceId: account.workspaceId,
      flowId: hit.flow.id,
      stepId: entry.id,
      senderId: event.senderId,
      pageId: account.pageId,
      igUserId: account.igUserId,
      status: 'active',
    });
    await logEvent({
      workspaceId: account.workspaceId,
      flowId: hit.flow.id,
      stepId: entry.id,
      senderId: event.senderId,
      eventType: 'message_sent',
      payload: { messageId: sent.messageId },
    });

    return {
      matched: true,
      sent: true,
      flowId: hit.flow.id,
      stepId: entry.id,
      messageId: sent.messageId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'flow_failed';
    await logEvent({
      workspaceId: account.workspaceId,
      senderId: event.senderId,
      eventType: 'error',
      error: message,
      payload: { text: event.text, payload: event.payload },
    });
    return { matched: false, sent: false, error: message };
  }
}

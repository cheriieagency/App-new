/**
 * GET/POST/PATCH/DELETE /api/admin/inbox/flows
 * Manage ManyChat-style Instagram DM chat flows for the active workspace.
 *
 * POST body (simplified editor shape) expands into automation_flows +
 * flow_triggers + flow_steps (welcome → condition → follower / not-follower).
 */

import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
} from '@/lib/social/persist';
import { ensureDmFlowSchema } from '@/lib/dm-flows/schema';
import { resolveStrictUserWorkspace } from '@/lib/social/resolve-user-workspace';
import { requireFeature } from '@/lib/plan-guard';

type FlowEditorPayload = {
  workspaceId?: string;
  id?: string;
  title?: string;
  keyword?: string;
  welcomeMessage?: string;
  quickReplyTitle?: string;
  checkFollower?: boolean;
  followerMessage?: string;
  linkUrl?: string;
  notFollowerMessage?: string;
  isActive?: boolean;
};

async function resolveWorkspaceId(
  request: Request,
  bodyWorkspaceId?: unknown
): Promise<string | null> {
  const jar = await cookies();
  const url = new URL(request.url);
  const fromBody =
    typeof bodyWorkspaceId === 'string' ? bodyWorkspaceId.trim() : '';

  return (
    fromBody ||
    url.searchParams.get('workspaceId')?.trim() ||
    url.searchParams.get('workspace_id')?.trim() ||
    request.headers.get('x-workspace-id')?.trim() ||
    request.headers.get('x-active-workspace-id')?.trim() ||
    jar.get(ACTIVE_WORKSPACE_COOKIE)?.value?.trim() ||
    jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value?.trim() ||
    null
  );
}

function payloadFromStepButtons(raw: unknown): {
  quickReplyTitle: string;
} {
  let value: unknown = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      value = [];
    }
  }
  const first = Array.isArray(value) ? value[0] : null;
  const title =
    first && typeof first === 'object'
      ? String((first as { title?: string }).title || '').trim()
      : '';
  return { quickReplyTitle: title || 'Yes, send link' };
}

function mapFlowListRow(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id || ''),
    title: String(row.title || 'DM chat flow'),
    keyword: String(row.keyword || ''),
    welcomeMessage: String(row.welcome_message || ''),
    quickReplyTitle: String(row.quick_reply_title || 'Yes, send link'),
    checkFollower: Boolean(row.check_follower),
    followerMessage: String(row.follower_message || ''),
    linkUrl: String(row.link_url || ''),
    notFollowerMessage: String(row.not_follower_message || ''),
    isActive: row.is_active === undefined ? true : Boolean(row.is_active),
    entryStepId: row.entry_step_id != null ? String(row.entry_step_id) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

/** Load editor-friendly view of a flow (joins first trigger + key steps). */
async function loadFlowEditorViews(workspaceId: string, flowId?: string) {
  const rows = flowId
    ? await sql`
        SELECT
          f.id,
          f.workspace_id,
          f.title,
          f.is_active,
          f.entry_step_id,
          f.updated_at,
          t.keyword,
          welcome.message_text AS welcome_message,
          welcome.buttons AS welcome_buttons,
          cond.condition AS cond_json,
          follower.message_text AS follower_message,
          follower.link_url AS link_url,
          not_follower.message_text AS not_follower_message
        FROM public.automation_flows f
        LEFT JOIN LATERAL (
          SELECT keyword FROM public.flow_triggers
          WHERE flow_id = f.id
          ORDER BY created_at ASC
          LIMIT 1
        ) t ON true
        LEFT JOIN public.flow_steps welcome ON welcome.id = f.entry_step_id
        LEFT JOIN LATERAL (
          SELECT * FROM public.flow_steps
          WHERE flow_id = f.id AND step_type = 'condition'
          ORDER BY position ASC
          LIMIT 1
        ) cond ON true
        LEFT JOIN LATERAL (
          SELECT * FROM public.flow_steps s
          WHERE s.flow_id = f.id
            AND s.step_type = 'message'
            AND s.id <> f.entry_step_id
            AND COALESCE(s.link_url, '') <> ''
          ORDER BY s.position ASC
          LIMIT 1
        ) follower ON true
        LEFT JOIN LATERAL (
          SELECT * FROM public.flow_steps s
          WHERE s.flow_id = f.id
            AND s.step_type = 'message'
            AND s.id <> f.entry_step_id
            AND COALESCE(s.link_url, '') = ''
            AND s.id <> COALESCE(follower.id, '00000000-0000-0000-0000-000000000000'::uuid)
          ORDER BY s.position ASC
          LIMIT 1
        ) not_follower ON true
        WHERE f.workspace_id = ${workspaceId}
          AND f.id = ${flowId}
        LIMIT 1
      `
    : await sql`
        SELECT
          f.id,
          f.workspace_id,
          f.title,
          f.is_active,
          f.entry_step_id,
          f.updated_at,
          t.keyword,
          welcome.message_text AS welcome_message,
          welcome.buttons AS welcome_buttons,
          cond.condition AS cond_json,
          follower.message_text AS follower_message,
          follower.link_url AS link_url,
          not_follower.message_text AS not_follower_message
        FROM public.automation_flows f
        LEFT JOIN LATERAL (
          SELECT keyword FROM public.flow_triggers
          WHERE flow_id = f.id
          ORDER BY created_at ASC
          LIMIT 1
        ) t ON true
        LEFT JOIN public.flow_steps welcome ON welcome.id = f.entry_step_id
        LEFT JOIN LATERAL (
          SELECT * FROM public.flow_steps
          WHERE flow_id = f.id AND step_type = 'condition'
          ORDER BY position ASC
          LIMIT 1
        ) cond ON true
        LEFT JOIN LATERAL (
          SELECT * FROM public.flow_steps s
          WHERE s.flow_id = f.id
            AND s.step_type = 'message'
            AND s.id <> f.entry_step_id
            AND COALESCE(s.link_url, '') <> ''
          ORDER BY s.position ASC
          LIMIT 1
        ) follower ON true
        LEFT JOIN LATERAL (
          SELECT * FROM public.flow_steps s
          WHERE s.flow_id = f.id
            AND s.step_type = 'message'
            AND s.id <> f.entry_step_id
            AND COALESCE(s.link_url, '') = ''
            AND s.id <> COALESCE(follower.id, '00000000-0000-0000-0000-000000000000'::uuid)
          ORDER BY s.position ASC
          LIMIT 1
        ) not_follower ON true
        WHERE f.workspace_id = ${workspaceId}
        ORDER BY f.updated_at DESC NULLS LAST, f.created_at DESC
      `;

  return (Array.isArray(rows) ? rows : []).map((r) => {
    const cond =
      r.cond_json && typeof r.cond_json === 'object'
        ? (r.cond_json as { type?: string })
        : {};
    const { quickReplyTitle } = payloadFromStepButtons(r.welcome_buttons);
    return mapFlowListRow({
      ...r,
      quick_reply_title: quickReplyTitle,
      check_follower: String(cond.type || '') === 'is_follower',
    });
  });
}

async function createOrReplaceFlowGraph(input: {
  workspaceId: string;
  userId: string;
  flowId?: string;
  title: string;
  keyword: string;
  welcomeMessage: string;
  quickReplyTitle: string;
  checkFollower: boolean;
  followerMessage: string;
  linkUrl: string;
  notFollowerMessage: string;
  isActive: boolean;
}): Promise<string> {
  const btnTitle = input.quickReplyTitle.slice(0, 20) || 'Yes, send link';
  const payloadKey = 'FLOW_YES_LINK';

  let flowId = input.flowId?.trim() || '';

  if (flowId) {
    // Wipe steps/triggers and rebuild (simple editor = full replace).
    await sql`DELETE FROM public.flow_triggers WHERE flow_id = ${flowId}`;
    await sql`DELETE FROM public.flow_steps WHERE flow_id = ${flowId}`;
    await sql`
      UPDATE public.automation_flows
      SET
        title = ${input.title},
        is_active = ${input.isActive},
        entry_step_id = NULL,
        updated_at = now()
      WHERE id = ${flowId} AND workspace_id = ${input.workspaceId}
    `;
  } else {
    const created = await sql`
      INSERT INTO public.automation_flows (
        workspace_id, user_id, title, description, is_active
      ) VALUES (
        ${input.workspaceId},
        ${input.userId},
        ${input.title},
        ${'DM keyword → Quick Reply → optional follower check → link'},
        ${input.isActive}
      )
      RETURNING id
    `;
    flowId = String(created[0]?.id || '');
    if (!flowId) throw new Error('flow_create_failed');
  }

  await sql`
    INSERT INTO public.flow_triggers (
      flow_id, workspace_id, match_type, keyword, case_sensitive
    ) VALUES (
      ${flowId},
      ${input.workspaceId},
      ${'contains'},
      ${input.keyword},
      ${false}
    )
  `;

  const welcomeRows = await sql`
    INSERT INTO public.flow_steps (
      flow_id, workspace_id, step_type, name, message_text, buttons, position
    ) VALUES (
      ${flowId},
      ${input.workspaceId},
      ${'message'},
      ${'Welcome'},
      ${input.welcomeMessage},
      ${JSON.stringify([])}::jsonb,
      ${0}
    )
    RETURNING id
  `;
  const welcomeId = String(welcomeRows[0]?.id || '');

  let conditionId: string | null = null;
  let followerId: string | null = null;
  let notFollowerId: string | null = null;

  if (input.checkFollower) {
    const condRows = await sql`
      INSERT INTO public.flow_steps (
        flow_id, workspace_id, step_type, name, condition, position
      ) VALUES (
        ${flowId},
        ${input.workspaceId},
        ${'condition'},
        ${'Follow check'},
        ${JSON.stringify({ type: 'is_follower' })}::jsonb,
        ${1}
      )
      RETURNING id
    `;
    conditionId = String(condRows[0]?.id || '');

    const followerRows = await sql`
      INSERT INTO public.flow_steps (
        flow_id, workspace_id, step_type, name, message_text, link_url, buttons, position
      ) VALUES (
        ${flowId},
        ${input.workspaceId},
        ${'message'},
        ${'Send link'},
        ${input.followerMessage},
        ${input.linkUrl},
        ${JSON.stringify([])}::jsonb,
        ${2}
      )
      RETURNING id
    `;
    followerId = String(followerRows[0]?.id || '');

    const notFollowerRows = await sql`
      INSERT INTO public.flow_steps (
        flow_id, workspace_id, step_type, name, message_text, buttons, position
      ) VALUES (
        ${flowId},
        ${input.workspaceId},
        ${'message'},
        ${'Ask to follow'},
        ${input.notFollowerMessage},
        ${JSON.stringify([])}::jsonb,
        ${3}
      )
      RETURNING id
    `;
    notFollowerId = String(notFollowerRows[0]?.id || '');

    await sql`
      UPDATE public.flow_steps
      SET condition = ${JSON.stringify({
        type: 'is_follower',
        on_true_step_id: followerId,
        on_false_step_id: notFollowerId,
      })}::jsonb
      WHERE id = ${conditionId}
    `;

    await sql`
      UPDATE public.flow_steps
      SET buttons = ${JSON.stringify([
        {
          title: btnTitle.slice(0, 20),
          payload: payloadKey,
          next_step_id: conditionId,
        },
      ])}::jsonb
      WHERE id = ${welcomeId}
    `;

    await sql`
      UPDATE public.flow_steps
      SET buttons = ${JSON.stringify([
        {
          title: 'I follow now'.slice(0, 20),
          payload: payloadKey,
          next_step_id: conditionId,
        },
      ])}::jsonb
      WHERE id = ${notFollowerId}
    `;
  } else {
    // No follower gate — button goes straight to link message.
    const followerRows = await sql`
      INSERT INTO public.flow_steps (
        flow_id, workspace_id, step_type, name, message_text, link_url, buttons, position
      ) VALUES (
        ${flowId},
        ${input.workspaceId},
        ${'message'},
        ${'Send link'},
        ${input.followerMessage},
        ${input.linkUrl},
        ${JSON.stringify([])}::jsonb,
        ${1}
      )
      RETURNING id
    `;
    followerId = String(followerRows[0]?.id || '');

    await sql`
      UPDATE public.flow_steps
      SET buttons = ${JSON.stringify([
        {
          title: btnTitle.slice(0, 20),
          payload: payloadKey,
          next_step_id: followerId,
        },
      ])}::jsonb
      WHERE id = ${welcomeId}
    `;
  }

  await sql`
    UPDATE public.automation_flows
    SET entry_step_id = ${welcomeId}, updated_at = now()
    WHERE id = ${flowId}
  `;

  return flowId;
}

export async function GET(request: Request) {
  try {
    const planGate = await requireFeature('directMessages', await headers());
    if (planGate) return planGate;

    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id?.trim();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.DATABASE_URL?.trim()) {
      return NextResponse.json({ ok: true, flows: [], demo: true });
    }

    await ensureDmFlowSchema();
    const workspaceId = await resolveWorkspaceId(request);
    const resolved = await resolveStrictUserWorkspace({
      userId,
      preferredWorkspaceId: workspaceId,
      email: session?.user?.email ?? null,
    });
    if (!resolved.ok) {
      return NextResponse.json(
        { error: resolved.error },
        { status: resolved.status }
      );
    }

    const flows = await loadFlowEditorViews(resolved.workspaceId);
    return NextResponse.json({
      ok: true,
      workspaceId: resolved.workspaceId,
      flows,
    });
  } catch (error) {
    console.error('[api/admin/inbox/flows] GET', error);
    return NextResponse.json(
      {
        error: 'flows_load_failed',
        message: error instanceof Error ? error.message : 'Failed',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const planGate = await requireFeature('directMessages', await headers());
    if (planGate) return planGate;

    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id?.trim();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.DATABASE_URL?.trim()) {
      return NextResponse.json(
        { error: 'database_unavailable' },
        { status: 503 }
      );
    }

    await ensureDmFlowSchema();
    const body = (await request.json().catch(() => ({}))) as FlowEditorPayload;
    const workspaceId = await resolveWorkspaceId(request, body.workspaceId);
    const resolved = await resolveStrictUserWorkspace({
      userId,
      preferredWorkspaceId: workspaceId,
      email: session?.user?.email ?? null,
    });
    if (!resolved.ok) {
      return NextResponse.json(
        { error: resolved.error },
        { status: resolved.status }
      );
    }

    const title = String(body.title || '').trim() || 'DM chat flow';
    const keyword = String(body.keyword || '').trim();
    const welcomeMessage = String(body.welcomeMessage || '').trim();
    const quickReplyTitle =
      String(body.quickReplyTitle || '').trim() || 'Yes, send link';
    const followerMessage = String(body.followerMessage || '').trim();
    const linkUrl = String(body.linkUrl || '').trim();
    const notFollowerMessage =
      String(body.notFollowerMessage || '').trim() ||
      'Please follow this account first, then tap again 💛';
    const checkFollower = body.checkFollower !== false;
    const isActive = body.isActive !== false;

    if (!keyword) {
      return NextResponse.json(
        { error: 'keyword_required', message: 'Add a DM keyword trigger.' },
        { status: 400 }
      );
    }
    if (!welcomeMessage) {
      return NextResponse.json(
        { error: 'welcome_required', message: 'Add a welcome DM message.' },
        { status: 400 }
      );
    }
    if (!followerMessage || !linkUrl) {
      return NextResponse.json(
        {
          error: 'link_step_required',
          message: 'Add the final message and web link.',
        },
        { status: 400 }
      );
    }

    // Update path
    if (body.id) {
      const existing = await sql`
        SELECT id FROM public.automation_flows
        WHERE id = ${String(body.id)}
          AND workspace_id = ${resolved.workspaceId}
        LIMIT 1
      `;
      if (!Array.isArray(existing) || existing.length === 0) {
        return NextResponse.json({ error: 'not_found' }, { status: 404 });
      }
    }

    const flowId = await createOrReplaceFlowGraph({
      workspaceId: resolved.workspaceId,
      userId,
      flowId: body.id ? String(body.id) : undefined,
      title,
      keyword,
      welcomeMessage,
      quickReplyTitle,
      checkFollower,
      followerMessage,
      linkUrl,
      notFollowerMessage,
      isActive,
    });

    const [flow] = await loadFlowEditorViews(resolved.workspaceId, flowId);
    return NextResponse.json({ ok: true, flow });
  } catch (error) {
    console.error('[api/admin/inbox/flows] POST', error);
    return NextResponse.json(
      {
        error: 'flow_save_failed',
        message: error instanceof Error ? error.message : 'Failed',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const planGate = await requireFeature('directMessages', await headers());
    if (planGate) return planGate;

    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id?.trim();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureDmFlowSchema();
    const body = (await request.json().catch(() => ({}))) as {
      workspaceId?: string;
      id?: string;
      isActive?: boolean;
    };
    const id = String(body.id || '').trim();
    if (!id) {
      return NextResponse.json({ error: 'id_required' }, { status: 400 });
    }

    const workspaceId = await resolveWorkspaceId(request, body.workspaceId);
    const resolved = await resolveStrictUserWorkspace({
      userId,
      preferredWorkspaceId: workspaceId,
      email: session?.user?.email ?? null,
    });
    if (!resolved.ok) {
      return NextResponse.json(
        { error: resolved.error },
        { status: resolved.status }
      );
    }

    await sql`
      UPDATE public.automation_flows
      SET is_active = ${Boolean(body.isActive)}, updated_at = now()
      WHERE id = ${id} AND workspace_id = ${resolved.workspaceId}
    `;
    const [flow] = await loadFlowEditorViews(resolved.workspaceId, id);
    return NextResponse.json({ ok: true, flow });
  } catch (error) {
    console.error('[api/admin/inbox/flows] PATCH', error);
    return NextResponse.json(
      { error: 'flow_toggle_failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const planGate = await requireFeature('directMessages', await headers());
    if (planGate) return planGate;

    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id?.trim();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureDmFlowSchema();
    const url = new URL(request.url);
    const id = url.searchParams.get('id')?.trim() || '';
    if (!id) {
      return NextResponse.json({ error: 'id_required' }, { status: 400 });
    }

    const workspaceId = await resolveWorkspaceId(request);
    const resolved = await resolveStrictUserWorkspace({
      userId,
      preferredWorkspaceId: workspaceId,
      email: session?.user?.email ?? null,
    });
    if (!resolved.ok) {
      return NextResponse.json(
        { error: resolved.error },
        { status: resolved.status }
      );
    }

    await sql`
      DELETE FROM public.automation_flows
      WHERE id = ${id} AND workspace_id = ${resolved.workspaceId}
    `;
    return NextResponse.json({ ok: true, deleted: id });
  } catch (error) {
    console.error('[api/admin/inbox/flows] DELETE', error);
    return NextResponse.json(
      { error: 'flow_delete_failed' },
      { status: 500 }
    );
  }
}

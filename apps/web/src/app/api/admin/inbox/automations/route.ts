/**
 * GET/POST/DELETE /api/admin/inbox/automations
 * Manage Comment-to-DM rules for the active workspace.
 */

import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
} from '@/lib/social/persist';
import { ensureDmAutomationsSchema } from '@/lib/dm-automations/schema';

function parseKeywords(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input
      .map((k) => String(k).trim().replace(/^#+/, ''))
      .filter(Boolean);
  }
  if (typeof input === 'string') {
    return input
      .split(/[,;\n]+/)
      .map((k) => k.trim().replace(/^#+/, ''))
      .filter(Boolean);
  }
  return [];
}

async function resolveWorkspaceId(
  request: Request,
  bodyWorkspaceId?: unknown
): Promise<string | null> {
  const jar = await cookies();
  return (
    (typeof bodyWorkspaceId === 'string' && bodyWorkspaceId.trim()) ||
    new URL(request.url).searchParams.get('workspaceId')?.trim() ||
    request.headers.get('x-workspace-id')?.trim() ||
    request.headers.get('x-active-workspace-id')?.trim() ||
    jar.get(ACTIVE_WORKSPACE_COOKIE)?.value ||
    jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value ||
    null
  );
}

function mapRule(row: Record<string, unknown>) {
  return {
    id: Number(row.id),
    workspaceId: String(row.workspace_id),
    title: String(row.title || 'Comment-to-DM rule'),
    triggerKeywords: Array.isArray(row.trigger_keywords)
      ? (row.trigger_keywords as string[]).map(String)
      : [],
    dmMessageText: String(row.dm_message_text || ''),
    ctaButtonLabel:
      row.cta_button_label != null ? String(row.cta_button_label) : '',
    ctaButtonUrl: row.cta_button_url != null ? String(row.cta_button_url) : '',
    replyToCommentPublicly: Boolean(row.reply_to_comment_publicly),
    publicCommentText:
      row.public_comment_text != null ? String(row.public_comment_text) : '',
    isActive: Boolean(row.is_active),
    totalDmsSent: Number(row.total_dms_sent) || 0,
    storefrontClicks: Number(row.storefront_clicks) || 0,
    createdAt: row.created_at
      ? new Date(String(row.created_at)).toISOString()
      : null,
    updatedAt: row.updated_at
      ? new Date(String(row.updated_at)).toISOString()
      : null,
  };
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workspaceId = await resolveWorkspaceId(request);
  if (!workspaceId) {
    return Response.json({
      ok: true,
      automations: [],
      kpis: {
        activeTriggers: 0,
        dmsSentThisMonth: 0,
        storefrontClicks: 0,
        conversionRate: 0,
      },
      message: 'Select a workspace',
    });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json({
      ok: true,
      automations: [],
      kpis: {
        activeTriggers: 0,
        dmsSentThisMonth: 0,
        storefrontClicks: 0,
        conversionRate: 0,
      },
      demo: true,
    });
  }

  await ensureDmAutomationsSchema();

  const rows = await sql`
    SELECT *
    FROM public.dm_automations
    WHERE workspace_id = ${workspaceId}
    ORDER BY updated_at DESC, id DESC
  `;

  const automations = (Array.isArray(rows) ? rows : []).map((r) =>
    mapRule(r as Record<string, unknown>)
  );

  const monthStats = await sql`
    SELECT COUNT(*)::int AS dms
    FROM public.dm_logs
    WHERE workspace_id = ${workspaceId}
      AND status = 'sent'
      AND created_at >= date_trunc('month', now())
  `;
  const clicksRow = await sql`
    SELECT COALESCE(SUM(storefront_clicks), 0)::int AS clicks
    FROM public.dm_automations
    WHERE workspace_id = ${workspaceId}
  `;

  const dmsSentThisMonth = Number(monthStats?.[0]?.dms) || 0;
  const storefrontClicks = Number(clicksRow?.[0]?.clicks) || 0;
  const activeTriggers = automations.filter((a) => a.isActive).length;
  const conversionRate =
    dmsSentThisMonth > 0
      ? Math.round((storefrontClicks / dmsSentThisMonth) * 1000) / 10
      : 0;

  return Response.json({
    ok: true,
    workspaceId,
    automations,
    kpis: {
      activeTriggers,
      dmsSentThisMonth,
      storefrontClicks,
      conversionRate,
    },
  });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const workspaceId = await resolveWorkspaceId(request, body.workspaceId);
  if (!workspaceId) {
    return Response.json({ error: 'workspaceId required' }, { status: 400 });
  }
  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json({ error: 'DATABASE_URL required' }, { status: 503 });
  }

  await ensureDmAutomationsSchema();

  const keywords = parseKeywords(
    body.triggerKeywords ?? body.trigger_keywords
  );
  if (keywords.length === 0) {
    return Response.json(
      { error: 'At least one trigger keyword is required' },
      { status: 400 }
    );
  }

  const title =
    String(body.title ?? '').trim() ||
    `Trigger: ${keywords.slice(0, 3).join(', ').toUpperCase()}`;
  const dmMessageText = String(
    body.dmMessageText ?? body.dm_message_text ?? ''
  ).trim();
  if (!dmMessageText) {
    return Response.json(
      { error: 'Direct message text is required' },
      { status: 400 }
    );
  }

  const ctaButtonLabel = String(
    body.ctaButtonLabel ?? body.cta_button_label ?? 'Öppna länk'
  ).trim();
  const ctaButtonUrl = String(
    body.ctaButtonUrl ?? body.cta_button_url ?? ''
  ).trim();
  const replyToCommentPublicly = Boolean(
    body.replyToCommentPublicly ?? body.reply_to_comment_publicly
  );
  const publicCommentText = String(
    body.publicCommentText ?? body.public_comment_text ?? 'Kolla din DM!'
  ).trim();
  const isActive =
    body.isActive === undefined && body.is_active === undefined
      ? true
      : Boolean(body.isActive ?? body.is_active);

  const idRaw = body.id ?? body.automationId;
  const id =
    idRaw != null && String(idRaw).trim() !== ''
      ? Number(idRaw)
      : null;

  let rows: Record<string, unknown>[] = [];

  // Serialize keywords for pg text[] via JSON → array cast (safe for Pool.query).
  const keywordsJson = JSON.stringify(keywords);

  if (id != null && !Number.isNaN(id)) {
    rows = (await sql`
      UPDATE public.dm_automations
      SET
        title = ${title},
        trigger_keywords = (
          SELECT COALESCE(array_agg(value), '{}'::text[])
          FROM jsonb_array_elements_text(${keywordsJson}::jsonb) AS value
        ),
        dm_message_text = ${dmMessageText},
        cta_button_label = ${ctaButtonLabel || null},
        cta_button_url = ${ctaButtonUrl || null},
        reply_to_comment_publicly = ${replyToCommentPublicly},
        public_comment_text = ${publicCommentText || null},
        is_active = ${isActive},
        updated_at = now()
      WHERE id = ${id}
        AND workspace_id = ${workspaceId}
      RETURNING *
    `) as Record<string, unknown>[];
  } else {
    rows = (await sql`
      INSERT INTO public.dm_automations (
        workspace_id, user_id, title, trigger_keywords,
        dm_message_text, cta_button_label, cta_button_url,
        reply_to_comment_publicly, public_comment_text, is_active
      ) VALUES (
        ${workspaceId},
        ${session.user.id},
        ${title},
        (
          SELECT COALESCE(array_agg(value), '{}'::text[])
          FROM jsonb_array_elements_text(${keywordsJson}::jsonb) AS value
        ),
        ${dmMessageText},
        ${ctaButtonLabel || null},
        ${ctaButtonUrl || null},
        ${replyToCommentPublicly},
        ${publicCommentText || null},
        ${isActive}
      )
      RETURNING *
    `) as Record<string, unknown>[];
  }

  const row = rows?.[0];
  if (!row) {
    return Response.json({ error: 'save_failed' }, { status: 500 });
  }

  return Response.json({
    ok: true,
    automation: mapRule(row),
  });
}

export async function DELETE(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  let body: { id?: unknown; workspaceId?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const workspaceId = await resolveWorkspaceId(request, body.workspaceId);
  const id = Number(body.id ?? url.searchParams.get('id'));
  if (!workspaceId || !id || Number.isNaN(id)) {
    return Response.json(
      { error: 'id and workspaceId required' },
      { status: 400 }
    );
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json({ error: 'DATABASE_URL required' }, { status: 503 });
  }

  await ensureDmAutomationsSchema();
  await sql`
    DELETE FROM public.dm_automations
    WHERE id = ${id}
      AND workspace_id = ${workspaceId}
  `;

  return Response.json({ ok: true, deleted: id });
}

/** PATCH-style toggle via POST with { id, isActive } only — handled above.
 * Extra DELETE-friendly GET query already covered. */

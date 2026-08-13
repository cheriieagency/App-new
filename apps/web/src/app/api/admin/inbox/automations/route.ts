/**
 * GET/POST/DELETE /api/admin/inbox/automations
 * Manage Comment-to-DM rules for the active workspace.
 */

import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
} from '@/lib/social/persist';
import {
  ensureDmAutomationsSchema,
  getDmAutomationCtaColumns,
} from '@/lib/dm-automations/schema';

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

const CTA_FALLBACK = 'Öppna Storefront';

function emptyAutomationsResponse(extra?: Record<string, unknown>) {
  return NextResponse.json({
    ok: true,
    automations: [],
    kpis: {
      activeTriggers: 0,
      dmsSentThisMonth: 0,
      storefrontClicks: 0,
      conversionRate: 0,
    },
    ...extra,
  });
}

function mapRule(row: Record<string, unknown>) {
  // Prefer either CTA column; never crash if one/both are missing or null.
  const rawTitle =
    row.cta_button_title != null ? String(row.cta_button_title).trim() : '';
  const rawLabel =
    row.cta_button_label != null ? String(row.cta_button_label).trim() : '';
  const ctaTitle = rawTitle || rawLabel || CTA_FALLBACK;

  let triggerKeywords: string[] = [];
  try {
    if (Array.isArray(row.trigger_keywords)) {
      triggerKeywords = (row.trigger_keywords as unknown[]).map(String);
    } else if (typeof row.trigger_keywords === 'string') {
      triggerKeywords = parseKeywords(row.trigger_keywords);
    }
  } catch {
    triggerKeywords = [];
  }

  return {
    id: Number(row.id),
    workspaceId: String(row.workspace_id ?? ''),
    title: String(row.title || 'New DM Automation'),
    triggerKeywords,
    dmMessageText: String(row.dm_message_text || ''),
    ctaButtonTitle: ctaTitle,
    ctaButtonLabel: ctaTitle,
    cta_button_title: ctaTitle,
    cta_button_label: ctaTitle,
    ctaButtonUrl: row.cta_button_url != null ? String(row.cta_button_url) : '',
    replyToCommentPublicly: Boolean(row.reply_to_comment_publicly),
    publicCommentText:
      row.public_comment_text != null ? String(row.public_comment_text) : '',
    isActive: row.is_active === undefined ? true : Boolean(row.is_active),
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
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = await resolveWorkspaceId(request);
    if (!workspaceId) {
      return emptyAutomationsResponse({ message: 'Select a workspace' });
    }

    if (!process.env.DATABASE_URL?.trim()) {
      return emptyAutomationsResponse({ demo: true, workspaceId });
    }

    // Schema ensure is best-effort — never 500 the list endpoint.
    try {
      await ensureDmAutomationsSchema();
    } catch (schemaErr) {
      console.warn('[GET automations] schema ensure skipped', schemaErr);
    }

    let rows: unknown[] = [];
    try {
      rows = await sql`
        SELECT *
        FROM public.dm_automations
        WHERE workspace_id = ${workspaceId}
        ORDER BY updated_at DESC NULLS LAST, id DESC
      `;
    } catch (queryErr) {
      console.warn('[GET automations] query failed', queryErr);
      return emptyAutomationsResponse({ workspaceId });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return emptyAutomationsResponse({ workspaceId });
    }

    const automations = rows.map((r) =>
      mapRule(r as Record<string, unknown>)
    );

    let dmsSentThisMonth = 0;
    let storefrontClicks = 0;
    try {
      const monthStats = await sql`
        SELECT COUNT(*)::int AS dms
        FROM public.dm_logs
        WHERE workspace_id = ${workspaceId}
          AND status = 'sent'
          AND created_at >= date_trunc('month', now())
      `;
      dmsSentThisMonth = Number(monthStats?.[0]?.dms) || 0;
    } catch {
      dmsSentThisMonth = 0;
    }
    try {
      storefrontClicks = automations.reduce(
        (sum, a) => sum + (Number(a.storefrontClicks) || 0),
        0
      );
    } catch {
      storefrontClicks = 0;
    }

    const activeTriggers = automations.filter((a) => a.isActive).length;
    const conversionRate =
      dmsSentThisMonth > 0
        ? Math.round((storefrontClicks / dmsSentThisMonth) * 1000) / 10
        : 0;

    return NextResponse.json({
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
  } catch (err) {
    // Spec: never surface a 500 for list — empty list with 200 OK.
    console.error('[GET /api/admin/inbox/automations]', err);
    return emptyAutomationsResponse();
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Safely parse JSON body — never throw on empty/invalid payloads.
    let body: Record<string, unknown> = {};
    try {
      const raw = await request.text();
      body = raw.trim()
        ? (JSON.parse(raw) as Record<string, unknown>)
        : {};
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const workspaceId = await resolveWorkspaceId(
      request,
      body.workspaceId ?? body.workspace_id
    );
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId required' },
        { status: 400 }
      );
    }
    if (!process.env.DATABASE_URL?.trim()) {
      return NextResponse.json(
        { error: 'DATABASE_URL required' },
        { status: 503 }
      );
    }

    try {
      await ensureDmAutomationsSchema();
    } catch (schemaErr) {
      console.warn('[POST automations] schema ensure', schemaErr);
    }

    const keywords = parseKeywords(
      body.triggerKeywords ?? body.trigger_keywords
    );
    if (keywords.length === 0) {
      return NextResponse.json(
        { error: 'At least one trigger keyword is required' },
        { status: 400 }
      );
    }

    const title =
      String(body.title ?? '').trim() || 'New DM Automation';
    const dmMessageText = String(
      body.dmMessageText ?? body.dm_message_text ?? ''
    ).trim();
    if (!dmMessageText) {
      return NextResponse.json(
        { error: 'Direct message text is required' },
        { status: 400 }
      );
    }

    // Accept all CTA aliases from the client / older payloads.
    const label =
      String(
        body.ctaButtonLabel ||
          body.cta_button_label ||
          body.ctaButtonTitle ||
          body.cta_button_title ||
          CTA_FALLBACK
      ).trim() || CTA_FALLBACK;

    const ctaButtonUrl = String(
      body.ctaButtonUrl ?? body.cta_button_url ?? ''
    ).trim();
    const replyToCommentPublicly = Boolean(
      body.replyToCommentPublicly ?? body.reply_to_comment_publicly
    );
    const publicCommentText = String(
      body.publicCommentText ?? body.public_comment_text ?? ''
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

    // Serialize keywords for pg text[] via JSON → array cast (safe for Pool.query).
    const keywordsJson = JSON.stringify(keywords);
    let ctaCols = { hasLabel: true, hasTitle: true };
    try {
      ctaCols = await getDmAutomationCtaColumns();
    } catch {
      ctaCols = { hasLabel: true, hasTitle: true };
    }

    let rows: Record<string, unknown>[] = [];

    if (id != null && !Number.isNaN(id)) {
      rows = await updateAutomationRow({
        id,
        workspaceId,
        title,
        keywordsJson,
        dmMessageText,
        label,
        ctaButtonUrl,
        replyToCommentPublicly,
        publicCommentText,
        isActive,
        ctaCols,
      });
    } else {
      rows = await insertAutomationRow({
        workspaceId,
        userId: session.user.id,
        title,
        keywordsJson,
        dmMessageText,
        label,
        ctaButtonUrl,
        replyToCommentPublicly,
        publicCommentText,
        isActive,
        ctaCols,
      });
    }

    const data = rows ?? [];
    const row = data[0];
    if (!row) {
      return NextResponse.json(
        { error: 'save_failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      automation: mapRule(row),
    });
  } catch (err) {
    console.error('[POST /api/admin/inbox/automations]', err);
    const message =
      err instanceof Error ? err.message : 'Failed to save automation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function insertAutomationRow(input: {
  workspaceId: string;
  userId: string;
  title: string;
  keywordsJson: string;
  dmMessageText: string;
  label: string;
  ctaButtonUrl: string;
  replyToCommentPublicly: boolean;
  publicCommentText: string;
  isActive: boolean;
  ctaCols: { hasLabel: boolean; hasTitle: boolean };
}): Promise<Record<string, unknown>[]> {
  const {
    workspaceId,
    userId,
    title,
    keywordsJson,
    dmMessageText,
    label,
    ctaButtonUrl,
    replyToCommentPublicly,
    publicCommentText,
    isActive,
    ctaCols,
  } = input;

  // Prefer writing both columns when present; fall back if one is missing.
  const attempts: Array<() => Promise<Record<string, unknown>[]>> = [];

  if (ctaCols.hasLabel && ctaCols.hasTitle) {
    attempts.push(
      () =>
        sql`
          INSERT INTO public.dm_automations (
            workspace_id, user_id, title, trigger_keywords,
            dm_message_text, cta_button_label, cta_button_title, cta_button_url,
            reply_to_comment_publicly, public_comment_text, is_active
          ) VALUES (
            ${workspaceId},
            ${userId},
            ${title},
            (
              SELECT COALESCE(array_agg(value), '{}'::text[])
              FROM jsonb_array_elements_text(${keywordsJson}::jsonb) AS value
            ),
            ${dmMessageText},
            ${label},
            ${label},
            ${ctaButtonUrl || null},
            ${replyToCommentPublicly},
            ${publicCommentText || null},
            ${isActive}
          )
          RETURNING *
        ` as Promise<Record<string, unknown>[]>
    );
  }
  if (ctaCols.hasTitle) {
    attempts.push(
      () =>
        sql`
          INSERT INTO public.dm_automations (
            workspace_id, user_id, title, trigger_keywords,
            dm_message_text, cta_button_title, cta_button_url,
            reply_to_comment_publicly, public_comment_text, is_active
          ) VALUES (
            ${workspaceId},
            ${userId},
            ${title},
            (
              SELECT COALESCE(array_agg(value), '{}'::text[])
              FROM jsonb_array_elements_text(${keywordsJson}::jsonb) AS value
            ),
            ${dmMessageText},
            ${label},
            ${ctaButtonUrl || null},
            ${replyToCommentPublicly},
            ${publicCommentText || null},
            ${isActive}
          )
          RETURNING *
        ` as Promise<Record<string, unknown>[]>
    );
  }
  if (ctaCols.hasLabel) {
    attempts.push(
      () =>
        sql`
          INSERT INTO public.dm_automations (
            workspace_id, user_id, title, trigger_keywords,
            dm_message_text, cta_button_label, cta_button_url,
            reply_to_comment_publicly, public_comment_text, is_active
          ) VALUES (
            ${workspaceId},
            ${userId},
            ${title},
            (
              SELECT COALESCE(array_agg(value), '{}'::text[])
              FROM jsonb_array_elements_text(${keywordsJson}::jsonb) AS value
            ),
            ${dmMessageText},
            ${label},
            ${ctaButtonUrl || null},
            ${replyToCommentPublicly},
            ${publicCommentText || null},
            ${isActive}
          )
          RETURNING *
        ` as Promise<Record<string, unknown>[]>
    );
  }
  // Last resort: omit CTA text columns entirely.
  attempts.push(
    () =>
      sql`
        INSERT INTO public.dm_automations (
          workspace_id, user_id, title, trigger_keywords,
          dm_message_text, cta_button_url,
          reply_to_comment_publicly, public_comment_text, is_active
        ) VALUES (
          ${workspaceId},
          ${userId},
          ${title},
          (
            SELECT COALESCE(array_agg(value), '{}'::text[])
            FROM jsonb_array_elements_text(${keywordsJson}::jsonb) AS value
          ),
          ${dmMessageText},
          ${ctaButtonUrl || null},
          ${replyToCommentPublicly},
          ${publicCommentText || null},
          ${isActive}
        )
        RETURNING *
      ` as Promise<Record<string, unknown>[]>
  );

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      const rows = await attempt();
      if (Array.isArray(rows) && rows[0]) return rows;
    } catch (error) {
      lastError = error;
      const msg = error instanceof Error ? error.message : '';
      if (!/column .* does not exist/i.test(msg)) throw error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('Failed to insert automation');
}

async function updateAutomationRow(input: {
  id: number;
  workspaceId: string;
  title: string;
  keywordsJson: string;
  dmMessageText: string;
  label: string;
  ctaButtonUrl: string;
  replyToCommentPublicly: boolean;
  publicCommentText: string;
  isActive: boolean;
  ctaCols: { hasLabel: boolean; hasTitle: boolean };
}): Promise<Record<string, unknown>[]> {
  const {
    id,
    workspaceId,
    title,
    keywordsJson,
    dmMessageText,
    label,
    ctaButtonUrl,
    replyToCommentPublicly,
    publicCommentText,
    isActive,
    ctaCols,
  } = input;

  const attempts: Array<() => Promise<Record<string, unknown>[]>> = [];

  if (ctaCols.hasLabel && ctaCols.hasTitle) {
    attempts.push(
      () =>
        sql`
          UPDATE public.dm_automations
          SET
            title = ${title},
            trigger_keywords = (
              SELECT COALESCE(array_agg(value), '{}'::text[])
              FROM jsonb_array_elements_text(${keywordsJson}::jsonb) AS value
            ),
            dm_message_text = ${dmMessageText},
            cta_button_label = ${label},
            cta_button_title = ${label},
            cta_button_url = ${ctaButtonUrl || null},
            reply_to_comment_publicly = ${replyToCommentPublicly},
            public_comment_text = ${publicCommentText || null},
            is_active = ${isActive},
            updated_at = now()
          WHERE id = ${id}
            AND workspace_id = ${workspaceId}
          RETURNING *
        ` as Promise<Record<string, unknown>[]>
    );
  }
  if (ctaCols.hasTitle) {
    attempts.push(
      () =>
        sql`
          UPDATE public.dm_automations
          SET
            title = ${title},
            trigger_keywords = (
              SELECT COALESCE(array_agg(value), '{}'::text[])
              FROM jsonb_array_elements_text(${keywordsJson}::jsonb) AS value
            ),
            dm_message_text = ${dmMessageText},
            cta_button_title = ${label},
            cta_button_url = ${ctaButtonUrl || null},
            reply_to_comment_publicly = ${replyToCommentPublicly},
            public_comment_text = ${publicCommentText || null},
            is_active = ${isActive},
            updated_at = now()
          WHERE id = ${id}
            AND workspace_id = ${workspaceId}
          RETURNING *
        ` as Promise<Record<string, unknown>[]>
    );
  }
  if (ctaCols.hasLabel) {
    attempts.push(
      () =>
        sql`
          UPDATE public.dm_automations
          SET
            title = ${title},
            trigger_keywords = (
              SELECT COALESCE(array_agg(value), '{}'::text[])
              FROM jsonb_array_elements_text(${keywordsJson}::jsonb) AS value
            ),
            dm_message_text = ${dmMessageText},
            cta_button_label = ${label},
            cta_button_url = ${ctaButtonUrl || null},
            reply_to_comment_publicly = ${replyToCommentPublicly},
            public_comment_text = ${publicCommentText || null},
            is_active = ${isActive},
            updated_at = now()
          WHERE id = ${id}
            AND workspace_id = ${workspaceId}
          RETURNING *
        ` as Promise<Record<string, unknown>[]>
    );
  }
  attempts.push(
    () =>
      sql`
        UPDATE public.dm_automations
        SET
          title = ${title},
          trigger_keywords = (
            SELECT COALESCE(array_agg(value), '{}'::text[])
            FROM jsonb_array_elements_text(${keywordsJson}::jsonb) AS value
          ),
          dm_message_text = ${dmMessageText},
          cta_button_url = ${ctaButtonUrl || null},
          reply_to_comment_publicly = ${replyToCommentPublicly},
          public_comment_text = ${publicCommentText || null},
          is_active = ${isActive},
          updated_at = now()
        WHERE id = ${id}
          AND workspace_id = ${workspaceId}
        RETURNING *
      ` as Promise<Record<string, unknown>[]>
  );

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      const rows = await attempt();
      if (Array.isArray(rows) && rows[0]) return rows;
    } catch (error) {
      lastError = error;
      const msg = error instanceof Error ? error.message : '';
      if (!/column .* does not exist/i.test(msg)) throw error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('Failed to update automation');
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

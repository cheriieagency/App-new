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
import { cleanTriggerKeywords } from '@/lib/dm-automations/keywords';
import { resolveStrictUserWorkspace } from '@/lib/social/resolve-user-workspace';

function parseKeywords(input: unknown): string[] {
  return cleanTriggerKeywords(input);
}

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
    triggerKeywords = parseKeywords(row.trigger_keywords);
  } catch {
    triggerKeywords = [];
  }

  return {
    // Keep as string — live DB uses uuid; Number(uuid) → NaN.
    id: String(row.id ?? ''),
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
      : row.updated_at
        ? new Date(String(row.updated_at)).toISOString()
        : null,
    updatedAt: row.updated_at
      ? new Date(String(row.updated_at)).toISOString()
      : row.created_at
        ? new Date(String(row.created_at)).toISOString()
        : null,
  };
}

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id?.trim();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preferredWorkspaceId = await resolveWorkspaceId(request);
    if (!preferredWorkspaceId) {
      return emptyAutomationsResponse({ message: 'Select a workspace' });
    }

    const access = await resolveStrictUserWorkspace({
      userId,
      preferredWorkspaceId,
      email: session?.user?.email ?? null,
    });
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, automations: [] },
        { status: access.status === 400 ? 400 : 403 }
      );
    }
    const workspaceId = access.workspaceId;

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
      // Strict: workspace must be owned by session user.
      rows = await sql`
        SELECT *
        FROM public.dm_automations
        WHERE workspace_id = ${workspaceId}
          AND workspace_id IN (
            SELECT id FROM public.workspaces WHERE user_id = ${userId}
          )
        ORDER BY id DESC
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
          AND workspace_id IN (
            SELECT id FROM public.workspaces WHERE user_id = ${userId}
          )
          AND status IN ('sent', 'delivered')
          AND COALESCE(created_at, sent_at, to_timestamp(0)) >= date_trunc('month', now())
      `;
      dmsSentThisMonth = Number(monthStats?.[0]?.dms) || 0;
    } catch {
      try {
        const fallback = await sql`
          SELECT COUNT(*)::int AS dms
          FROM public.dm_logs
          WHERE workspace_id = ${workspaceId}
            AND workspace_id IN (
              SELECT id FROM public.workspaces WHERE user_id = ${userId}
            )
            AND status IN ('sent', 'delivered')
        `;
        dmsSentThisMonth = Number(fallback?.[0]?.dms) || 0;
      } catch {
        dmsSentThisMonth = 0;
      }
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
    const userId = session?.user?.id?.trim();
    if (!userId) {
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

    const preferredWorkspaceId = await resolveWorkspaceId(
      request,
      body.workspaceId ?? body.workspace_id
    );
    if (!preferredWorkspaceId) {
      return NextResponse.json(
        { error: 'workspaceId required' },
        { status: 400 }
      );
    }

    const access = await resolveStrictUserWorkspace({
      userId,
      preferredWorkspaceId,
      email: session?.user?.email ?? null,
    });
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }
    const workspaceId = access.workspaceId;

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

    // Persist cleaned lowercase keywords, e.g. ['mer', 'kurs', 'masterclass'].
    console.log('[automations] cleaned trigger_keywords', {
      workspaceId,
      keywords,
    });

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
    // Default active when omitted (create + toggle-safe).
    const isActive =
      body.isActive === undefined && body.is_active === undefined
        ? true
        : Boolean(body.isActive ?? body.is_active);

    const idRaw = body.id ?? body.automationId;
    const id =
      idRaw != null &&
      String(idRaw).trim() !== '' &&
      String(idRaw).trim() !== 'NaN' &&
      String(idRaw).trim() !== 'undefined'
        ? String(idRaw).trim()
        : null;

    // Always persist cleaned keywords: strip #, trim, lowercase.
    // Example stored value: ['mer', 'kurs', 'masterclass']
    const keywordsJson = JSON.stringify(keywords);
    let ctaCols = { hasLabel: true, hasTitle: true };
    try {
      ctaCols = await getDmAutomationCtaColumns();
    } catch {
      ctaCols = { hasLabel: true, hasTitle: true };
    }

    let rows: Record<string, unknown>[] = [];

    if (id) {
      rows = await updateAutomationRow({
        id,
        workspaceId: access.workspaceId,
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
      });
    } else {
      rows = await insertAutomationRow({
        workspaceId: access.workspaceId,
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
  id: string;
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
    id,
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
            AND workspace_id IN (
              SELECT id FROM public.workspaces WHERE user_id = ${userId}
            )
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
            AND workspace_id IN (
              SELECT id FROM public.workspaces WHERE user_id = ${userId}
            )
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
            AND workspace_id IN (
              SELECT id FROM public.workspaces WHERE user_id = ${userId}
            )
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
          AND workspace_id IN (
            SELECT id FROM public.workspaces WHERE user_id = ${userId}
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
    : new Error('Failed to update automation');
}

/**
 * PATCH — toggle is_active (and optional lightweight field updates).
 * Body: { id, workspaceId, isActive } — keywords optional when only toggling.
 */
export async function PATCH(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id?.trim();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: Record<string, unknown> = {};
    try {
      const raw = await request.text();
      body = raw.trim() ? (JSON.parse(raw) as Record<string, unknown>) : {};
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const preferredWorkspaceId = await resolveWorkspaceId(
      request,
      body.workspaceId ?? body.workspace_id
    );
    if (!preferredWorkspaceId) {
      return NextResponse.json(
        { error: 'workspaceId required' },
        { status: 400 }
      );
    }

    const access = await resolveStrictUserWorkspace({
      userId,
      preferredWorkspaceId,
      email: session?.user?.email ?? null,
    });
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const idRaw = body.id ?? body.automationId;
    const id =
      idRaw != null &&
      String(idRaw).trim() !== '' &&
      String(idRaw).trim() !== 'NaN'
        ? String(idRaw).trim()
        : null;
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    if (!process.env.DATABASE_URL?.trim()) {
      return NextResponse.json(
        { error: 'DATABASE_URL required' },
        { status: 503 }
      );
    }

    try {
      await ensureDmAutomationsSchema();
    } catch {
      /* best-effort */
    }

    const hasIsActive =
      body.isActive !== undefined || body.is_active !== undefined;
    if (!hasIsActive) {
      return NextResponse.json(
        { error: 'isActive required for PATCH' },
        { status: 400 }
      );
    }
    const isActive = Boolean(body.isActive ?? body.is_active);

    // Optional keyword re-clean when provided with PATCH.
    const maybeKeywords = body.triggerKeywords ?? body.trigger_keywords;
    if (maybeKeywords !== undefined) {
      const keywords = parseKeywords(maybeKeywords);
      if (keywords.length === 0) {
        return NextResponse.json(
          { error: 'At least one trigger keyword is required' },
          { status: 400 }
        );
      }
      const keywordsJson = JSON.stringify(keywords);
      const rows = await sql`
        UPDATE public.dm_automations
        SET
          is_active = ${isActive},
          trigger_keywords = (
            SELECT COALESCE(array_agg(value), '{}'::text[])
            FROM jsonb_array_elements_text(${keywordsJson}::jsonb) AS value
          ),
          updated_at = now()
        WHERE id = ${id}
          AND workspace_id IN (
            SELECT id FROM public.workspaces WHERE user_id = ${userId}
          )
        RETURNING *
      `;
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row) {
        return NextResponse.json({ error: 'not_found' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        automation: mapRule(row as Record<string, unknown>),
      });
    }

    const rows = await sql`
      UPDATE public.dm_automations
      SET is_active = ${isActive}, updated_at = now()
      WHERE id = ${id}
        AND workspace_id IN (
          SELECT id FROM public.workspaces WHERE user_id = ${userId}
        )
      RETURNING *
    `;
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      automation: mapRule(row as Record<string, unknown>),
    });
  } catch (err) {
    console.error('[PATCH /api/admin/inbox/automations]', err);
    const message =
      err instanceof Error ? err.message : 'Failed to update automation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** PUT — full create/update (same as POST). */
export async function PUT(request: Request) {
  return POST(request);
}

export async function DELETE(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id?.trim();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');
    const workspaceHint =
      searchParams.get('workspaceId')?.trim() ||
      searchParams.get('workspace_id')?.trim() ||
      null;

    // HTTP DELETE usually has no body — parse JSON only as a fallback.
    let bodyWorkspace: unknown;
    if (!id || !workspaceHint) {
      try {
        const body = (await request.json()) as {
          id?: unknown;
          automationId?: unknown;
          workspaceId?: unknown;
          workspace_id?: unknown;
        };
        if (!id) {
          id =
            body?.id != null
              ? String(body.id)
              : body?.automationId != null
                ? String(body.automationId)
                : null;
        }
        bodyWorkspace = body?.workspaceId ?? body?.workspace_id;
      } catch {
        // Request body was empty
      }
    }

    // Guard against Number(uuid) → 'NaN' from older clients.
    if (
      !id ||
      typeof id !== 'string' ||
      id === 'NaN' ||
      id === 'undefined' ||
      !id.trim()
    ) {
      return NextResponse.json(
        { error: 'Valid UUID id is required' },
        { status: 400 }
      );
    }

    const ruleId = id.trim();
    const workspaceId =
      (await resolveWorkspaceId(request, bodyWorkspace)) || workspaceHint;

    if (!process.env.DATABASE_URL?.trim()) {
      return NextResponse.json(
        { error: 'DATABASE_URL required' },
        { status: 503 }
      );
    }

    if (workspaceId) {
      const access = await resolveStrictUserWorkspace({
        userId,
        preferredWorkspaceId: workspaceId,
        email: session?.user?.email ?? null,
      });
      if (!access.ok) {
        return NextResponse.json(
          { error: access.error },
          { status: access.status }
        );
      }
    }

    try {
      await ensureDmAutomationsSchema();
    } catch {
      /* best-effort */
    }

    // Delete only rules inside workspaces owned by this user.
    try {
      const deleted = workspaceId
        ? await sql`
            DELETE FROM public.dm_automations
            WHERE id = ${ruleId}
              AND workspace_id = ${workspaceId}
              AND workspace_id IN (
                SELECT id FROM public.workspaces WHERE user_id = ${userId}
              )
            RETURNING id
          `
        : await sql`
            DELETE FROM public.dm_automations
            WHERE id = ${ruleId}
              AND workspace_id IN (
                SELECT id FROM public.workspaces WHERE user_id = ${userId}
              )
            RETURNING id
          `;
      if (!Array.isArray(deleted) || deleted.length === 0) {
        return NextResponse.json({ error: 'not_found' }, { status: 404 });
      }
    } catch (dbErr) {
      return NextResponse.json(
        {
          error:
            dbErr instanceof Error ? dbErr.message : 'Failed to delete rule',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, deletedId: ruleId },
      { status: 200 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Server error',
      },
      { status: 500 }
    );
  }
}

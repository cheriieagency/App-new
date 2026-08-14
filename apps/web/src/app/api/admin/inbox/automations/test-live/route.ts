/**
 * GET/POST /api/admin/inbox/automations/test-live
 * Live Comment-to-DM diagnostic — validates IG token, webhooks, rules, payload shape.
 * POST with `{ liveCommentId }` also attempts a real Graph Private Reply (test dispatch).
 */

import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/app/api/utils/sql';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
} from '@/lib/social/persist';
import { ensureDmAutomationsSchema } from '@/lib/dm-automations/schema';
import {
  cleanTriggerKeywords,
  findMatchingKeyword,
} from '@/lib/dm-automations/keywords';
import { resolveStrictUserWorkspace } from '@/lib/social/resolve-user-workspace';
import {
  FACEBOOK_PAGE_SUBSCRIBED_FIELDS,
  isInstagramAccountId,
} from '@/lib/meta/subscribe-webhooks';

const GRAPH_V = 'v21.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_V}`;

export type DiagnosticStepId =
  | 'TOKEN_CHECK'
  | 'TOKEN_VALIDITY'
  | 'WEBHOOK_SUBSCRIPTION'
  | 'AUTOMATION_RULES'
  | 'PRIVATE_REPLY_PAYLOAD'
  | 'LIVE_PRIVATE_REPLY';

export type DiagnosticStep = {
  step: DiagnosticStepId;
  /** Checklist label for the UI. */
  label: string;
  success: boolean;
  message: string;
  fix?: string;
  metaError?: string | null;
  details?: Record<string, unknown>;
};

type ChecklistKey =
  | 'instagramTokenValid'
  | 'metaWebhooksSubscribed'
  | 'activeRulesFound'
  | 'privateReplyPayloadOk';

async function resolveWorkspaceId(
  request: Request,
  bodyWorkspaceId?: unknown
): Promise<string | null> {
  const jar = await cookies();
  const url = new URL(request.url);
  return (
    (typeof bodyWorkspaceId === 'string' && bodyWorkspaceId.trim()) ||
    url.searchParams.get('workspaceId')?.trim() ||
    url.searchParams.get('workspace_id')?.trim() ||
    request.headers.get('x-workspace-id')?.trim() ||
    request.headers.get('x-active-workspace-id')?.trim() ||
    jar.get(ACTIVE_WORKSPACE_COOKIE)?.value?.trim() ||
    jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value?.trim() ||
    null
  );
}

function step(
  partial: DiagnosticStep
): DiagnosticStep {
  return {
    metaError: null,
    ...partial,
  };
}

async function graphGet(
  pathOrUrl: string,
  accessToken: string,
  extraParams?: Record<string, string>
): Promise<{
  ok: boolean;
  status: number;
  json: Record<string, unknown>;
  errorMessage: string | null;
  errorCode: number | null;
}> {
  const url = pathOrUrl.startsWith('http')
    ? new URL(pathOrUrl)
    : new URL(`${GRAPH_BASE}/${pathOrUrl.replace(/^\//, '')}`);
  url.searchParams.set('access_token', accessToken);
  if (extraParams) {
    for (const [k, v] of Object.entries(extraParams)) {
      url.searchParams.set(k, v);
    }
  }

  try {
    const res = await fetch(url.toString(), { method: 'GET' });
    const json = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const err =
      json.error && typeof json.error === 'object'
        ? (json.error as { message?: string; code?: number })
        : null;
    const errorMessage =
      (err?.message && String(err.message)) ||
      (!res.ok ? `HTTP ${res.status}` : null);
    return {
      ok: res.ok && !err,
      status: res.status,
      json,
      errorMessage,
      errorCode: typeof err?.code === 'number' ? err.code : null,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      json: {},
      errorMessage:
        error instanceof Error ? error.message : 'Graph request failed',
      errorCode: null,
    };
  }
}

function buildPrivateReplyPayload(commentId: string, text: string) {
  return {
    recipient: { comment_id: commentId },
    message: { text },
  };
}

function validatePrivateReplyPayload(payload: unknown): {
  ok: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  if (!payload || typeof payload !== 'object') {
    return { ok: false, issues: ['Payload is not an object'] };
  }
  const p = payload as Record<string, unknown>;
  const recipient = p.recipient;
  const message = p.message;
  if (!recipient || typeof recipient !== 'object') {
    issues.push('Missing recipient object');
  } else {
    const r = recipient as Record<string, unknown>;
    if (!r.comment_id || typeof r.comment_id !== 'string') {
      issues.push('recipient.comment_id must be a string (not user id)');
    }
    if ('id' in r && !('comment_id' in r)) {
      issues.push(
        'recipient uses user id — Comment-to-DM must use comment_id'
      );
    }
  }
  if (!message || typeof message !== 'object') {
    issues.push('Missing message object');
  } else {
    const m = message as Record<string, unknown>;
    if (!m.text || typeof m.text !== 'string' || !String(m.text).trim()) {
      issues.push('message.text must be a non-empty string');
    }
  }
  return { ok: issues.length === 0, issues };
}

export type LivePrivateReplyResult = {
  attempted: boolean;
  httpStatus: number;
  ok: boolean;
  endpoint: string;
  igUserId: string;
  liveCommentId: string;
  payload: ReturnType<typeof buildPrivateReplyPayload>;
  metaResponse: Record<string, unknown>;
  metaError: string | null;
  metaErrorCode: number | null;
  statusLabel: string;
};

/**
 * Instagram comment ids are numeric Graph ids (commonly 178… / 179… / 180…).
 * Reject keywords like "marsterclass" before any live Graph dispatch.
 */
export function isValidInstagramCommentId(raw: unknown): boolean {
  const id = String(raw ?? '')
    .trim()
    .replace(/^["']+|["']+$/g, '');
  if (!id) return false;
  // Pure digits, typically 15–20+ chars; allow 10+ to be safe for shorter test ids.
  if (!/^\d{10,}$/.test(id)) return false;
  return true;
}

const INVALID_COMMENT_ID_MESSAGE =
  'Please enter a valid numeric Instagram Comment ID to send a live test Private Reply.';

async function sendLivePrivateReply(input: {
  igUserId: string;
  accessToken: string;
  liveCommentId: string;
  messageText: string;
}): Promise<LivePrivateReplyResult> {
  const igUserId = String(input.igUserId || '').trim();
  const liveCommentId = String(input.liveCommentId || '').trim();
  const messageText =
    String(input.messageText || '').trim() || 'Test automation reply';
  const endpoint = `${GRAPH_BASE}/${encodeURIComponent(igUserId || 'unknown')}/messages`;
  const payload = buildPrivateReplyPayload(
    isValidInstagramCommentId(liveCommentId) ? liveCommentId : 'INVALID',
    messageText
  );

  const empty = (httpStatus: number, metaError: string | null) =>
    ({
      attempted: true,
      httpStatus,
      ok: false,
      endpoint,
      igUserId,
      liveCommentId,
      payload,
      metaResponse: {},
      metaError,
      metaErrorCode: null,
      statusLabel: httpStatusLabel(httpStatus),
    }) satisfies LivePrivateReplyResult;

  if (!isValidInstagramCommentId(liveCommentId)) {
    return empty(400, INVALID_COMMENT_ID_MESSAGE);
  }
  if (!igUserId) {
    return empty(400, 'Missing Instagram Business Account id for /messages');
  }
  if (!input.accessToken?.trim()) {
    return empty(403, 'Missing access token for Private Reply');
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const metaResponse = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const err =
      metaResponse.error && typeof metaResponse.error === 'object'
        ? (metaResponse.error as {
            message?: string;
            code?: number;
            error_subcode?: number;
            type?: string;
            fbtrace_id?: string;
          })
        : null;
    const messageId =
      (typeof metaResponse.message_id === 'string' && metaResponse.message_id) ||
      (typeof metaResponse.id === 'string' && metaResponse.id) ||
      null;
    const ok = res.ok && Boolean(messageId) && !err;

    return {
      attempted: true,
      httpStatus: res.status,
      ok,
      endpoint,
      igUserId,
      liveCommentId,
      payload,
      metaResponse,
      metaError: err?.message ? String(err.message) : ok ? null : `HTTP ${res.status}`,
      metaErrorCode: typeof err?.code === 'number' ? err.code : null,
      statusLabel: httpStatusLabel(res.status),
    };
  } catch (error) {
    return {
      ...empty(0, error instanceof Error ? error.message : 'Network error'),
      statusLabel: 'NETWORK_ERROR',
    };
  }
}

function httpStatusLabel(status: number): string {
  if (status === 200) return '200 OK';
  if (status === 400) return '400';
  if (status === 403) return '403';
  if (status === 0) return 'NETWORK_ERROR';
  return String(status);
}

export type RecentIgComment = {
  id: string;
  text: string;
  username: string | null;
  createdTime: string | null;
  mediaId?: string | null;
};

type ConnectedIgAccount = {
  igUserId: string;
  accessToken: string;
  pageAccessToken: string;
  handle: string | null;
  pageId: string | null;
};

async function loadConnectedIgAccount(input: {
  workspaceId: string;
  userId: string;
}): Promise<ConnectedIgAccount | null> {
  try {
    const rows = await sql`
      SELECT platform, platform_user_id, page_id, access_token, handle, meta
      FROM public.social_accounts
      WHERE workspace_id = ${input.workspaceId}
        AND user_id = ${input.userId}
        AND platform IN ('instagram', 'facebook')
        AND access_token IS NOT NULL
        AND access_token <> ''
      ORDER BY
        CASE WHEN platform = 'instagram' THEN 0 ELSE 1 END,
        connected_at DESC NULLS LAST
    `;
    const list = Array.isArray(rows) ? rows : [];
    const ig = list.find(
      (r) => String(r.platform || '').toLowerCase() === 'instagram'
    );
    const fb = list.find(
      (r) => String(r.platform || '').toLowerCase() === 'facebook'
    );
    if (!ig) return null;

    const meta =
      ig.meta && typeof ig.meta === 'object'
        ? (ig.meta as Record<string, unknown>)
        : {};
    const pageTok =
      (typeof meta.page_access_token === 'string' &&
        meta.page_access_token.trim()) ||
      String(fb?.access_token || '').trim() ||
      String(ig.access_token || '').trim();

    return {
      igUserId: String(ig.platform_user_id || '').trim(),
      accessToken: String(ig.access_token || '').trim(),
      pageAccessToken: pageTok,
      handle: ig.handle != null ? String(ig.handle) : null,
      pageId:
        String(ig.page_id || fb?.page_id || fb?.platform_user_id || '').trim() ||
        null,
    };
  } catch (error) {
    console.warn('[automations/test-live] loadConnectedIgAccount', error);
    return null;
  }
}

/** Flatten recent media comments into a selectable list (newest first). */
async function fetchRecentInstagramComments(input: {
  igUserId: string;
  accessToken: string;
  limit?: number;
}): Promise<{
  success: boolean;
  comments: RecentIgComment[];
  error?: string;
  metaError?: unknown;
}> {
  const limit = Math.min(Math.max(input.limit ?? 5, 1), 10);
  const url = new URL(
    `${GRAPH_BASE}/${encodeURIComponent(input.igUserId)}/media`
  );
  url.searchParams.set(
    'fields',
    'id,caption,comments.limit(10){id,text,username,from,timestamp,created_time}'
  );
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('access_token', input.accessToken);

  try {
    const res = await fetch(url.toString());
    const json = (await res.json().catch(() => ({}))) as {
      data?: Array<{
        id?: string;
        comments?: {
          data?: Array<{
            id?: string;
            text?: string;
            username?: string;
            from?: { username?: string; id?: string };
            timestamp?: string;
            created_time?: string;
          }>;
        };
      }>;
      error?: { message?: string; code?: number };
    };

    if (!res.ok || json.error) {
      return {
        success: false,
        comments: [],
        error:
          json.error?.message ||
          `Failed to fetch Instagram media/comments (HTTP ${res.status})`,
        metaError: json.error || json,
      };
    }

    const comments: RecentIgComment[] = [];
    for (const media of json.data ?? []) {
      for (const c of media.comments?.data ?? []) {
        if (!c.id) continue;
        comments.push({
          id: String(c.id),
          text: String(c.text || ''),
          username:
            (c.username && String(c.username)) ||
            (c.from?.username && String(c.from.username)) ||
            null,
          createdTime:
            (c.timestamp && String(c.timestamp)) ||
            (c.created_time && String(c.created_time)) ||
            null,
          mediaId: media.id ? String(media.id) : null,
        });
      }
    }

    comments.sort((a, b) => {
      const ta = a.createdTime ? Date.parse(a.createdTime) : 0;
      const tb = b.createdTime ? Date.parse(b.createdTime) : 0;
      return tb - ta;
    });

    return {
      success: true,
      comments: comments.slice(0, limit),
    };
  } catch (error) {
    return {
      success: false,
      comments: [],
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

async function resolveLiveReplyMessage(input: {
  workspaceId: string;
  commentText?: string;
  explicitMessage?: string;
}): Promise<{ messageText: string; matchedRuleId: string | null; matchedKeyword: string | null }> {
  const fallback = 'Hej! Tack för din kommentar på Clikd.';
  if (input.explicitMessage?.trim()) {
    return {
      messageText: input.explicitMessage.trim(),
      matchedRuleId: null,
      matchedKeyword: null,
    };
  }

  try {
    const rows = await sql`
      SELECT id, dm_message_text, cta_button_url, trigger_keywords
      FROM public.dm_automations
      WHERE workspace_id = ${input.workspaceId}
        AND is_active = true
      ORDER BY id DESC
    `;
    const list = Array.isArray(rows) ? rows : [];
    const commentText = String(input.commentText || '').trim();

    for (const rule of list) {
      const keywords = cleanTriggerKeywords(rule.trigger_keywords);
      const kw = commentText
        ? findMatchingKeyword(commentText, keywords)
        : keywords[0] || null;
      if (!kw && commentText) continue;
      if (!kw && !commentText) {
        // No comment text — use first active rule body.
        const text = String(rule.dm_message_text || '').trim();
        const url = String(rule.cta_button_url || '').trim();
        const body = url ? `${text}\n\n${url}`.trim() : text;
        return {
          messageText: body || fallback,
          matchedRuleId: String(rule.id),
          matchedKeyword: null,
        };
      }
      if (kw) {
        const text = String(rule.dm_message_text || '').trim();
        const url = String(rule.cta_button_url || '').trim();
        const body = url ? `${text}\n\n${url}`.trim() : text;
        return {
          messageText: body || fallback,
          matchedRuleId: String(rule.id),
          matchedKeyword: kw,
        };
      }
    }

    if (list[0]) {
      const text = String(list[0].dm_message_text || '').trim();
      const url = String(list[0].cta_button_url || '').trim();
      const body = url ? `${text}\n\n${url}`.trim() : text;
      return {
        messageText: body || fallback,
        matchedRuleId: String(list[0].id),
        matchedKeyword: null,
      };
    }
  } catch (error) {
    console.warn('[automations/test-live] resolveLiveReplyMessage', error);
  }

  return { messageText: fallback, matchedRuleId: null, matchedKeyword: null };
}

async function handleFetchComments(request: Request): Promise<NextResponse> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id?.trim();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let bodyWorkspaceId: unknown;
  if (request.method === 'POST') {
    try {
      const body = (await request.json()) as { workspaceId?: unknown };
      bodyWorkspaceId = body.workspaceId;
    } catch {
      bodyWorkspaceId = undefined;
    }
  }

  const preferredWorkspaceId = await resolveWorkspaceId(
    request,
    bodyWorkspaceId
  );
  if (!preferredWorkspaceId) {
    return NextResponse.json(
      {
        success: false,
        comments: [],
        error: 'workspaceId required',
      },
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
      { success: false, comments: [], error: access.error },
      { status: access.status }
    );
  }

  const account = await loadConnectedIgAccount({
    workspaceId: access.workspaceId,
    userId,
  });
  if (!account?.igUserId || !account.accessToken) {
    return NextResponse.json({
      success: false,
      comments: [],
      error: 'No Instagram account connected for this workspace.',
      workspaceId: access.workspaceId,
    });
  }

  const result = await fetchRecentInstagramComments({
    igUserId: account.igUserId,
    accessToken: account.accessToken,
    limit: 5,
  });

  return NextResponse.json({
    success: result.success,
    comments: result.comments,
    error: result.error,
    metaError: result.metaError,
    workspaceId: access.workspaceId,
    account: {
      igUserId: account.igUserId,
      handle: account.handle,
    },
  });
}

async function runLiveDiagnostic(
  request: Request
): Promise<NextResponse> {
  const steps: DiagnosticStep[] = [];
  const suggestions: string[] = [];

  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id?.trim();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    workspaceId?: unknown;
    liveCommentId?: unknown;
    messageText?: unknown;
    message?: unknown;
    commentText?: unknown;
    action?: unknown;
  } = {};
  if (request.method === 'POST') {
    try {
      body = (await request.json()) as typeof body;
    } catch {
      body = {};
    }
  }

  const urlAction = new URL(request.url).searchParams.get('action')?.trim();
  const bodyAction =
    typeof body.action === 'string' ? body.action.trim() : '';
  if (urlAction === 'fetch_comments' || bodyAction === 'fetch_comments') {
    // Body already consumed on POST — re-run dedicated handler via cloned signals.
    // For POST we already have workspaceId on body; call inline logic.
    if (request.method === 'GET') {
      return handleFetchComments(request);
    }
    // POST path: reconstruct fetch using parsed body workspace.
    const preferredWorkspaceId = await resolveWorkspaceId(
      request,
      body.workspaceId
    );
    if (!preferredWorkspaceId) {
      return NextResponse.json(
        { success: false, comments: [], error: 'workspaceId required' },
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
        { success: false, comments: [], error: access.error },
        { status: access.status }
      );
    }
    const account = await loadConnectedIgAccount({
      workspaceId: access.workspaceId,
      userId,
    });
    if (!account?.igUserId || !account.accessToken) {
      return NextResponse.json({
        success: false,
        comments: [],
        error: 'No Instagram account connected for this workspace.',
        workspaceId: access.workspaceId,
      });
    }
    const result = await fetchRecentInstagramComments({
      igUserId: account.igUserId,
      accessToken: account.accessToken,
      limit: 5,
    });
    return NextResponse.json({
      success: result.success,
      comments: result.comments,
      error: result.error,
      metaError: result.metaError,
      workspaceId: access.workspaceId,
      account: { igUserId: account.igUserId, handle: account.handle },
    });
  }

  const liveCommentId =
    typeof body.liveCommentId === 'string' ? body.liveCommentId.trim() : '';
  const commentTextForMatch =
    typeof body.commentText === 'string' ? body.commentText.trim() : '';
  const explicitMessage =
    (typeof body.messageText === 'string' && body.messageText.trim()) ||
    (typeof body.message === 'string' && body.message.trim()) ||
    '';

  const preferredWorkspaceId = await resolveWorkspaceId(
    request,
    body.workspaceId
  );
  if (!preferredWorkspaceId) {
    return NextResponse.json(
      {
        ok: false,
        workspaceId: null,
        steps: [
          step({
            step: 'TOKEN_CHECK',
            label: 'Instagram account connected',
            success: false,
            message: 'workspaceId required',
            fix: 'Select an active workspace and retry.',
          }),
        ],
        checklist: {
          instagramTokenValid: false,
          metaWebhooksSubscribed: false,
          activeRulesFound: false,
          privateReplyPayloadOk: false,
        },
        suggestions: ['Select an active workspace and retry.'],
      },
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
      {
        ok: false,
        workspaceId: preferredWorkspaceId,
        error: access.error,
        steps: [
          step({
            step: 'TOKEN_CHECK',
            label: 'Instagram account connected',
            success: false,
            message: access.error,
            fix: 'Select a workspace you own and retry.',
          }),
        ],
        checklist: {
          instagramTokenValid: false,
          metaWebhooksSubscribed: false,
          activeRulesFound: false,
          privateReplyPayloadOk: false,
        },
        suggestions: ['Select a workspace you own and retry.'],
      },
      { status: access.status }
    );
  }
  const workspaceId = access.workspaceId;

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({
      ok: false,
      workspaceId,
      steps: [
        step({
          step: 'TOKEN_CHECK',
          label: 'Instagram account connected',
          success: false,
          message: 'DATABASE_URL missing',
          fix: 'Configure DATABASE_URL in .env.local',
        }),
      ],
      checklist: {
        instagramTokenValid: false,
        metaWebhooksSubscribed: false,
        activeRulesFound: false,
        privateReplyPayloadOk: false,
      },
      suggestions: ['Configure DATABASE_URL in .env.local'],
    });
  }

  try {
    await ensureDmAutomationsSchema();
  } catch (schemaErr) {
    console.warn('[automations/test-live] schema ensure', schemaErr);
  }

  // ── STEP 1: Instagram account for workspace ─────────────────────────────
  type AccountRow = {
    platform?: string;
    platform_user_id?: string;
    page_id?: string | null;
    access_token?: string;
    handle?: string | null;
    meta?: unknown;
  };

  let ig: AccountRow | null = null;
  let fbPage: AccountRow | null = null;
  try {
    const rows = await sql`
      SELECT platform, platform_user_id, page_id, access_token, handle, meta
      FROM public.social_accounts
      WHERE workspace_id = ${workspaceId}
        AND user_id = ${userId}
        AND platform IN ('instagram', 'facebook')
        AND access_token IS NOT NULL
        AND access_token <> ''
      ORDER BY
        CASE WHEN platform = 'instagram' THEN 0 ELSE 1 END,
        connected_at DESC NULLS LAST
    `;
    const list = Array.isArray(rows) ? (rows as AccountRow[]) : [];
    ig =
      list.find((r) => String(r.platform || '').toLowerCase() === 'instagram') ||
      null;
    fbPage =
      list.find((r) => String(r.platform || '').toLowerCase() === 'facebook') ||
      null;
  } catch (queryErr) {
    console.warn('[automations/test-live] social_accounts query', queryErr);
  }

  if (!ig) {
    steps.push(
      step({
        step: 'TOKEN_CHECK',
        label: 'Instagram account connected',
        success: false,
        message:
          'No Instagram account connected for this workspace.',
        fix: 'Connect Instagram in Settings → Socials, then re-run this diagnostic.',
      })
    );
    suggestions.push(
      'Connect Instagram Business in Settings → Socials for this workspace.'
    );

    // Still check rules + payload shape so the checklist is useful.
    const rulesOnly = await diagnoseRules(workspaceId, steps, suggestions);
    diagnosePayload(steps, suggestions);

    return NextResponse.json({
      ok: false,
      workspaceId,
      steps,
      checklist: buildChecklist(steps),
      rules: rulesOnly,
      suggestions,
      tokenScopes: null,
      account: null,
    });
  }

  const accessToken = String(ig.access_token || '').trim();
  const igUserId = String(ig.platform_user_id || '').trim();
  const pageIdFromIg = String(ig.page_id || '').trim();
  const pageIdFromFb = String(fbPage?.page_id || fbPage?.platform_user_id || '').trim();
  const pageAccessTokenFromMeta = (() => {
    const meta =
      ig.meta && typeof ig.meta === 'object'
        ? (ig.meta as Record<string, unknown>)
        : {};
    if (
      typeof meta.page_access_token === 'string' &&
      meta.page_access_token.trim()
    ) {
      return meta.page_access_token.trim();
    }
    return String(fbPage?.access_token || '').trim() || accessToken;
  })();
  const pageId = pageIdFromIg || pageIdFromFb;

  steps.push(
    step({
      step: 'TOKEN_CHECK',
      label: 'Instagram account connected',
      success: true,
      message: `Instagram connected${ig.handle ? ` (${ig.handle})` : ''} · id ${igUserId || 'unknown'}`,
      details: {
        handle: ig.handle || null,
        igUserId: igUserId || null,
        pageId: pageId || null,
        hasPageAccessToken: Boolean(pageAccessTokenFromMeta),
      },
    })
  );

  // ── STEP 2: Token validity via Graph /me ────────────────────────────────
  let tokenScopes: string[] | null = null;
  let tokenOk = false;
  let graphIdentity: Record<string, unknown> | null = null;

  const me = await graphGet('me', accessToken, {
    fields: 'id,name',
  });
  if (!me.ok) {
    steps.push(
      step({
        step: 'TOKEN_VALIDITY',
        label: 'Instagram Token Valid',
        success: false,
        message:
          'Meta Access Token expired or invalid. Please disconnect and reconnect in Settings → Socials.',
        metaError: me.errorMessage,
        fix: 'Disconnect Instagram in Settings → Socials, then reconnect and grant messaging + comments permissions.',
        details: { status: me.status, errorCode: me.errorCode },
      })
    );
    suggestions.push(
      'Reconnect Instagram (Settings → Socials) — token invalid/expired.'
    );
  } else {
    tokenOk = true;
    graphIdentity = {
      id: me.json.id ?? null,
      name: me.json.name ?? null,
    };
    // Debug token for scopes when app credentials exist.
    const appId = (process.env.META_APP_ID || '').trim();
    const appSecret = (process.env.META_APP_SECRET || '').trim();
    if (appId && appSecret) {
      const debug = await graphGet('debug_token', `${appId}|${appSecret}`, {
        input_token: accessToken,
      });
      const data =
        debug.json.data && typeof debug.json.data === 'object'
          ? (debug.json.data as Record<string, unknown>)
          : null;
      if (Array.isArray(data?.scopes)) {
        tokenScopes = data.scopes.map(String);
      } else if (Array.isArray(data?.granular_scopes)) {
        tokenScopes = (data.granular_scopes as Array<{ scope?: string }>)
          .map((g) => g.scope)
          .filter(Boolean) as string[];
      }
    }

    steps.push(
      step({
        step: 'TOKEN_VALIDITY',
        label: 'Instagram Token Valid',
        success: true,
        message: `Token accepted by Graph API${
          graphIdentity?.name ? ` as “${String(graphIdentity.name)}”` : ''
        }.`,
        details: {
          graphUserId: graphIdentity?.id ?? null,
          scopes: tokenScopes,
        },
      })
    );
  }

  // ── STEP 3: Webhook subscriptions (Page subscribed_apps) ────────────────
  // Meta requires Page id + Page Access Token — IG-scoped ids often Error #3.
  let webhookOk = false;
  if (!tokenOk) {
    steps.push(
      step({
        step: 'WEBHOOK_SUBSCRIPTION',
        label: 'Meta Webhooks Subscribed (comments, messages)',
        success: false,
        message: 'Skipped — token invalid.',
        fix: 'Fix token first, then click Re-sync Meta Webhooks.',
      })
    );
  } else {
    const subscribeTargetId = pageId || igUserId;
    const subscribeToken = pageId
      ? pageAccessTokenFromMeta || accessToken
      : accessToken;

    if (!subscribeTargetId) {
      steps.push(
        step({
          step: 'WEBHOOK_SUBSCRIPTION',
          label: 'Meta Webhooks Subscribed (comments, messages)',
          success: false,
          message: 'No Page id or Instagram id available to check subscribed_apps.',
          fix: 'Reconnect Instagram with a linked Facebook Page, then Re-sync Meta Webhooks.',
        })
      );
      suggestions.push(
        'Reconnect IG with a Facebook Page linked — webhooks subscribe at Page level.'
      );
    } else {
      const usingIgId = isInstagramAccountId('instagram', subscribeTargetId) && !pageId;
      const sub = await graphGet(
        `${encodeURIComponent(subscribeTargetId)}/subscribed_apps`,
        subscribeToken
      );

      const apps = Array.isArray(sub.json.data)
        ? (sub.json.data as Array<{
            id?: string;
            name?: string;
            subscribed_fields?: string[];
          }>)
        : [];
      const ourAppId = (process.env.META_APP_ID || '').trim();
      const matched = ourAppId
        ? apps.find((a) => String(a.id) === ourAppId)
        : apps[0];
      const fields = Array.isArray(matched?.subscribed_fields)
        ? matched!.subscribed_fields.map(String)
        : apps.flatMap((a) =>
            Array.isArray(a.subscribed_fields)
              ? a.subscribed_fields.map(String)
              : []
          );

      // Page fields: feed/messages/messaging_postbacks cover IG comments+DMs.
      // Also accept literal comments/messages if IG-scoped somehow works.
      const hasCommentsSignal =
        fields.includes('comments') ||
        fields.includes('feed') ||
        fields.includes('mention');
      const hasMessagesSignal =
        fields.includes('messages') ||
        fields.includes('messaging_postbacks') ||
        fields.includes('message_reactions');

      if (!sub.ok) {
        steps.push(
          step({
            step: 'WEBHOOK_SUBSCRIPTION',
            label: 'Meta Webhooks Subscribed (comments, messages)',
            success: false,
            message: usingIgId
              ? 'subscribed_apps failed on Instagram id — Meta expects the linked Facebook Page id + Page Access Token.'
              : 'Could not read subscribed_apps for this Page.',
            metaError: sub.errorMessage,
            fix: 'Click “Re-sync Meta Webhooks”, or reconnect Instagram so a Page Access Token is stored.',
            details: {
              targetId: subscribeTargetId,
              usingIgId,
              expectedPageFields: FACEBOOK_PAGE_SUBSCRIBED_FIELDS,
              status: sub.status,
              errorCode: sub.errorCode,
            },
          })
        );
        suggestions.push(
          'Use Re-sync Meta Webhooks (needs Page Access Token). IG-only tokens often fail subscribed_apps.'
        );
      } else if (!matched && apps.length === 0) {
        steps.push(
          step({
            step: 'WEBHOOK_SUBSCRIPTION',
            label: 'Meta Webhooks Subscribed (comments, messages)',
            success: false,
            message: 'No app subscriptions found on this Page/IG account.',
            fix: 'Click “Re-sync Meta Webhooks”, then confirm the callback URL is public in Meta App Dashboard.',
            details: { targetId: subscribeTargetId, fields: [] },
          })
        );
        suggestions.push('Re-sync Meta Webhooks from Automations.');
      } else {
        webhookOk = hasCommentsSignal && hasMessagesSignal;
        steps.push(
          step({
            step: 'WEBHOOK_SUBSCRIPTION',
            label: 'Meta Webhooks Subscribed (comments, messages)',
            success: webhookOk,
            message: webhookOk
              ? `Webhooks subscribed on ${pageId ? 'Page' : 'target'} ${subscribeTargetId}: ${fields.join(', ') || FACEBOOK_PAGE_SUBSCRIBED_FIELDS}`
              : `Subscription found but missing comment/message fields. Current: ${fields.join(', ') || '(none)'}`,
            fix: webhookOk
              ? undefined
              : 'Re-sync Meta Webhooks to subscribe feed,messages,messaging_postbacks (covers IG comments + DMs).',
            details: {
              targetId: subscribeTargetId,
              usingPageId: Boolean(pageId),
              appId: matched?.id || ourAppId || null,
              subscribedFields: fields,
              hasCommentsSignal,
              hasMessagesSignal,
              appsCount: apps.length,
            },
          })
        );
        if (!webhookOk) {
          suggestions.push(
            'Re-sync Meta Webhooks so feed + messages fields are subscribed.'
          );
        }
      }
    }
  }

  // ── STEP 4: Active automation rules ─────────────────────────────────────
  const rulesSummary = await diagnoseRules(workspaceId, steps, suggestions);

  // ── STEP 5: Private reply payload formatting ────────────────────────────
  diagnosePayload(steps, suggestions, {
    igOrPageId: igUserId || pageId,
  });

  // ── STEP 6 (optional): Live Private Reply with real comment_id ──────────
  let livePrivateReply: LivePrivateReplyResult | null = null;
  if (liveCommentId) {
    const resolvedMsg = await resolveLiveReplyMessage({
      workspaceId,
      commentText: commentTextForMatch,
      explicitMessage,
    });
    const liveMessageText = resolvedMsg.messageText;

    if (!isValidInstagramCommentId(liveCommentId)) {
      // Never dispatch Graph with a keyword / non-numeric id (e.g. "marsterclass").
      livePrivateReply = {
        attempted: true,
        httpStatus: 400,
        ok: false,
        endpoint: `${GRAPH_BASE}/{igUserId}/messages`,
        igUserId: igUserId || pageId || '',
        liveCommentId,
        payload: buildPrivateReplyPayload('INVALID', liveMessageText),
        metaResponse: {
          error: {
            message: INVALID_COMMENT_ID_MESSAGE,
            type: 'OAuthException',
            code: 100,
          },
        },
        metaError: INVALID_COMMENT_ID_MESSAGE,
        metaErrorCode: 100,
        statusLabel: '400',
      };
      steps.push(
        step({
          step: 'LIVE_PRIVATE_REPLY',
          label: 'Live Private Reply Graph Dispatch',
          success: false,
          message: INVALID_COMMENT_ID_MESSAGE,
          metaError: INVALID_COMMENT_ID_MESSAGE,
          fix: 'Paste a numeric Instagram comment id (t.ex. 17912345678901234), not a keyword.',
          details: {
            received: liveCommentId,
            httpStatus: 400,
            dispatched: false,
          },
        })
      );
      suggestions.push(INVALID_COMMENT_ID_MESSAGE);
    } else {
      const messagingIgId = igUserId || pageId;
      const replyToken = pageAccessTokenFromMeta || accessToken;
      livePrivateReply = await sendLivePrivateReply({
        igUserId: messagingIgId,
        accessToken: replyToken,
        liveCommentId,
        messageText: liveMessageText,
      });

      steps.push(
        step({
          step: 'LIVE_PRIVATE_REPLY',
          label: 'Live Private Reply Graph Dispatch',
          success: livePrivateReply.ok,
          message: livePrivateReply.ok
            ? `Private Reply sent — HTTP ${livePrivateReply.statusLabel}`
            : `Private Reply failed — HTTP ${livePrivateReply.statusLabel}`,
          metaError: livePrivateReply.metaError,
          fix: livePrivateReply.ok
            ? undefined
            : livePrivateReply.httpStatus === 403
              ? 'Token lacks messaging permission or Page token required — reconnect Instagram / use Re-sync Meta Webhooks.'
              : livePrivateReply.httpStatus === 400
                ? 'Comment id invalid/expired (Private Reply window is short) — paste a fresh Instagram comment id.'
                : 'Check Meta error payload below and reconnect if needed.',
          details: {
            httpStatus: livePrivateReply.httpStatus,
            statusLabel: livePrivateReply.statusLabel,
            endpoint: livePrivateReply.endpoint,
            payload: livePrivateReply.payload,
            metaResponse: livePrivateReply.metaResponse,
            metaErrorCode: livePrivateReply.metaErrorCode,
            matchedRuleId: resolvedMsg.matchedRuleId,
            matchedKeyword: resolvedMsg.matchedKeyword,
            dispatched: true,
          },
        })
      );

      if (!livePrivateReply.ok) {
        suggestions.push(
          livePrivateReply.metaError ||
            `Live Private Reply returned HTTP ${livePrivateReply.statusLabel}`
        );
      }
    }
  }

  const checklist = buildChecklist(steps);
  const allOk =
    Object.values(checklist).every(Boolean) &&
    (liveCommentId ? Boolean(livePrivateReply?.ok) : true);

  return NextResponse.json({
    ok: allOk,
    workspaceId,
    account: {
      handle: ig.handle || null,
      igUserId: igUserId || null,
      pageId: pageId || null,
      platform: 'instagram',
    },
    tokenScopes,
    graphIdentity,
    rules: rulesSummary,
    steps,
    checklist,
    suggestions,
    livePrivateReply,
    verifyTokenSet: Boolean(
      (process.env.META_WEBHOOK_VERIFY_TOKEN || '').trim()
    ),
    note: liveCommentId
      ? livePrivateReply?.ok
        ? `Live Private Reply dispatched (HTTP ${livePrivateReply.statusLabel}).`
        : `Live Private Reply attempted — HTTP ${livePrivateReply?.statusLabel ?? 'unknown'}. See Meta error payload.`
      : 'Diagnostic only — pass liveCommentId to attempt a real Private Reply.',
  });
}

async function diagnoseRules(
  workspaceId: string,
  steps: DiagnosticStep[],
  suggestions: string[]
): Promise<{
  activeCount: number;
  totalCount: number;
  sampleKeywords: string[];
  titles: string[];
}> {
  let activeCount = 0;
  let totalCount = 0;
  const sampleKeywords: string[] = [];
  const titles: string[] = [];

  try {
    const rows = await sql`
      SELECT id, title, trigger_keywords, is_active
      FROM public.dm_automations
      WHERE workspace_id = ${workspaceId}
      ORDER BY id DESC
    `;
    const list = Array.isArray(rows) ? rows : [];
    totalCount = list.length;
    for (const r of list) {
      const title = String(r.title || 'Rule');
      const kws = cleanTriggerKeywords(r.trigger_keywords);
      if (r.is_active) {
        activeCount += 1;
        titles.push(title);
        for (const kw of kws) {
          if (sampleKeywords.length < 12) sampleKeywords.push(kw);
        }
      }
    }

    const hasValidKeywords = sampleKeywords.length > 0;
    const success = activeCount > 0 && hasValidKeywords;
    steps.push(
      step({
        step: 'AUTOMATION_RULES',
        label: 'Active Automation Rules Found in Database',
        success,
        message: success
          ? `${activeCount} active rule(s) with keywords: ${sampleKeywords.slice(0, 6).join(', ')}`
          : activeCount === 0
            ? totalCount === 0
              ? 'No automation rules in this workspace.'
              : `${totalCount} rule(s) exist but none are active.`
            : 'Active rules found but trigger_keywords are empty or invalid.',
        fix: success
          ? undefined
          : 'Create or activate a Comment-to-DM rule with at least one keyword (e.g. kurs, info).',
        details: {
          activeCount,
          totalCount,
          sampleKeywords,
          titles: titles.slice(0, 8),
        },
      })
    );
    if (!success) {
      suggestions.push(
        'Create/activate a Comment-to-DM rule with keywords in Automations.'
      );
    }
  } catch (error) {
    steps.push(
      step({
        step: 'AUTOMATION_RULES',
        label: 'Active Automation Rules Found in Database',
        success: false,
        message: 'Failed to query dm_automations.',
        metaError: error instanceof Error ? error.message : String(error),
        fix: 'Check DATABASE_URL and that dm_automations table exists.',
      })
    );
    suggestions.push('Database query for dm_automations failed — check schema.');
  }

  return { activeCount, totalCount, sampleKeywords, titles };
}

function diagnosePayload(
  steps: DiagnosticStep[],
  suggestions: string[],
  opts?: { igOrPageId?: string }
) {
  const samplePayload = buildPrivateReplyPayload(
    'TEST_COMMENT_ID',
    'Test automation reply'
  );
  const validation = validatePrivateReplyPayload(samplePayload);
  const endpoint = opts?.igOrPageId
    ? `${GRAPH_BASE}/${encodeURIComponent(opts.igOrPageId)}/messages`
    : `${GRAPH_BASE}/{ig-or-page-id}/messages`;

  steps.push(
    step({
      step: 'PRIVATE_REPLY_PAYLOAD',
      label: 'Private Reply Graph API Payload Formatted Correctly',
      success: validation.ok,
      message: validation.ok
        ? `Payload uses recipient.comment_id + message.text (Graph ${GRAPH_V} /messages).`
        : `Payload validation failed: ${validation.issues.join('; ')}`,
      fix: validation.ok
        ? undefined
        : 'Ensure private replies use { recipient: { comment_id }, message: { text } } — never recipient.id for Comment-to-DM.',
      details: {
        endpoint,
        samplePayload,
        issues: validation.issues,
        critical:
          'recipient MUST be { comment_id } to bypass the 24h messaging window.',
      },
    })
  );
  if (!validation.ok) {
    suggestions.push(
      'Fix private-reply payload: recipient.comment_id + message.text.'
    );
  }
}

function buildChecklist(steps: DiagnosticStep[]): Record<ChecklistKey, boolean> {
  const byId = new Map(steps.map((s) => [s.step, s]));
  return {
    instagramTokenValid: Boolean(
      byId.get('TOKEN_CHECK')?.success && byId.get('TOKEN_VALIDITY')?.success
    ),
    metaWebhooksSubscribed: Boolean(
      byId.get('WEBHOOK_SUBSCRIPTION')?.success
    ),
    activeRulesFound: Boolean(byId.get('AUTOMATION_RULES')?.success),
    privateReplyPayloadOk: Boolean(
      byId.get('PRIVATE_REPLY_PAYLOAD')?.success
    ),
  };
}

export async function GET(request: Request) {
  try {
    const action = new URL(request.url).searchParams.get('action')?.trim();
    if (action === 'fetch_comments') {
      return await handleFetchComments(request);
    }
    return await runLiveDiagnostic(request);
  } catch (error) {
    console.error('[GET /api/admin/inbox/automations/test-live]', error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : 'Diagnostic failed',
        steps: [],
        checklist: {
          instagramTokenValid: false,
          metaWebhooksSubscribed: false,
          activeRulesFound: false,
          privateReplyPayloadOk: false,
        },
        suggestions: ['Retry the live diagnostic.'],
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    return await runLiveDiagnostic(request);
  } catch (error) {
    console.error('[POST /api/admin/inbox/automations/test-live]', error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : 'Diagnostic failed',
        steps: [],
        checklist: {
          instagramTokenValid: false,
          metaWebhooksSubscribed: false,
          activeRulesFound: false,
          privateReplyPayloadOk: false,
        },
        suggestions: ['Retry the live diagnostic.'],
      },
      { status: 500 }
    );
  }
}

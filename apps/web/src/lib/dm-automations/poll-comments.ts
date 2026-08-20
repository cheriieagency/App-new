/**
 * Automatic Comment-to-DM poller.
 *
 * Meta webhooks are the preferred path, but they often miss on localhost /
 * misconfigured App Dashboard callbacks. This poller fetches recent IG
 * comments via Graph and runs the same automation engine — so keyword DMs
 * send without clicking “Fetch latest comments” / “Run live test DM”.
 */

import sql from '@/app/api/utils/sql';
import { ensureDmAutomationsSchema } from '@/lib/dm-automations/schema';
import {
  processCommentAutomationEvent,
  type IncomingCommentEvent,
} from '@/lib/dm-automations/engine';
import { fetchRecentInstagramComments } from '@/lib/dm-automations/fetch-instagram-comments';
import { ensureSocialAccountsSchema } from '@/lib/social/persist';

export type PollCommentsResult = {
  workspacesScanned: number;
  commentsFetched: number;
  commentsSkipped: number;
  matched: number;
  sent: number;
  errors: string[];
  details: Array<{
    workspaceId: string;
    commentId: string;
    matched: boolean;
    sent: boolean;
    error?: string;
  }>;
};

type PollAccount = {
  workspaceId: string;
  igUserId: string;
  pageId: string | null;
  /** Instagram user / long-lived token. */
  accessToken: string;
  /** Facebook Page token (preferred for comments + private reply). */
  pageAccessToken: string | null;
};

function pageTokenFromMeta(meta: unknown): string {
  if (!meta || typeof meta !== 'object') return '';
  const m = meta as Record<string, unknown>;
  return typeof m.page_access_token === 'string'
    ? m.page_access_token.trim()
    : '';
}

/** Active automation workspaces + Instagram accounts with usable tokens. */
async function listPollTargets(workspaceIdFilter?: string): Promise<PollAccount[]> {
  await ensureSocialAccountsSchema();
  await ensureDmAutomationsSchema();

  const rows = workspaceIdFilter
    ? await sql`
        SELECT DISTINCT
          sa.workspace_id, sa.platform_user_id, sa.page_id, sa.access_token, sa.meta
        FROM public.social_accounts sa
        WHERE sa.platform = 'instagram'
          AND sa.workspace_id = ${workspaceIdFilter}
          AND EXISTS (
            SELECT 1 FROM public.dm_automations a
            WHERE a.workspace_id = sa.workspace_id AND a.is_active = true
          )
          AND (
            (sa.access_token IS NOT NULL AND sa.access_token <> '')
            OR COALESCE(sa.meta->>'page_access_token', '') <> ''
          )
      `
    : await sql`
        SELECT DISTINCT
          sa.workspace_id, sa.platform_user_id, sa.page_id, sa.access_token, sa.meta
        FROM public.social_accounts sa
        WHERE sa.platform = 'instagram'
          AND EXISTS (
            SELECT 1 FROM public.dm_automations a
            WHERE a.workspace_id = sa.workspace_id AND a.is_active = true
          )
          AND (
            (sa.access_token IS NOT NULL AND sa.access_token <> '')
            OR COALESCE(sa.meta->>'page_access_token', '') <> ''
          )
      `;

  const list = Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
  const out: PollAccount[] = [];

  for (const row of list) {
    const workspaceId = String(row.workspace_id || '').trim();
    const igUserId = String(row.platform_user_id || '').trim();
    if (!workspaceId || !igUserId) continue;

    const igUserToken = String(row.access_token || '').trim();
    let pageAccessToken = pageTokenFromMeta(row.meta) || null;
    let pageId =
      row.page_id != null && String(row.page_id).trim()
        ? String(row.page_id).trim()
        : null;

    // Prefer FB sibling Page token / page_id in the same workspace.
    try {
      const fbRows = await sql`
        SELECT page_id, platform_user_id, access_token, meta
        FROM public.social_accounts
        WHERE workspace_id = ${workspaceId}
          AND platform = 'facebook'
        ORDER BY
          CASE WHEN COALESCE(meta->>'page_access_token', '') <> '' THEN 0 ELSE 1 END
        LIMIT 3
      `;
      const fbList = Array.isArray(fbRows)
        ? (fbRows as Record<string, unknown>[])
        : [];
      for (const fb of fbList) {
        const fbMetaTok = pageTokenFromMeta(fb.meta);
        if (fbMetaTok) pageAccessToken = fbMetaTok;
        else if (!pageAccessToken && fb.access_token) {
          pageAccessToken = String(fb.access_token).trim();
        }
        if (!pageId) {
          const cand =
            (fb.page_id != null && String(fb.page_id).trim()) ||
            String(fb.platform_user_id || '').trim();
          if (cand && !cand.startsWith('1784')) pageId = cand;
        }
        if (pageAccessToken && pageId) break;
      }
    } catch {
      /* keep IG tokens */
    }

    if (!pageAccessToken && !igUserToken) continue;
    out.push({
      workspaceId,
      igUserId,
      pageId,
      accessToken: igUserToken,
      pageAccessToken,
    });
  }

  return out;
}

async function commentAlreadyHandled(commentId: string): Promise<boolean> {
  try {
    const rows = await sql`
      SELECT id FROM public.dm_logs
      WHERE comment_id = ${commentId}
        AND status IN ('sent', 'delivered', 'skipped')
      LIMIT 1
    `;
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

function withinLookback(
  createdTime: string | null,
  lookbackMs: number
): boolean {
  if (!createdTime) return true; // no timestamp → still try (dedupe via dm_logs)
  const ts = Date.parse(createdTime);
  if (!Number.isFinite(ts)) return true;
  return Date.now() - ts <= lookbackMs;
}

/**
 * Poll Instagram for recent comments and auto-run Comment-to-DM rules.
 * @param workspaceId Optional — limit to one workspace (admin UI).
 * @param lookbackMinutes Only process comments newer than this (default 180).
 */
export async function pollAndProcessCommentAutomations(input?: {
  workspaceId?: string;
  lookbackMinutes?: number;
  maxCommentsPerAccount?: number;
}): Promise<PollCommentsResult> {
  const result: PollCommentsResult = {
    workspacesScanned: 0,
    commentsFetched: 0,
    commentsSkipped: 0,
    matched: 0,
    sent: 0,
    errors: [],
    details: [],
  };

  if (!process.env.DATABASE_URL?.trim()) {
    result.errors.push('DATABASE_URL missing');
    return result;
  }

  const lookbackMs =
    Math.max(5, input?.lookbackMinutes ?? 180) * 60 * 1000;
  const maxPerAccount = Math.min(
    Math.max(input?.maxCommentsPerAccount ?? 40, 5),
    80
  );

  const targets = await listPollTargets(input?.workspaceId);
  const seenWs = new Set<string>();

  for (const account of targets) {
    seenWs.add(account.workspaceId);
    const fetched = await fetchRecentInstagramComments({
      igUserId: account.igUserId,
      pageAccessToken: account.pageAccessToken,
      accessToken: account.accessToken,
      mediaLimit: 20,
      commentsPerMedia: 40,
      maxComments: maxPerAccount,
    });

    if (!fetched.success) {
      result.errors.push(
        `${account.workspaceId}: ${fetched.error || 'comments_fetch_failed'}`
      );
      continue;
    }

    if (fetched.comments.length === 0) {
      console.warn('[dm-automations/poll] zero comments', {
        workspaceId: account.workspaceId,
        mediaScanned: fetched.mediaScanned,
        tokenUsed: fetched.tokenUsed,
        hasPageToken: Boolean(account.pageAccessToken),
        hasIgToken: Boolean(account.accessToken),
        hint: fetched.error || null,
      });
      if (fetched.error) {
        result.errors.push(`${account.workspaceId}: ${fetched.error}`);
      }
    }

    const batch = fetched.comments.slice(0, maxPerAccount);
    result.commentsFetched += batch.length;

    for (const comment of batch) {
      if (!comment.text.trim()) {
        result.commentsSkipped += 1;
        continue;
      }

      if (!withinLookback(comment.createdTime, lookbackMs)) {
        result.commentsSkipped += 1;
        continue;
      }

      if (await commentAlreadyHandled(comment.id)) {
        result.commentsSkipped += 1;
        continue;
      }

      const commenterId =
        comment.fromId ||
        (comment.username ? `ig:${comment.username}` : '') ||
        `comment:${comment.id}`;

      // Skip self-comments from the Business account.
      if (comment.fromId && comment.fromId === account.igUserId) {
        result.commentsSkipped += 1;
        continue;
      }

      const event: IncomingCommentEvent = {
        commentId: comment.id,
        mediaId: comment.mediaId,
        text: comment.text,
        commenterId,
        commenterUsername: comment.username,
        igAccountId: account.igUserId,
        pageId: account.pageId,
      };

      try {
        const outcome = await processCommentAutomationEvent(event);
        if (outcome.matched) result.matched += 1;
        if (outcome.sent) result.sent += 1;
        result.details.push({
          workspaceId: account.workspaceId,
          commentId: comment.id,
          matched: outcome.matched,
          sent: outcome.sent,
          error: outcome.error,
        });
        if (outcome.error && !outcome.sent) {
          result.errors.push(
            `${account.workspaceId}/${comment.id}: ${outcome.error}`
          );
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'process_failed';
        result.errors.push(`${account.workspaceId}/${comment.id}: ${message}`);
        result.details.push({
          workspaceId: account.workspaceId,
          commentId: comment.id,
          matched: false,
          sent: false,
          error: message,
        });
      }
    }
  }

  result.workspacesScanned = seenWs.size;
  console.log('[dm-automations/poll]', {
    workspacesScanned: result.workspacesScanned,
    commentsFetched: result.commentsFetched,
    skipped: result.commentsSkipped,
    matched: result.matched,
    sent: result.sent,
    errorCount: result.errors.length,
    firstError: result.errors[0] || null,
  });

  return result;
}

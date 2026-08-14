/**
 * Keyword matcher + Meta Comment-to-DM dispatcher.
 */

import sql from '@/app/api/utils/sql';
import { ensureDmAutomationsSchema } from '@/lib/dm-automations/schema';
import {
  cleanTriggerKeywords,
  findMatchingKeyword,
} from '@/lib/dm-automations/keywords';
import { ensureSocialAccountsSchema } from '@/lib/social/persist';
import {
  replyToInstagramComment,
  sendInstagramDmToUser,
  sendInstagramPrivateReply,
} from '@/lib/meta/graph-api';

// Re-export keyword helpers for existing imports of this module.
export {
  cleanTriggerKeywords,
  commentMatchesKeyword,
  commentWordTokens,
  findMatchingKeyword,
} from '@/lib/dm-automations/keywords';

export type IncomingCommentEvent = {
  commentId: string;
  mediaId: string | null;
  text: string;
  commenterId: string;
  commenterUsername: string | null;
  /** Instagram Business account id from entry.id / media.owner.id */
  igAccountId: string | null;
  pageId: string | null;
};

export type DmAutomationRow = {
  id: string;
  workspace_id: string;
  title: string;
  trigger_keywords: string[];
  dm_message_text: string;
  cta_button_label: string | null;
  cta_button_url: string | null;
  reply_to_comment_publicly: boolean;
  public_comment_text: string | null;
  is_active: boolean;
  total_dms_sent: number;
  storefront_clicks: number;
};

function buildDmBody(rule: DmAutomationRow): string {
  const text = String(rule.dm_message_text || '').trim();
  const url = String(rule.cta_button_url || '').trim();
  if (url) return `${text}\n\n${url}`.trim();
  return text;
}

type ResolvedAccount = {
  workspaceId: string;
  igUserId: string;
  pageId: string | null;
  accessToken: string;
  pageAccessToken: string | null;
};

async function resolveSocialAccount(
  event: IncomingCommentEvent
): Promise<ResolvedAccount | null> {
  await ensureSocialAccountsSchema();
  const candidates = [
    event.igAccountId,
    event.pageId,
  ].filter((v): v is string => Boolean(v && String(v).trim()));

  if (candidates.length === 0) return null;

  for (const id of candidates) {
    const rows = await sql`
      SELECT
        sa.workspace_id, sa.platform_user_id, sa.page_id, sa.access_token,
        sa.platform, sa.meta
      FROM public.social_accounts sa
      WHERE sa.platform IN ('instagram', 'facebook')
        AND (
          sa.platform_user_id = ${id}
          OR sa.page_id = ${id}
          OR COALESCE(sa.meta->>'ig_user_id', '') = ${id}
        )
      ORDER BY
        CASE WHEN EXISTS (
          SELECT 1 FROM public.dm_automations a
          WHERE a.workspace_id = sa.workspace_id AND a.is_active = true
        ) THEN 0 ELSE 1 END,
        CASE WHEN COALESCE(sa.meta->>'page_access_token', '') <> '' THEN 0 ELSE 1 END,
        CASE WHEN sa.platform = 'instagram' THEN 0 ELSE 1 END
      LIMIT 8
    `;
    if (!Array.isArray(rows) || rows.length === 0) continue;

    const preferredWs = String(rows[0]?.workspace_id || '').trim();
    const ig =
      rows.find(
        (r) =>
          r.platform === 'instagram' &&
          String(r.workspace_id) === preferredWs
      ) ||
      rows.find((r) => r.platform === 'instagram') ||
      rows[0];
    const fb =
      rows.find(
        (r) =>
          r.platform === 'facebook' &&
          String(r.workspace_id) === preferredWs
      ) || rows.find((r) => r.platform === 'facebook');

    const workspaceId = String(ig.workspace_id || preferredWs || '').trim();
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
    const accessToken = pageAccessToken;
    if (!workspaceId || !accessToken) continue;

    return {
      workspaceId,
      igUserId: String(ig.platform_user_id || event.igAccountId || id),
      pageId: String(ig.page_id || fb?.page_id || event.pageId || '') || null,
      accessToken,
      pageAccessToken,
    };
  }
  return null;
}

async function recentlyMessaged(input: {
  workspaceId: string;
  commenterId: string;
}): Promise<boolean> {
  try {
    const rows = await sql`
      SELECT id FROM public.dm_logs
      WHERE workspace_id = ${input.workspaceId}
        AND commenter_id = ${input.commenterId}
        AND status IN ('sent', 'delivered')
        AND COALESCE(created_at, sent_at, to_timestamp(0))
              >= (now() - interval '10 minutes')
      LIMIT 1
    `;
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    // Fallback when timestamp columns are missing on older schemas.
    try {
      const rows = await sql`
        SELECT id FROM public.dm_logs
        WHERE workspace_id = ${input.workspaceId}
          AND commenter_id = ${input.commenterId}
          AND status IN ('sent', 'delivered')
        ORDER BY id DESC
        LIMIT 1
      `;
      return Array.isArray(rows) && rows.length > 0;
    } catch {
      return false;
    }
  }
}

async function loadActiveRules(workspaceId: string): Promise<DmAutomationRow[]> {
  const rows = await sql`
    SELECT *
    FROM public.dm_automations
    WHERE workspace_id = ${workspaceId}
      AND is_active = true
    ORDER BY id DESC
  `;
  return (Array.isArray(rows) ? rows : []).map((r) => ({
    id: String(r.id),
    workspace_id: String(r.workspace_id),
    title: String(r.title || 'Rule'),
    // Always a cleaned string[] — never leave a broken ternary here.
    trigger_keywords: cleanTriggerKeywords(r.trigger_keywords),
    dm_message_text: String(r.dm_message_text || ''),
    cta_button_label:
      r.cta_button_title != null
        ? String(r.cta_button_title)
        : r.cta_button_label != null
          ? String(r.cta_button_label)
          : null,
    cta_button_url:
      r.cta_button_url != null ? String(r.cta_button_url) : null,
    reply_to_comment_publicly: Boolean(r.reply_to_comment_publicly),
    public_comment_text:
      r.public_comment_text != null ? String(r.public_comment_text) : null,
    is_active: Boolean(r.is_active),
    total_dms_sent: Number(r.total_dms_sent) || 0,
    storefront_clicks: Number(r.storefront_clicks) || 0,
  }));
}

/**
 * Process one incoming Instagram comment webhook value.
 */
export async function processCommentAutomationEvent(
  event: IncomingCommentEvent
): Promise<{
  matched: boolean;
  sent: boolean;
  automationId?: string;
  error?: string;
}> {
  if (!process.env.DATABASE_URL?.trim()) {
    return { matched: false, sent: false, error: 'no_database' };
  }
  if (!event.commentId || !event.commenterId || !event.text?.trim()) {
    return { matched: false, sent: false, error: 'incomplete_event' };
  }

  await ensureDmAutomationsSchema();

  const account = await resolveSocialAccount(event);
  if (!account) {
    return { matched: false, sent: false, error: 'account_not_found' };
  }

  const rules = await loadActiveRules(account.workspaceId);
  let matchedRule: DmAutomationRow | null = null;
  let matchedKeyword: string | null = null;
  for (const rule of rules) {
    const kw = findMatchingKeyword(event.text, rule.trigger_keywords);
    if (kw) {
      matchedRule = rule;
      matchedKeyword = kw;
      break;
    }
  }

  if (!matchedRule || !matchedKeyword) {
    return { matched: false, sent: false };
  }

  if (
    await recentlyMessaged({
      workspaceId: account.workspaceId,
      commenterId: event.commenterId,
    })
  ) {
    await sql`
      INSERT INTO public.dm_logs (
        workspace_id, automation_id, comment_id, media_id,
        commenter_id, commenter_username, comment_text,
        matched_keyword, status, error_message
      ) VALUES (
        ${account.workspaceId},
        ${matchedRule.id},
        ${event.commentId},
        ${event.mediaId},
        ${event.commenterId},
        ${event.commenterUsername},
        ${event.text},
        ${matchedKeyword},
        'skipped',
        ${'rate_limited_10m'}
      )
    `;
    return {
      matched: true,
      sent: false,
      automationId: matchedRule.id,
      error: 'rate_limited',
    };
  }

  const dmBody = buildDmBody(matchedRule);
  if (!dmBody) {
    return {
      matched: true,
      sent: false,
      automationId: matchedRule.id,
      error: 'empty_dm_message',
    };
  }

  const token = account.pageAccessToken || account.accessToken;
  // Prefer IG user id for /{ig-user-id}/messages private replies.
  const endpointCandidates = [
    account.igUserId,
    account.pageId,
  ].filter((v): v is string => Boolean(v && String(v).trim()));

  let dmMessageId: string | null = null;
  try {
    // CRITICAL: private reply MUST use recipient.comment_id (not from.id).
    let lastPrivError: unknown = null;
    for (const endpointId of endpointCandidates) {
      try {
        const priv = await sendInstagramPrivateReply({
          igOrPageId: endpointId,
          accessToken: token,
          commentId: event.commentId,
          message: dmBody,
        });
        dmMessageId = priv.id;
        lastPrivError = null;
        break;
      } catch (privErr) {
        lastPrivError = privErr;
        console.warn(
          '[dm-automations] private reply failed for endpoint',
          endpointId,
          privErr
        );
      }
    }

    // Last resort only — may still fail outside 24h window.
    if (!dmMessageId) {
      try {
        const userDm = await sendInstagramDmToUser({
          igUserId: account.igUserId,
          accessToken: token,
          recipientId: event.commenterId,
          message: dmBody,
        });
        dmMessageId = userDm.id;
      } catch (userDmErr) {
        throw lastPrivError || userDmErr;
      }
    }

    if (
      matchedRule.reply_to_comment_publicly &&
      String(matchedRule.public_comment_text || '').trim()
    ) {
      const publicText = String(matchedRule.public_comment_text).trim();
      try {
        await replyToInstagramComment(
          event.commentId,
          publicText,
          token
        );
      } catch (replyErr) {
        console.warn('[dm-automations] public comment reply failed', replyErr);
      }
    }

    await sql`
      INSERT INTO public.dm_logs (
        workspace_id, automation_id, comment_id, media_id,
        commenter_id, commenter_username, comment_text,
        dm_message_id, matched_keyword, status
      ) VALUES (
        ${account.workspaceId},
        ${matchedRule.id},
        ${event.commentId},
        ${event.mediaId},
        ${event.commenterId},
        ${event.commenterUsername},
        ${event.text},
        ${dmMessageId},
        ${matchedKeyword},
        'sent'
      )
    `;
    try {
      await sql`
        UPDATE public.dm_automations
        SET
          total_dms_sent = COALESCE(total_dms_sent, 0) + 1,
          updated_at = now()
        WHERE id = ${matchedRule.id}
      `;
    } catch {
      await sql`
        UPDATE public.dm_automations
        SET total_dms_sent = COALESCE(total_dms_sent, 0) + 1
        WHERE id = ${matchedRule.id}
      `;
    }

    return {
      matched: true,
      sent: true,
      automationId: matchedRule.id,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'dm_send_failed';
    await sql`
      INSERT INTO public.dm_logs (
        workspace_id, automation_id, comment_id, media_id,
        commenter_id, commenter_username, comment_text,
        matched_keyword, status, error_message
      ) VALUES (
        ${account.workspaceId},
        ${matchedRule.id},
        ${event.commentId},
        ${event.mediaId},
        ${event.commenterId},
        ${event.commenterUsername},
        ${event.text},
        ${matchedKeyword},
        'failed',
        ${message}
      )
    `;
    return {
      matched: true,
      sent: false,
      automationId: matchedRule.id,
      error: message,
    };
  }
}

/** Parse Meta webhook POST body into comment events (instagram + page). */
export function extractCommentEventsFromWebhook(
  payload: unknown
): IncomingCommentEvent[] {
  const root = payload as {
    object?: string;
    entry?: Array<{
      id?: string;
      changes?: Array<{
        field?: string;
        value?: Record<string, unknown>;
      }>;
    }>;
  };
  const objectType = String(root.object || '').toLowerCase();
  const events: IncomingCommentEvent[] = [];

  for (const entry of root.entry || []) {
    const entryId = entry.id ? String(entry.id) : null;
    for (const change of entry.changes || []) {
      const field = String(change.field || '').toLowerCase();
      const value = change.value || {};

      // Instagram: field=comments · Page: field=feed with item=comment
      const isIgComment = field === 'comments' || objectType === 'instagram';
      const isPageComment =
        field === 'feed' &&
        (String(value.item || '').toLowerCase() === 'comment' ||
          Boolean(value.comment_id));

      if (!isIgComment && !isPageComment) {
        // Still allow bare comments field without object type.
        if (field && field !== 'comments') continue;
      }

      // Skip removals / edits that aren't new comments.
      const verb = String(value.verb || 'add').toLowerCase();
      if (verb && verb !== 'add' && verb !== 'edited') continue;

      const from = (value.from || {}) as {
        id?: string;
        username?: string;
        name?: string;
      };
      const media = (value.media || {}) as {
        id?: string;
        owner?: { id?: string };
      };

      const commentId = String(
        value.id || value.comment_id || ''
      ).trim();
      const commenterId = String(
        from.id || value.sender_id || ''
      ).trim();
      const text = String(value.text || value.message || '').trim();
      if (!commentId || !commenterId || !text) continue;

      // Skip creator self-comments (commenter id == entry / page / IG id).
      if (entryId && commenterId === entryId) continue;

      const igAccountId =
        objectType === 'instagram'
          ? media.owner?.id
            ? String(media.owner.id)
            : entryId
          : media.owner?.id
            ? String(media.owner.id)
            : null;

      events.push({
        commentId,
        mediaId: media.id
          ? String(media.id)
          : value.post_id
            ? String(value.post_id)
            : null,
        text,
        commenterId,
        commenterUsername: from.username
          ? String(from.username)
          : from.name
            ? String(from.name)
            : null,
        igAccountId,
        pageId: objectType === 'page' ? entryId : null,
      });
    }
  }
  return events;
}

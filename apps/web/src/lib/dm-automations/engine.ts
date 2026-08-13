/**
 * Keyword matcher + Meta Comment-to-DM dispatcher.
 */

import sql from '@/app/api/utils/sql';
import { ensureDmAutomationsSchema } from '@/lib/dm-automations/schema';
import { ensureSocialAccountsSchema } from '@/lib/social/persist';
import {
  replyToInstagramComment,
  sendInstagramDmToUser,
  sendInstagramPrivateReply,
} from '@/lib/meta/graph-api';

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
  id: number;
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

function normalizeKeyword(raw: string): string {
  return raw.trim().replace(/^#+/, '').toLowerCase();
}

/** True when comment text contains the keyword as a whole token / hashtag. */
export function commentMatchesKeyword(
  commentText: string,
  keyword: string
): boolean {
  const kw = normalizeKeyword(keyword);
  if (!kw) return false;
  const hay = commentText.toLowerCase();
  if (hay.includes(`#${kw}`)) return true;
  // Word-boundary-ish match (letters/digits/_).
  const re = new RegExp(`(^|[^a-z0-9_])${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9_]|$)`, 'i');
  return re.test(hay);
}

export function findMatchingKeyword(
  commentText: string,
  keywords: string[]
): string | null {
  for (const kw of keywords) {
    if (commentMatchesKeyword(commentText, kw)) return kw;
  }
  return null;
}

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
        workspace_id, platform_user_id, page_id, access_token, platform, meta
      FROM public.social_accounts
      WHERE platform IN ('instagram', 'facebook')
        AND (
          platform_user_id = ${id}
          OR page_id = ${id}
          OR COALESCE(meta->>'ig_user_id', '') = ${id}
        )
      ORDER BY CASE WHEN platform = 'instagram' THEN 0 ELSE 1 END
      LIMIT 3
    `;
    if (!Array.isArray(rows) || rows.length === 0) continue;

    const ig =
      rows.find((r) => r.platform === 'instagram') || rows[0];
    const fb = rows.find((r) => r.platform === 'facebook');
    const workspaceId = String(ig.workspace_id || '').trim();
    const accessToken = String(ig.access_token || fb?.access_token || '').trim();
    if (!workspaceId || !accessToken) continue;

    return {
      workspaceId,
      igUserId: String(ig.platform_user_id || event.igAccountId || id),
      pageId: String(ig.page_id || fb?.page_id || event.pageId || '') || null,
      accessToken,
      pageAccessToken: fb?.access_token
        ? String(fb.access_token)
        : accessToken,
    };
  }
  return null;
}

async function recentlyMessaged(input: {
  workspaceId: string;
  commenterId: string;
}): Promise<boolean> {
  const rows = await sql`
    SELECT id FROM public.dm_logs
    WHERE workspace_id = ${input.workspaceId}
      AND commenter_id = ${input.commenterId}
      AND status = 'sent'
      AND created_at >= (now() - interval '10 minutes')
    LIMIT 1
  `;
  return Array.isArray(rows) && rows.length > 0;
}

async function loadActiveRules(workspaceId: string): Promise<DmAutomationRow[]> {
  const rows = await sql`
    SELECT *
    FROM public.dm_automations
    WHERE workspace_id = ${workspaceId}
      AND is_active = true
    ORDER BY updated_at DESC
  `;
  return (Array.isArray(rows) ? rows : []).map((r) => ({
    id: Number(r.id),
    workspace_id: String(r.workspace_id),
    title: String(r.title || 'Rule'),
    trigger_keywords: Array.isArray(r.trigger_keywords)
      ? (r.trigger_keywords as string[]).map(String)
      : [],
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
  automationId?: number;
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
  const endpointId = account.pageId || account.igUserId;

  let dmMessageId: string | null = null;
  try {
    // 1) Private reply via comment_id (canonical Comment-to-DM).
    try {
      const priv = await sendInstagramPrivateReply({
        igOrPageId: endpointId,
        accessToken: token,
        commentId: event.commentId,
        message: dmBody,
      });
      dmMessageId = priv.id;
    } catch (privErr) {
      console.warn('[dm-automations] private reply failed, trying user DM', privErr);
      // 2) Fallback: recipient scoped id as specified in the product prompt.
      const userDm = await sendInstagramDmToUser({
        igUserId: account.igUserId,
        accessToken: token,
        recipientId: event.commenterId,
        message: dmBody,
      });
      dmMessageId = userDm.id;
    }

    if (matchedRule.reply_to_comment_publicly) {
      const publicText =
        String(matchedRule.public_comment_text || '').trim() ||
        'Kolla din DM!';
      try {
        await replyToInstagramComment(
          event.commentId,
          publicText,
          account.accessToken
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
    await sql`
      UPDATE public.dm_automations
      SET
        total_dms_sent = COALESCE(total_dms_sent, 0) + 1,
        updated_at = now()
      WHERE id = ${matchedRule.id}
    `;

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

/** Parse Meta webhook POST body into comment events. */
export function extractCommentEventsFromWebhook(
  payload: unknown
): IncomingCommentEvent[] {
  const root = payload as {
    entry?: Array<{
      id?: string;
      changes?: Array<{
        field?: string;
        value?: Record<string, unknown>;
      }>;
    }>;
  };
  const events: IncomingCommentEvent[] = [];
  for (const entry of root.entry || []) {
    const igAccountId = entry.id ? String(entry.id) : null;
    for (const change of entry.changes || []) {
      if (change.field && change.field !== 'comments') continue;
      const value = change.value || {};
      const from = (value.from || {}) as { id?: string; username?: string };
      const media = (value.media || {}) as {
        id?: string;
        owner?: { id?: string };
      };
      const commentId = String(value.id || value.comment_id || '').trim();
      const commenterId = String(from.id || '').trim();
      const text = String(value.text || '').trim();
      if (!commentId || !commenterId || !text) continue;
      events.push({
        commentId,
        mediaId: media.id ? String(media.id) : null,
        text,
        commenterId,
        commenterUsername: from.username ? String(from.username) : null,
        igAccountId: media.owner?.id
          ? String(media.owner.id)
          : igAccountId,
        pageId: null,
      });
    }
  }
  return events;
}

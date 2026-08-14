/**
 * Meta Instagram / Page comments webhook — Comment-to-DM automation receiver.
 * GET: hub challenge verification
 * POST: keyword match → private reply (recipient.comment_id) + optional public reply
 *
 * CRITICAL: Always respond 200 so Meta never disables the subscription.
 */

import { NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';
import { ensureDmAutomationsSchema } from '@/lib/dm-automations/schema';
import { findMatchingKeyword } from '@/lib/dm-automations/engine';

type WebhookBody = {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: Record<string, unknown>;
    }>;
  }>;
};

type SocialAccountRow = {
  workspace_id: string;
  platform: string;
  platform_user_id: string;
  page_id: string | null;
  access_token: string;
};

type AutomationRow = {
  id: string;
  dm_message_text: string | null;
  cta_button_url: string | null;
  trigger_keywords: unknown;
  reply_to_comment_publicly: boolean | null;
  public_comment_text: string | null;
  title?: string | null;
};

function ok() {
  return NextResponse.json({ success: true }, { status: 200 });
}

/** META_WEBHOOK_VERIFY_TOKEN with trim + optional wrapping quotes stripped. */
function expectedVerifyToken(): string {
  return String(process.env.META_WEBHOOK_VERIFY_TOKEN ?? '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .trim();
}

function cleanCommentText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^#+/, '')
    .replace(/[#@]/g, ' ')
    .replace(/[^\p{L}\p{N}\s_]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseKeywords(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === 'string') {
    return raw
      .split(/[,;\n]+/)
      .map((k) => k.trim())
      .filter(Boolean);
  }
  return [];
}

function buildDmText(rule: AutomationRow): string {
  const text = String(rule.dm_message_text || '').trim();
  const url = String(rule.cta_button_url || '').trim();
  if (url) return `${text}\n\n${url}`.trim();
  return text;
}

/** Resolve social account by entryId (IG id OR Facebook Page id). */
async function lookupSocialAccount(
  entryId: string
): Promise<SocialAccountRow | null> {
  if (!process.env.DATABASE_URL?.trim() || !entryId) return null;

  const mapRow = (row: Record<string, unknown> | null | undefined) => {
    if (!row?.workspace_id || !row?.access_token) return null;
    return {
      workspace_id: String(row.workspace_id),
      platform: String(row.platform || ''),
      platform_user_id: String(row.platform_user_id || ''),
      page_id: row.page_id != null ? String(row.page_id) : null,
      access_token: String(row.access_token),
    } satisfies SocialAccountRow;
  };

  try {
    // Match IG scoped id, Page id on page_id, or Page id stored as platform_user_id.
    const matched = await sql`
      SELECT workspace_id, platform, platform_user_id, page_id, access_token
      FROM public.social_accounts
      WHERE platform IN ('instagram', 'facebook')
        AND access_token IS NOT NULL
        AND access_token <> ''
        AND (
          platform_user_id = ${entryId}
          OR page_id = ${entryId}
          OR COALESCE(meta->>'ig_user_id', '') = ${entryId}
          OR COALESCE(meta->>'page_id', '') = ${entryId}
        )
      ORDER BY CASE WHEN platform = 'instagram' THEN 0 ELSE 1 END
      LIMIT 5
    `;
    const list = Array.isArray(matched)
      ? (matched as Record<string, unknown>[])
      : [];
    const primary = mapRow(list[0]);
    if (!primary) return null;

    // If webhook arrived on Facebook Page id, prefer the IG sibling in same workspace
    // (same Page Access Token, better /{ig-user-id}/messages endpoint).
    if (primary.platform === 'facebook' || primary.page_id === entryId) {
      const workspaceId = primary.workspace_id;
      const igSibling = list.find((r) => r.platform === 'instagram');
      if (igSibling) {
        const ig = mapRow(igSibling);
        if (ig) return ig;
      }
      try {
        const igRows = await sql`
          SELECT workspace_id, platform, platform_user_id, page_id, access_token
          FROM public.social_accounts
          WHERE workspace_id = ${workspaceId}
            AND platform = 'instagram'
            AND access_token IS NOT NULL
            AND access_token <> ''
            AND (
              page_id = ${entryId}
              OR page_id = ${primary.page_id}
              OR page_id = ${primary.platform_user_id}
            )
          LIMIT 1
        `;
        const ig = mapRow(
          Array.isArray(igRows)
            ? (igRows[0] as Record<string, unknown>)
            : null
        );
        if (ig) return ig;
      } catch {
        /* fall through to primary */
      }
    }

    return primary;
  } catch (error) {
    console.warn('[Meta Webhook] social_accounts lookup failed', error);
    return null;
  }
}

async function loadActiveAutomations(
  workspaceId: string
): Promise<AutomationRow[]> {
  try {
    const rows = await sql`
      SELECT
        id, title, trigger_keywords, dm_message_text, cta_button_url,
        reply_to_comment_publicly, public_comment_text
      FROM public.dm_automations
      WHERE workspace_id = ${workspaceId}
        AND is_active = true
      ORDER BY id DESC
    `;
    return (Array.isArray(rows) ? rows : []) as AutomationRow[];
  } catch (error) {
    console.warn('[Meta Webhook] dm_automations query failed', error);
    return [];
  }
}

async function insertDmLog(input: {
  workspaceId: string;
  automationId: string;
  commentId: string;
  mediaId: string | null;
  commenterId: string;
  commenterUsername: string | null;
  commentText: string;
  matchedKeyword: string;
  status: 'sent' | 'failed' | 'skipped';
  dmMessageId?: string | null;
  errorMessage?: string | null;
}): Promise<void> {
  // Full insert (preferred schema).
  try {
    if (input.status === 'sent') {
      await sql`
        INSERT INTO public.dm_logs (
          workspace_id, automation_id, comment_id, media_id,
          commenter_id, commenter_username, comment_text,
          dm_message_id, matched_keyword, status
        ) VALUES (
          ${input.workspaceId},
          ${input.automationId},
          ${input.commentId},
          ${input.mediaId},
          ${input.commenterId},
          ${input.commenterUsername},
          ${input.commentText},
          ${input.dmMessageId ?? null},
          ${input.matchedKeyword},
          'sent'
        )
      `;
    } else {
      await sql`
        INSERT INTO public.dm_logs (
          workspace_id, automation_id, comment_id, media_id,
          commenter_id, commenter_username, comment_text,
          matched_keyword, status, error_message
        ) VALUES (
          ${input.workspaceId},
          ${input.automationId},
          ${input.commentId},
          ${input.mediaId},
          ${input.commenterId},
          ${input.commenterUsername},
          ${input.commentText},
          ${input.matchedKeyword},
          ${input.status},
          ${input.errorMessage ?? null}
        )
      `;
    }
    return;
  } catch (fullErr) {
    console.warn('[Meta Webhook] dm_logs full insert failed, retrying minimal', fullErr);
  }

  // Minimal fallback when older schemas lack comment_text / media_id / etc.
  try {
    await sql`
      INSERT INTO public.dm_logs (
        workspace_id, automation_id, comment_id,
        commenter_id, matched_keyword, status, error_message
      ) VALUES (
        ${input.workspaceId},
        ${input.automationId},
        ${input.commentId},
        ${input.commenterId},
        ${input.matchedKeyword},
        ${input.status},
        ${input.errorMessage ?? null}
      )
    `;
  } catch (minimalErr) {
    console.warn('[Meta Webhook] dm_logs minimal insert failed', minimalErr);
  }
}

/**
 * GET — Meta webhook verification challenge.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const verifyToken = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const expected = expectedVerifyToken();
  const received = String(verifyToken ?? '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .trim();

  if (
    mode === 'subscribe' &&
    expected.length > 0 &&
    received === expected &&
    challenge != null
  ) {
    console.log('[Meta Webhook Verified]', challenge);
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  console.warn('[Meta Webhook Verification Failed]', {
    mode,
    received: verifyToken,
    expected,
  });
  return new Response('Forbidden', { status: 403 });
}

/**
 * POST — Incoming Instagram / Page comment → Private Reply DM.
 */
export async function POST(request: Request) {
  try {
    let body: WebhookBody;
    try {
      body = (await request.json()) as WebhookBody;
    } catch {
      console.warn('[Meta Webhook] invalid JSON body');
      return ok();
    }

    console.log('[Meta Webhook Incoming]', JSON.stringify(body, null, 2));

    const objectType = String(body?.object || '').toLowerCase();
    if (objectType && objectType !== 'instagram' && objectType !== 'page') {
      console.log('[Meta Webhook] Ignoring object type:', objectType);
      return ok();
    }

    const entry = body?.entry?.[0];
    const entryId = entry?.id ? String(entry.id) : '';
    const change = entry?.changes?.[0];
    const field = change?.field ? String(change.field) : '';
    const value = change?.value;

    if (!value) {
      console.log('[Meta Webhook] No change value present, ignoring.');
      return ok();
    }

    const item = String(value.item || '').toLowerCase();
    const verb = String(value.verb || 'add').toLowerCase();
    if (field === 'feed' && item && item !== 'comment') {
      console.log('[Meta Webhook] Ignoring non-comment feed item:', item);
      return ok();
    }
    if (verb && verb !== 'add' && verb !== 'edited') {
      console.log('[Meta Webhook] Ignoring verb:', verb);
      return ok();
    }

    const from = (value.from || {}) as {
      id?: string;
      username?: string;
      name?: string;
    };
    const media = (value.media || {}) as { id?: string };

    const commentId = String(value.id || value.comment_id || '').trim();
    const commentText = String(value.text || value.message || '').trim();
    const mediaId = String(media.id || value.post_id || '').trim() || null;
    const commenterId = String(from.id || value.sender_id || '').trim();
    const commenterUsername =
      (from.username && String(from.username)) ||
      (from.name && String(from.name)) ||
      null;

    console.log('[Meta Webhook Parsed]', {
      object: objectType,
      entryId,
      field,
      commentId,
      commentText,
      commenterId,
      commenterUsername,
      mediaId,
    });

    // Ignore empty comments
    if (!commentId || !commentText) {
      return ok();
    }

    // Ignore self-comments
    if (commenterId && entryId && commenterId === entryId) {
      console.log('[Meta Webhook] Self-comment detected, skipping auto-DM.');
      return ok();
    }

    if (!process.env.DATABASE_URL?.trim()) {
      console.warn('[Meta Webhook] DATABASE_URL missing');
      return ok();
    }

    // Ensure dm_logs / dm_automations columns exist (incl. comment_text).
    try {
      await ensureDmAutomationsSchema();
    } catch (schemaErr) {
      console.warn('[Meta Webhook] schema ensure failed', schemaErr);
    }

    // Workspace token lookup: platform_user_id === entryId
    const account = await lookupSocialAccount(entryId);
    if (!account) {
      console.warn(
        '[Meta Webhook] No active social account found for ID:',
        entryId
      );
      return ok();
    }

    const rules = await loadActiveAutomations(account.workspace_id);
    if (rules.length === 0) {
      console.log(
        '[Meta Webhook] No active dm_automations for workspace',
        account.workspace_id
      );
      return ok();
    }

    const cleaned = cleanCommentText(commentText);
    let matchedRule: AutomationRow | null = null;
    let matchedKeyword: string | null = null;

    for (const rule of rules) {
      const keywords = parseKeywords(rule.trigger_keywords);
      const kw =
        findMatchingKeyword(commentText, keywords) ||
        findMatchingKeyword(cleaned, keywords);
      if (kw) {
        matchedRule = rule;
        matchedKeyword = kw;
        break;
      }
    }

    if (!matchedRule || !matchedKeyword) {
      console.log('[Meta Webhook] No keyword match for comment:', commentText);
      return ok();
    }

    console.log('[Meta Webhook] Matched rule', {
      automationId: matchedRule.id,
      keyword: matchedKeyword,
      title: matchedRule.title,
    });

    const messageText = buildDmText(matchedRule);
    if (!messageText) {
      console.warn('[Meta Webhook] Empty DM body for rule', matchedRule.id);
      return ok();
    }

    // Spec: POST /{entryId}/messages with recipient.comment_id
    // Also try stored IG / Page ids if entryId endpoint fails.
    const messagingEndpointIds = [
      entryId,
      account.platform_user_id,
      account.page_id,
    ].filter((id, idx, arr): id is string =>
      Boolean(id && String(id).trim() && arr.indexOf(id) === idx)
    );

    let dmMessageId: string | null = null;
    let lastGraphError: string | null = null;

    for (const endpointId of messagingEndpointIds) {
      const messagingUrl = `https://graph.facebook.com/v21.0/${encodeURIComponent(
        endpointId
      )}/messages`;
      const dispatchPayload = {
        recipient: {
          comment_id: commentId,
        },
        message: {
          text: messageText,
        },
      };

      try {
        const graphRes = await fetch(messagingUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${account.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dispatchPayload),
        });
        const graphData = (await graphRes.json().catch(() => ({}))) as {
          message_id?: string;
          id?: string;
          error?: { message?: string };
        };
        console.log('[Meta Private Reply Result]', graphRes.status, graphData);

        if (graphRes.ok && (graphData.message_id || graphData.id)) {
          dmMessageId = String(graphData.message_id || graphData.id);
          lastGraphError = null;
          break;
        }
        lastGraphError =
          graphData.error?.message ||
          `private_reply_failed_${graphRes.status}`;
      } catch (fetchErr) {
        lastGraphError =
          fetchErr instanceof Error
            ? fetchErr.message
            : 'private_reply_network_error';
        console.warn(
          '[Meta Private Reply network]',
          endpointId,
          lastGraphError
        );
      }
    }

    // Optional public comment reply
    if (
      matchedRule.reply_to_comment_publicly === true &&
      String(matchedRule.public_comment_text || '').trim()
    ) {
      try {
        const replyRes = await fetch(
          `https://graph.facebook.com/v21.0/${encodeURIComponent(commentId)}/replies`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${account.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: String(matchedRule.public_comment_text).trim(),
            }),
          }
        );
        const replyData = await replyRes.json().catch(() => ({}));
        console.log('[Meta Public Reply Result]', replyRes.status, replyData);
      } catch (replyErr) {
        console.warn('[Meta Webhook] public comment reply failed', replyErr);
      }
    }

    if (dmMessageId) {
      await insertDmLog({
        workspaceId: account.workspace_id,
        automationId: matchedRule.id,
        commentId,
        mediaId,
        commenterId: commenterId || 'unknown',
        commenterUsername,
        commentText,
        matchedKeyword,
        status: 'sent',
        dmMessageId,
      });

      try {
        await sql`
          UPDATE public.dm_automations
          SET total_dms_sent = COALESCE(total_dms_sent, 0) + 1
          WHERE id = ${matchedRule.id}
        `;
      } catch (incErr) {
        console.warn('[Meta Webhook] total_dms_sent increment failed', incErr);
      }
    } else {
      await insertDmLog({
        workspaceId: account.workspace_id,
        automationId: matchedRule.id,
        commentId,
        mediaId,
        commenterId: commenterId || 'unknown',
        commenterUsername,
        commentText,
        matchedKeyword,
        status: 'failed',
        errorMessage: lastGraphError || 'private_reply_failed',
      });
      console.warn(
        '[Meta Webhook] Private reply failed for comment',
        commentId,
        lastGraphError
      );
    }

    return ok();
  } catch (error) {
    console.error('[Meta Webhook] unhandled error', error);
    return ok();
  }
}

/**
 * Meta Instagram / Page comments webhook — Comment-to-DM automation receiver.
 * GET: hub challenge verification
 * POST: keyword match → private reply (recipient.comment_id) + optional public reply
 *
 * CRITICAL: Always respond 200 within Meta's window so the subscription stays active.
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

/** Strip hashtags/punctuation and lowercase for keyword matching. */
function cleanCommentText(raw: string): string {
  return raw
    .toLowerCase()
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

async function lookupSocialAccount(
  entryId: string
): Promise<SocialAccountRow | null> {
  if (!process.env.DATABASE_URL?.trim() || !entryId) return null;
  try {
    const rows = await sql`
      SELECT workspace_id, platform, platform_user_id, page_id, access_token
      FROM public.social_accounts
      WHERE platform IN ('instagram', 'facebook')
        AND access_token IS NOT NULL
        AND access_token <> ''
        AND (
          platform_user_id = ${entryId}
          OR page_id = ${entryId}
          OR COALESCE(meta->>'ig_user_id', '') = ${entryId}
        )
      ORDER BY CASE WHEN platform = 'instagram' THEN 0 ELSE 1 END
      LIMIT 1
    `;
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row?.workspace_id || !row?.access_token) return null;
    return {
      workspace_id: String(row.workspace_id),
      platform: String(row.platform),
      platform_user_id: String(row.platform_user_id || ''),
      page_id: row.page_id != null ? String(row.page_id) : null,
      access_token: String(row.access_token),
    };
  } catch (error) {
    console.warn('[Meta Webhook] social_accounts lookup failed', error);
    return null;
  }
}

async function loadActiveAutomations(
  workspaceId: string
): Promise<AutomationRow[]> {
  try {
    await ensureDmAutomationsSchema();
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

async function recentlyMessaged(
  workspaceId: string,
  commenterId: string
): Promise<boolean> {
  try {
    const rows = await sql`
      SELECT id FROM public.dm_logs
      WHERE workspace_id = ${workspaceId}
        AND commenter_id = ${commenterId}
        AND status = 'sent'
        AND COALESCE(created_at, sent_at, to_timestamp(0))
              >= (now() - interval '10 minutes')
      LIMIT 1
    `;
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const verifyToken = (process.env.META_WEBHOOK_VERIFY_TOKEN ?? '').trim();

  if (
    mode === 'subscribe' &&
    verifyToken.length > 0 &&
    token === verifyToken &&
    challenge != null
  ) {
    return new Response(challenge, { status: 200 });
  }

  return new Response('Forbidden', { status: 403 });
}

export async function POST(request: Request) {
  // Meta MUST receive 200 quickly — never throw out of this handler.
  try {
    let body: WebhookBody;
    try {
      body = (await request.json()) as WebhookBody;
    } catch {
      console.warn('[Meta Webhook] invalid JSON body');
      return NextResponse.json({ success: true, received: true }, { status: 200 });
    }

    console.log('[Meta Webhook Incoming]', JSON.stringify(body, null, 2));

    const objectType = String(body?.object || '').toLowerCase();
    if (objectType && objectType !== 'instagram' && objectType !== 'page') {
      console.log('[Meta Webhook] Ignoring object type:', objectType);
      return NextResponse.json({ success: true, received: true }, { status: 200 });
    }

    const entry = body?.entry?.[0];
    const entryId = entry?.id ? String(entry.id) : '';
    const change = entry?.changes?.[0];
    const field = change?.field ? String(change.field) : '';
    const value = change?.value;

    if (!value) {
      console.log('[Meta Webhook] No change value present, ignoring.');
      return NextResponse.json({ success: true, received: true }, { status: 200 });
    }

    // Skip non-comment feed noise (likes, shares, etc.).
    const item = String(value.item || '').toLowerCase();
    const verb = String(value.verb || 'add').toLowerCase();
    if (field === 'feed' && item && item !== 'comment') {
      console.log('[Meta Webhook] Ignoring non-comment feed item:', item);
      return NextResponse.json({ success: true, received: true }, { status: 200 });
    }
    if (verb && verb !== 'add' && verb !== 'edited') {
      console.log('[Meta Webhook] Ignoring verb:', verb);
      return NextResponse.json({ success: true, received: true }, { status: 200 });
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
    const commenterId = String(
      from.id || value.sender_id || ''
    ).trim();
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
      mediaId,
      commenterId,
      commenterUsername,
    });

    // Guard: Ignore empty comments
    if (!commentId || !commentText) {
      return NextResponse.json({ success: true, received: true }, { status: 200 });
    }

    // Guard: Self-comment check (don't trigger on creator's own comments)
    if (commenterId && entryId && commenterId === entryId) {
      console.log('[Meta Webhook] Self-comment detected, skipping auto-DM.');
      return NextResponse.json({ success: true, received: true }, { status: 200 });
    }

    if (!process.env.DATABASE_URL?.trim()) {
      console.warn('[Meta Webhook] DATABASE_URL missing — cannot match automations.');
      return NextResponse.json({ success: true, received: true }, { status: 200 });
    }

    // Supabase / Postgres workspace & Page Access Token lookup
    const account = await lookupSocialAccount(entryId);
    if (!account) {
      console.warn(
        '[Meta Webhook] No active social account found for ID:',
        entryId
      );
      return NextResponse.json({ success: true, received: true }, { status: 200 });
    }

    const rules = await loadActiveAutomations(account.workspace_id);
    if (rules.length === 0) {
      console.log(
        '[Meta Webhook] No active dm_automations for workspace',
        account.workspace_id
      );
      return NextResponse.json({ success: true, received: true }, { status: 200 });
    }

    const cleaned = cleanCommentText(commentText);
    let matchedRule: AutomationRow | null = null;
    let matchedKeyword: string | null = null;

    for (const rule of rules) {
      const keywords = parseKeywords(rule.trigger_keywords);
      // Match against both raw + cleaned text (covers #hundra / HUNDRA / punctuation).
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
      return NextResponse.json({ success: true, received: true }, { status: 200 });
    }

    console.log('[Meta Webhook] Matched rule', {
      automationId: matchedRule.id,
      keyword: matchedKeyword,
      title: matchedRule.title,
    });

    if (commenterId && (await recentlyMessaged(account.workspace_id, commenterId))) {
      console.log('[Meta Webhook] Rate-limited (10m) for commenter', commenterId);
      try {
        await sql`
          INSERT INTO public.dm_logs (
            workspace_id, automation_id, comment_id, media_id,
            commenter_id, commenter_username, comment_text,
            matched_keyword, status, error_message
          ) VALUES (
            ${account.workspace_id},
            ${matchedRule.id},
            ${commentId},
            ${mediaId},
            ${commenterId || 'unknown'},
            ${commenterUsername},
            ${commentText},
            ${matchedKeyword},
            'skipped',
            ${'rate_limited_10m'}
          )
        `;
      } catch (logErr) {
        console.warn('[Meta Webhook] dm_logs skip insert failed', logErr);
      }
      return NextResponse.json({ success: true, received: true }, { status: 200 });
    }

    const dmText = buildDmText(matchedRule);
    if (!dmText) {
      console.warn('[Meta Webhook] Matched rule has empty DM body', matchedRule.id);
      return NextResponse.json({ success: true, received: true }, { status: 200 });
    }

    // Prefer entryId (IG scoped / Page id from webhook), then stored ids.
    const messagingEndpointIds = [
      entryId,
      account.platform_user_id,
      account.page_id,
    ].filter((id, idx, arr): id is string =>
      Boolean(id && String(id).trim() && arr.indexOf(id) === idx)
    );

    let dmMessageId: string | null = null;
    let lastGraphError: string | null = null;

    // Private Reply REQUIRES recipient.comment_id — never recipient.id / from.id.
    if (!commentId) {
      console.warn(
        '[Meta Webhook] Refusing Private Reply — missing commentId'
      );
      return NextResponse.json({ success: true, received: true }, { status: 200 });
    }

    for (const endpointId of messagingEndpointIds) {
      // CRITICAL: Meta Instagram Graph API Private Reply shape (v21.0).
      const messagingUrl = `https://graph.facebook.com/v21.0/${encodeURIComponent(
        endpointId
      )}/messages`;
      const dispatchPayload = {
        recipient: { comment_id: commentId },
        message: { text: dmText },
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
        console.log('[Meta DM Dispatch Result]', graphRes.status, graphData);

        if (graphRes.ok && (graphData.message_id || graphData.id)) {
          dmMessageId = String(graphData.message_id || graphData.id);
          lastGraphError = null;
          break;
        }
        lastGraphError =
          graphData.error?.message || `private_reply_failed_${graphRes.status}`;
      } catch (fetchErr) {
        lastGraphError =
          fetchErr instanceof Error
            ? fetchErr.message
            : 'private_reply_network_error';
        console.warn('[Meta DM Dispatch network]', endpointId, lastGraphError);
      }
    }

    // Optional public comment reply
    if (
      matchedRule.reply_to_comment_publicly === true &&
      String(matchedRule.public_comment_text || '').trim()
    ) {
      const replyUrl = `https://graph.facebook.com/v21.0/${encodeURIComponent(
        commentId
      )}/replies`;
      try {
        const replyRes = await fetch(replyUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${account.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: String(matchedRule.public_comment_text).trim(),
          }),
        });
        const replyData = await replyRes.json().catch(() => ({}));
        console.log('[Meta Public Reply Result]', replyRes.status, replyData);
      } catch (replyErr) {
        console.warn('[Meta Webhook] public comment reply failed', replyErr);
      }
    }

    if (dmMessageId) {
      try {
        await sql`
          INSERT INTO public.dm_logs (
            workspace_id, automation_id, comment_id, media_id,
            commenter_id, commenter_username, comment_text,
            dm_message_id, matched_keyword, status
          ) VALUES (
            ${account.workspace_id},
            ${matchedRule.id},
            ${commentId},
            ${mediaId},
            ${commenterId || 'unknown'},
            ${commenterUsername},
            ${commentText},
            ${dmMessageId},
            ${matchedKeyword},
            'sent'
          )
        `;
      } catch (logErr) {
        console.warn('[Meta Webhook] dm_logs sent insert failed', logErr);
      }

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
      try {
        await sql`
          INSERT INTO public.dm_logs (
            workspace_id, automation_id, comment_id, media_id,
            commenter_id, commenter_username, comment_text,
            matched_keyword, status, error_message
          ) VALUES (
            ${account.workspace_id},
            ${matchedRule.id},
            ${commentId},
            ${mediaId},
            ${commenterId || 'unknown'},
            ${commenterUsername},
            ${commentText},
            ${matchedKeyword},
            'failed',
            ${lastGraphError || 'private_reply_failed'}
          )
        `;
      } catch (logErr) {
        console.warn('[Meta Webhook] dm_logs failed insert failed', logErr);
      }
      console.warn(
        '[Meta Webhook] Private reply failed for comment',
        commentId,
        lastGraphError
      );
    }

    return NextResponse.json(
      {
        success: true,
        received: true,
        matched: true,
        sent: Boolean(dmMessageId),
        automationId: matchedRule.id,
        keyword: matchedKeyword,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Meta Webhook] unhandled error', error);
    return NextResponse.json({ success: true }, { status: 200 });
  }
}

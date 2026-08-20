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
import {
  cleanTriggerKeywords,
  findMatchingKeyword,
} from '@/lib/dm-automations/keywords';

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
  /** Page Access Token used for Graph Private Reply. */
  access_token: string;
  /** Instagram Business Account id (media/comments lookups). */
  ig_user_id: string | null;
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
    if (!row?.workspace_id) return null;
    const meta =
      row.meta && typeof row.meta === 'object'
        ? (row.meta as Record<string, unknown>)
        : {};
    // Prefer meta.page_access_token (true Page token); fall back to access_token column.
    const pageAccessToken =
      (typeof meta.page_access_token === 'string' &&
        meta.page_access_token.trim()) ||
      String(row.access_token || '').trim();

    const platform = String(row.platform || '');
    const platformUserId = String(row.platform_user_id || '');
    const metaPageId =
      typeof meta.page_id === 'string' && meta.page_id.trim()
        ? meta.page_id.trim()
        : '';
    const metaIg =
      typeof meta.ig_user_id === 'string' ? meta.ig_user_id.trim() : '';
    const igUserId =
      platform === 'instagram'
        ? platformUserId
        : metaIg || null;

    // Keep rows even without a token so Private Reply can log explicit warnings.
    return {
      workspace_id: String(row.workspace_id),
      platform,
      platform_user_id: platformUserId,
      // page_id can live either in the dedicated column or inside `meta`.
      page_id:
        row.page_id != null && String(row.page_id).trim()
          ? String(row.page_id).trim()
          : metaPageId
            ? metaPageId
            : null,
      access_token: pageAccessToken,
      ig_user_id: igUserId,
    } satisfies SocialAccountRow;
  };

  try {
    // Match IG scoped id, Page id on page_id, or Page id stored as platform_user_id.
    // Prefer workspaces that actually have active Comment-to-DM rules, then Page tokens.
    const matched = await sql`
      SELECT
        sa.workspace_id, sa.platform, sa.platform_user_id, sa.page_id,
        sa.access_token, sa.meta,
        EXISTS (
          SELECT 1
          FROM public.dm_automations a
          WHERE a.workspace_id = sa.workspace_id
            AND a.is_active = true
        ) AS has_active_rules,
        (COALESCE(sa.meta->>'page_access_token', '') <> '') AS has_page_token
      FROM public.social_accounts sa
      WHERE sa.platform IN ('instagram', 'facebook')
        AND (
          (sa.access_token IS NOT NULL AND sa.access_token <> '')
          OR COALESCE(sa.meta->>'page_access_token', '') <> ''
        )
        AND (
          sa.platform_user_id = ${entryId}
          OR sa.page_id = ${entryId}
          OR COALESCE(sa.meta->>'ig_user_id', '') = ${entryId}
          OR COALESCE(sa.meta->>'page_id', '') = ${entryId}
        )
      ORDER BY
        CASE WHEN EXISTS (
          SELECT 1 FROM public.dm_automations a
          WHERE a.workspace_id = sa.workspace_id AND a.is_active = true
        ) THEN 0 ELSE 1 END,
        CASE WHEN COALESCE(sa.meta->>'page_access_token', '') <> '' THEN 0 ELSE 1 END,
        CASE WHEN sa.page_id IS NOT NULL AND sa.page_id <> '' THEN 0 ELSE 1 END,
        CASE WHEN sa.platform = 'instagram' THEN 0 ELSE 1 END
      LIMIT 10
    `;
    const list = Array.isArray(matched)
      ? (matched as Record<string, unknown>[])
      : [];
    const primary = mapRow(list[0]);
    if (!primary) return null;

    const workspaceId = primary.workspace_id;

    // Prefer IG sibling in the chosen workspace for POST /{igUserId}/messages.
    const igSibling =
      list.find(
        (r) =>
          r.platform === 'instagram' &&
          String(r.workspace_id) === workspaceId
      ) || list.find((r) => r.platform === 'instagram');

    const fbSibling =
      list.find(
        (r) =>
          r.platform === 'facebook' &&
          String(r.workspace_id) === workspaceId
      ) || list.find((r) => r.platform === 'facebook');

    let account = igSibling ? mapRow(igSibling) : primary;
    if (!account) return null;

    // Always prefer Page Access Token from FB sibling when IG lacks meta.page_access_token.
    // Also fill page_id from the Facebook Page row (required for /{page-id}/messages).
    const fbMapped = fbSibling ? mapRow(fbSibling) : null;
    if (fbMapped) {
      const igMetaTok = String(
        ((igSibling?.meta as Record<string, unknown> | undefined)
          ?.page_access_token as string) || ''
      ).trim();
      if (!igMetaTok && fbMapped.access_token) {
        account = { ...account, access_token: fbMapped.access_token };
      }
      if (!account.page_id) {
        const fbPageId =
          fbMapped.page_id ||
          (fbMapped.platform === 'facebook'
            ? fbMapped.platform_user_id
            : null);
        if (fbPageId) {
          account = { ...account, page_id: fbPageId };
        }
      }
    }

    // meta.page_id fallback on the IG row itself
    if (!account.page_id && igSibling?.meta && typeof igSibling.meta === 'object') {
      const metaPage = (igSibling.meta as Record<string, unknown>).page_id;
      if (typeof metaPage === 'string' && metaPage.trim()) {
        account = { ...account, page_id: metaPage.trim() };
      }
    }

    if (
      account.platform === 'facebook' ||
      (!account.ig_user_id && primary.page_id === entryId)
    ) {
      try {
        const igRows = await sql`
          SELECT workspace_id, platform, platform_user_id, page_id, access_token, meta
          FROM public.social_accounts
          WHERE workspace_id = ${workspaceId}
            AND platform = 'instagram'
            AND access_token IS NOT NULL
            AND access_token <> ''
            AND (
              page_id = ${entryId}
              OR page_id = ${account.page_id}
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
        if (ig) {
          account = {
            ...ig,
            access_token:
              ig.access_token ||
              fbMapped?.access_token ||
              account.access_token,
          };
        }
      } catch {
        /* keep account */
      }
    }

    console.log('[Meta Webhook] Resolved account', {
      entryId,
      workspace_id: account.workspace_id,
      platform: account.platform,
      ig_user_id: account.ig_user_id,
      page_id: account.page_id,
      has_active_rules: list[0]?.has_active_rules,
    });

    return account;
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
        reply_to_comment_publicly, public_comment_text, is_active
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

/**
 * Resolve Facebook Page ID + Page Access Token for Private Reply.
 * Reads dedicated columns and meta.page_id / meta.page_access_token from
 * both Instagram and Facebook sibling rows in the same workspace.
 */
async function resolvePrivateReplyCredentials(
  account: SocialAccountRow,
  entryId: string
): Promise<{ pageId: string; pageAccessToken: string }> {
  let pageId =
    String(account.page_id || '').trim() ||
    (account.platform === 'facebook'
      ? String(account.platform_user_id || '').trim()
      : '') ||
    (!String(entryId).startsWith('1784') ? String(entryId).trim() : '');
  let pageAccessToken = String(account.access_token || '').trim();

  try {
    const rows = await sql`
      SELECT platform, platform_user_id, page_id, access_token, meta
      FROM public.social_accounts
      WHERE workspace_id = ${account.workspace_id}
        AND platform IN ('facebook', 'instagram')
      ORDER BY
        CASE WHEN platform = 'facebook' THEN 0 ELSE 1 END,
        CASE WHEN COALESCE(meta->>'page_access_token', '') <> '' THEN 0 ELSE 1 END,
        CASE WHEN page_id IS NOT NULL AND page_id <> '' THEN 0 ELSE 1 END
      LIMIT 10
    `;
    const list = Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];

    for (const row of list) {
      const meta =
        row.meta && typeof row.meta === 'object'
          ? (row.meta as Record<string, unknown>)
          : {};
      const metaPageId =
        typeof meta.page_id === 'string' ? meta.page_id.trim() : '';
      const colPageId =
        row.page_id != null ? String(row.page_id).trim() : '';
      const fbPlatformId =
        row.platform === 'facebook'
          ? String(row.platform_user_id || '').trim()
          : '';

      if (!pageId) {
        const candidate =
          colPageId ||
          metaPageId ||
          (fbPlatformId && !fbPlatformId.startsWith('1784')
            ? fbPlatformId
            : '');
        if (candidate && !candidate.startsWith('1784')) {
          pageId = candidate;
        }
      }

      const fromMeta =
        typeof meta.page_access_token === 'string'
          ? meta.page_access_token.trim()
          : '';
      if (fromMeta) {
        pageAccessToken = fromMeta;
        break;
      }
      if (row.platform === 'facebook' && row.access_token) {
        const tok = String(row.access_token).trim();
        if (tok) {
          pageAccessToken = tok;
          break;
        }
      }
    }

    // If we still lack a token but have pageId, prefer the FB row matching that page.
    if (pageId && !pageAccessToken) {
      const match = list.find((row) => {
        const meta =
          row.meta && typeof row.meta === 'object'
            ? (row.meta as Record<string, unknown>)
            : {};
        const col = row.page_id != null ? String(row.page_id).trim() : '';
        const metaPage =
          typeof meta.page_id === 'string' ? meta.page_id.trim() : '';
        const platformId = String(row.platform_user_id || '').trim();
        return (
          col === pageId ||
          metaPage === pageId ||
          (row.platform === 'facebook' && platformId === pageId)
        );
      });
      if (match) {
        const meta =
          match.meta && typeof match.meta === 'object'
            ? (match.meta as Record<string, unknown>)
            : {};
        const fromMeta =
          typeof meta.page_access_token === 'string'
            ? meta.page_access_token.trim()
            : '';
        pageAccessToken =
          fromMeta || String(match.access_token || '').trim();
      }
    }
  } catch (error) {
    console.warn('[Meta Webhook] Private Reply credential resolve failed', error);
  }

  return { pageId, pageAccessToken };
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
  // Ensure older DBs get commenter_id / comment_text before insert.
  try {
    await ensureDmAutomationsSchema();
  } catch {
    /* best-effort */
  }

  const recipientHandle =
    String(input.commenterUsername || '').trim() ||
    String(input.commenterId || '').trim() ||
    'unknown';
  // Live DB historically used delivered/failed; map sent → delivered.
  const status =
    input.status === 'sent' ? 'delivered' : input.status;

  const attempts: Array<() => Promise<unknown>> = [
    // Live schema (recipient_handle NOT NULL + optional commenter_*).
    async () => {
      await sql`
        INSERT INTO public.dm_logs (
          workspace_id, automation_id, platform,
          recipient_handle, recipient_id,
          trigger_comment_text, comment_text,
          comment_id, media_id,
          commenter_id, commenter_username,
          matched_keyword, dm_message_id,
          status, error_message
        ) VALUES (
          ${input.workspaceId},
          ${input.automationId},
          ${'instagram'},
          ${recipientHandle},
          ${input.commenterId || null},
          ${input.commentText},
          ${input.commentText},
          ${input.commentId},
          ${input.mediaId},
          ${input.commenterId || null},
          ${input.commenterUsername},
          ${input.matchedKeyword},
          ${input.dmMessageId ?? null},
          ${status},
          ${input.errorMessage ?? null}
        )
      `;
    },
    async () => {
      await sql`
        INSERT INTO public.dm_logs (
          workspace_id, automation_id, comment_id, media_id,
          commenter_id, commenter_username, comment_text,
          dm_message_id, matched_keyword, status, error_message
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
          ${input.status},
          ${input.errorMessage ?? null}
        )
      `;
    },
    async () => {
      await sql`
        INSERT INTO public.dm_logs (
          workspace_id, automation_id,
          recipient_handle, matched_keyword, status, error_message
        ) VALUES (
          ${input.workspaceId},
          ${input.automationId},
          ${recipientHandle},
          ${input.matchedKeyword},
          ${status},
          ${input.errorMessage ?? null}
        )
      `;
    },
  ];

  for (const attempt of attempts) {
    try {
      await attempt();
      return;
    } catch (err) {
      console.warn('[Meta Webhook] dm_logs insert attempt failed', err);
    }
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

    try {
      await ensureDmAutomationsSchema();
    } catch (schemaErr) {
      console.warn('[Meta Webhook] schema ensure skipped', schemaErr);
    }

    const objectType = String(body?.object || '').toLowerCase();
    if (objectType && objectType !== 'instagram' && objectType !== 'page') {
      console.log('[Meta Webhook] Ignoring object type:', objectType);
      return ok();
    }

    if (!process.env.DATABASE_URL?.trim()) {
      console.warn('[Meta Webhook] DATABASE_URL missing');
      return ok();
    }

    const entries = Array.isArray(body?.entry) ? body.entry : [];
    if (entries.length === 0) {
      console.log('[Meta Webhook] No entry[] present, ignoring.');
      return ok();
    }

    // Process every entry/change — Meta may batch multiple Instagram comments.
    for (const entry of entries) {
      const entryId = entry?.id ? String(entry.id) : '';
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      for (const change of changes) {
        try {
          await processCommentChange({
            objectType,
            entryId,
            field: change?.field ? String(change.field) : '',
            value: change?.value,
          });
        } catch (changeErr) {
          console.error('[Meta Webhook] change processing failed', changeErr);
        }
      }
    }

    return ok();
  } catch (error) {
    console.error('[Meta Webhook] unhandled error', error);
    return ok();
  }
}

type CommentChangeInput = {
  objectType: string;
  entryId: string;
  field: string;
  value: Record<string, unknown> | undefined;
};

/**
 * Handle one Instagram `comments` / Page `feed` comment change → Private Reply.
 */
async function processCommentChange(input: CommentChangeInput): Promise<void> {
  const { objectType, entryId, field, value } = input;

  if (!value) {
    console.log('[Meta Webhook] No change value present, ignoring.');
    return;
  }

  const fieldLower = String(field || '').toLowerCase();
  const item = String(value.item || '').toLowerCase();
  const verb = String(value.verb || '').toLowerCase();

  // Instagram product webhooks use field=comments|live_comments (no item/verb).
  // Page webhooks use field=feed with item=comment.
  const isInstagramCommentsField =
    fieldLower === 'comments' || fieldLower === 'live_comments';
  const isPageFeedComment =
    fieldLower === 'feed' && (!item || item === 'comment');
  const isBareCommentPayload =
    !fieldLower &&
    Boolean(value.id || value.comment_id) &&
    Boolean(value.text || value.message);

  if (fieldLower === 'feed' && item && item !== 'comment') {
    console.log('[Meta Webhook] Ignoring non-comment feed item:', item);
    return;
  }

  if (!isInstagramCommentsField && !isPageFeedComment && !isBareCommentPayload) {
    // Allow unknown fields that still look like comment payloads (forward-compat).
    if (!(value.id || value.comment_id) || !(value.text || value.message)) {
      console.log('[Meta Webhook] Ignoring non-comment field:', fieldLower || '(empty)');
      return;
    }
  }

  // Instagram comments rarely include verb; Page feed uses add|edited.
  if (verb && verb !== 'add' && verb !== 'edited') {
    console.log('[Meta Webhook] Ignoring verb:', verb);
    return;
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
    field: fieldLower || '(empty)',
    isInstagramCommentsField,
    commentId,
    commentText,
    commenterId,
    commenterUsername,
    mediaId,
  });

  if (!commentId || !commentText) {
    return;
  }

  // Ignore self-comments from the IG/Page account itself.
  if (commenterId && entryId && commenterId === entryId) {
    console.log('[Meta Webhook] Self-comment detected, skipping auto-DM.');
    return;
  }

  try {
    await ensureDmAutomationsSchema();
  } catch (schemaErr) {
    console.warn('[Meta Webhook] schema ensure failed', schemaErr);
  }

  const account = await lookupSocialAccount(entryId);
  if (!account) {
    console.warn(
      '[Meta Webhook] No active social account found for ID:',
      entryId
    );
    return;
  }

  const rules = await loadActiveAutomations(account.workspace_id);
  if (rules.length === 0) {
    console.log(
      '[Meta Webhook] No active dm_automations for workspace',
      account.workspace_id
    );
    return;
  }

  const cleaned = cleanCommentText(commentText);
  const cleanKeywordsByRule = rules.map((rule) => ({
    id: String(rule.id),
    title: rule.title || null,
    cleanKeywords: cleanTriggerKeywords(rule.trigger_keywords),
  }));

  let matchedRule: AutomationRow | null = null;
  let matchedKeyword: string | null = null;

  for (const rule of rules) {
    const cleanKeywords = cleanTriggerKeywords(rule.trigger_keywords);
    const kw =
      findMatchingKeyword(commentText, cleanKeywords) ||
      findMatchingKeyword(cleaned, cleanKeywords);
    if (kw) {
      matchedRule = rule;
      matchedKeyword = kw;
      break;
    }
  }

  console.log('[Meta Matcher Check]', {
    commentText,
    cleaned,
    cleanKeywords: cleanKeywordsByRule,
    matchedRule: matchedRule
      ? {
          id: matchedRule.id,
          title: matchedRule.title || null,
          keyword: matchedKeyword,
        }
      : null,
  });

  if (!matchedRule || !matchedKeyword) {
    console.log('[Meta Webhook] No keyword match for comment:', {
      commentText,
      cleaned,
      ruleCount: rules.length,
      ruleKeywords: cleanKeywordsByRule.map((r) => r.cleanKeywords),
    });
    return;
  }

  console.log('[Meta Webhook] Matched rule', {
    automationId: matchedRule.id,
    keyword: matchedKeyword,
    title: matchedRule.title,
  });

  const messageText = buildDmText(matchedRule);
  if (!messageText) {
    console.warn('[Meta Webhook] Empty DM body for rule', matchedRule.id);
    return;
  }

  // Private Reply MUST use Facebook Page ID + Page Access Token.
  const igUserId =
    account.ig_user_id ||
    (account.platform === 'instagram' ? account.platform_user_id : '') ||
    (String(entryId).startsWith('1784') ? entryId : '');

  const { pageId, pageAccessToken } = await resolvePrivateReplyCredentials(
    account,
    entryId
  );

  if (!pageAccessToken) {
    console.warn(
      '[Meta Webhook] Missing page_access_token for Private Reply — reconnect Instagram with a linked Facebook Page (pages_manage_metadata) so meta.page_access_token is stored.',
      {
        workspace: account.workspace_id,
        igUserId: igUserId || null,
        facebook_page_id: pageId || null,
        platform: account.platform,
        platform_user_id: account.platform_user_id,
        has_column_page_id: Boolean(account.page_id),
      }
    );
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
      errorMessage: 'missing_page_access_token',
    });
    return;
  }

  if (!pageId) {
    console.warn(
      '[Meta Webhook] Missing facebook_page_id for Private Reply — reconnect Instagram so social_accounts.page_id / meta.page_id is stored from the linked Facebook Page.',
      {
        workspace: account.workspace_id,
        igUserId: igUserId || null,
        entryId,
        platform: account.platform,
        platform_user_id: account.platform_user_id,
        has_page_access_token: Boolean(pageAccessToken),
      }
    );
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
      errorMessage: 'missing_facebook_page_id',
    });
    return;
  }

  console.log('[Meta Webhook] Private Reply credentials resolved', {
    facebook_page_id: pageId,
    igUserId: igUserId || null,
    has_page_access_token: true,
    token_prefix: `${pageAccessToken.slice(0, 8)}…`,
  });

  const messagingUrl = `https://graph.facebook.com/v21.0/${encodeURIComponent(
    pageId
  )}/messages`;
  const dmText = String(matchedRule.dm_message_text || '').trim();
  const ctaUrl = String(matchedRule.cta_button_url || '').trim();
  const privateReplyText = ctaUrl
    ? `${dmText}\n\n${ctaUrl}`.trim()
    : dmText || messageText;
  const dispatchPayload = {
    recipient: {
      comment_id: commentId,
    },
    message: {
      text: privateReplyText,
    },
  };

  let dmMessageId: string | null = null;
  let lastGraphError: string | null = null;
  let dmResStatus: number | null = null;
  let publicResStatus: number | null = null;

  try {
    const dmRes = await fetch(messagingUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pageAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dispatchPayload),
    });
    dmResStatus = dmRes.status;
    const graphData = (await dmRes.json().catch(() => ({}))) as {
      message_id?: string;
      id?: string;
      error?: { message?: string; code?: number };
    };

    if (dmRes.ok && (graphData.message_id || graphData.id)) {
      dmMessageId = String(graphData.message_id || graphData.id);
    } else {
      lastGraphError =
        graphData.error?.message ||
        `private_reply_failed_${dmRes.status}`;
    }
  } catch (fetchErr) {
    lastGraphError =
      fetchErr instanceof Error
        ? fetchErr.message
        : 'private_reply_network_error';
    console.warn('[Meta Private Reply network]', pageId, lastGraphError);
  }

  const shouldPublicReply = matchedRule.reply_to_comment_publicly !== false;
  if (shouldPublicReply) {
    const publicText =
      String(matchedRule.public_comment_text || '').trim() ||
      'Kolla din DM! Jag har skickat länken till dig. 📬';
    try {
      const publicRes = await fetch(
        `https://graph.facebook.com/v21.0/${encodeURIComponent(commentId)}/replies`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${pageAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: publicText }),
        }
      );
      publicResStatus = publicRes.status;
      const replyData = await publicRes.json().catch(() => ({}));
      if (!publicRes.ok) {
        console.warn('[Meta Public Reply failed]', publicRes.status, replyData);
      }
    } catch (replyErr) {
      console.warn('[Meta Webhook] public comment reply failed', replyErr);
    }
  }

  console.log('[Meta Live Private Reply & Public Comment Sent]', {
    commentId,
    pageId,
    dmStatus: dmResStatus,
    publicReplyStatus: publicResStatus,
    dmMessageId,
    matchedKeyword,
  });

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
}

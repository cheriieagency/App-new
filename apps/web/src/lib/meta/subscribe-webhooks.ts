/**
 * Register Meta webhooks via POST /{page-id}/subscribed_apps (Graph API v21.0).
 *
 * Page subscription includes feed + messages + Instagram `comments` so
 * Comment-to-DM receives IG comment events on linked Business accounts.
 *
 * ALWAYS use a Page Access Token (from /me/accounts) — User tokens → Error #3.
 * Instagram-scoped subscribed_apps is best-effort only (Page Access Token).
 */

/** Instagram Graph webhook fields (Comment-to-DM + messaging). */
export const INSTAGRAM_SUBSCRIBED_FIELDS = 'comments,messages,mentions';

/**
 * Facebook Page webhook fields — includes Instagram `comments` alongside
 * feed + messaging so Re-sync / OAuth covers Comment-to-DM delivery.
 */
export const FACEBOOK_PAGE_SUBSCRIBED_FIELDS =
  'feed,messages,messaging_postbacks,comments';

/** Fallback if Meta rejects `comments` on the Page edge. */
const FACEBOOK_PAGE_SUBSCRIBED_FIELDS_FALLBACK =
  'feed,messages,messaging_postbacks';

export type SubscribeWebhooksResult = {
  ok: boolean;
  targetId: string;
  fields?: string;
  error?: string;
  errorCode?: number;
  status?: number;
  raw?: unknown;
  usedFallback?: boolean;
};

export type MetaPageTokenRow = {
  pageId: string;
  pageName?: string;
  pageAccessToken: string;
  igUserId?: string | null;
};

/** Detect Instagram Business Account ids (often start with 1784…). */
export function isInstagramAccountId(
  platform: string | null | undefined,
  platformUserId: string | null | undefined
): boolean {
  const id = String(platformUserId || '').trim();
  return (
    String(platform || '').toLowerCase() === 'instagram' ||
    id.startsWith('1784')
  );
}

/** Canonical subscribed_fields for Page (and diagnostic) targets. */
export function subscribedFieldsForAccount(
  _platform?: string | null,
  _platformUserId?: string | null
): string {
  return FACEBOOK_PAGE_SUBSCRIBED_FIELDS;
}

/**
 * Resolve Page Access Tokens via Graph GET /me/accounts.
 * Required for subscribed_apps (User tokens → Error #3).
 */
export async function fetchPageAccessTokensFromUserToken(
  userAccessToken: string
): Promise<MetaPageTokenRow[]> {
  const token = String(userAccessToken || '').trim();
  if (!token) return [];

  const url = new URL('https://graph.facebook.com/v21.0/me/accounts');
  url.searchParams.set(
    'fields',
    'id,name,access_token,instagram_business_account{id}'
  );
  url.searchParams.set('access_token', token);

  try {
    const res = await fetch(url.toString());
    const data = (await res.json().catch(() => ({}))) as {
      data?: Array<{
        id?: string;
        name?: string;
        access_token?: string;
        instagram_business_account?: { id?: string };
      }>;
      error?: { message?: string; code?: number };
    };
    console.log('[Meta /me/accounts]', res.status, {
      pages: Array.isArray(data.data) ? data.data.length : 0,
      error: data.error,
    });
    if (!res.ok || data.error || !Array.isArray(data.data)) return [];

    return data.data
      .filter((p) => p.id && p.access_token && !String(p.id).startsWith('user-'))
      .map((p) => ({
        pageId: String(p.id),
        pageName: p.name ? String(p.name) : undefined,
        pageAccessToken: String(p.access_token),
        igUserId: p.instagram_business_account?.id
          ? String(p.instagram_business_account.id)
          : null,
      }));
  } catch (error) {
    console.warn('[Meta /me/accounts] network error', error);
    return [];
  }
}

function looksLikeInvalidCommentsField(result: SubscribeWebhooksResult): boolean {
  const msg = String(result.error || '').toLowerCase();
  return (
    msg.includes('comments') &&
    (msg.includes('subscribed_fields') ||
      msg.includes('invalid parameter') ||
      msg.includes('nonexisting field') ||
      msg.includes('unknown field') ||
      msg.includes('(#100)'))
  );
}

/**
 * Subscribe one Page (or optionally IG id) with subscribed_fields.
 * By default refuses Instagram Scoped IDs — pass allowInstagramId for
 * best-effort Instagram comments/messages subscription.
 */
export async function subscribeMetaAccountToAppWebhooks(input: {
  pageOrIgId: string;
  accessToken: string;
  /** Comma-separated subscribed_fields. */
  subscribedFields?: string;
  /** Allow POST /{instagram-id}/subscribed_apps (best-effort). */
  allowInstagramId?: boolean;
}): Promise<SubscribeWebhooksResult> {
  const targetId = String(input.pageOrIgId || '').trim();
  const accessToken = String(input.accessToken || '').trim();
  const subscribedFields =
    String(input.subscribedFields || '').trim() ||
    FACEBOOK_PAGE_SUBSCRIBED_FIELDS;

  if (!targetId || !accessToken) {
    return {
      ok: false,
      targetId,
      fields: subscribedFields,
      error: 'missing_page_or_token',
    };
  }

  if (isInstagramAccountId(null, targetId) && !input.allowInstagramId) {
    console.warn(
      '[meta/subscribe-webhooks] skipped IG-scoped id (use Page id, or allowInstagramId)',
      targetId
    );
    return {
      ok: false,
      targetId,
      fields: subscribedFields,
      error: 'skipped_instagram_scoped_id — subscribe the Facebook Page instead',
      errorCode: 3,
    };
  }

  const subUrl = `https://graph.facebook.com/v21.0/${encodeURIComponent(
    targetId
  )}/subscribed_apps?subscribed_fields=${encodeURIComponent(
    subscribedFields
  )}&access_token=${encodeURIComponent(accessToken)}`;

  try {
    const res = await fetch(subUrl, { method: 'POST' });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      error?: { message?: string; type?: string; code?: number };
    };

    console.log('[Meta Subscribed Apps Response]', res.status, json);

    if (!res.ok || json.error) {
      const message =
        json.error?.message || `subscribed_apps failed (${res.status})`;
      console.warn(
        '[meta/subscribe-webhooks]',
        targetId,
        subscribedFields,
        message,
        json.error
      );
      return {
        ok: false,
        targetId,
        fields: subscribedFields,
        error: message,
        errorCode: json.error?.code,
        status: res.status,
        raw: json,
      };
    }

    console.log('[meta/subscribe-webhooks] ok', targetId, subscribedFields);
    return {
      ok: true,
      targetId,
      fields: subscribedFields,
      status: res.status,
      raw: json,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'subscribed_apps_network_error';
    console.warn('[meta/subscribe-webhooks]', targetId, message);
    return {
      ok: false,
      targetId,
      fields: subscribedFields,
      error: message,
    };
  }
}

function shouldRetryWithPageToken(result: SubscribeWebhooksResult): boolean {
  if (result.ok) return false;
  if (result.status === 400 || result.status === 403) return true;
  if (result.errorCode === 3) return true;
  const msg = String(result.error || '').toLowerCase();
  return (
    msg.includes('(#3)') ||
    msg.includes('application does not have the capability') ||
    msg.includes('invalid oauth') ||
    msg.includes('cannot call this api')
  );
}

/**
 * Subscribe a Facebook Page with Page Access Token + optional fallback.
 * Includes Instagram `comments` in subscribed_fields; falls back if Meta rejects it.
 */
export async function subscribeWithPageTokenFallback(input: {
  targetId: string;
  platform?: string | null;
  /** Preferred Page Access Token. */
  pageAccessToken?: string | null;
  /** Fallback Page Access Token (workspace primary Page). */
  fallbackPageAccessToken?: string | null;
}): Promise<SubscribeWebhooksResult> {
  const targetId = String(input.targetId || '').trim();
  const fields = FACEBOOK_PAGE_SUBSCRIBED_FIELDS;
  const primary = String(input.pageAccessToken || '').trim();
  const fallback = String(input.fallbackPageAccessToken || '').trim();

  if (!targetId) {
    return { ok: false, targetId: '', fields, error: 'missing_target_id' };
  }

  // Page path only — IG targets use subscribeInstagramCommentsBestEffort.
  if (
    isInstagramAccountId(input.platform, targetId) ||
    String(input.platform || '').toLowerCase() === 'instagram'
  ) {
    return {
      ok: false,
      targetId,
      fields,
      error: 'skipped_instagram_scoped_id — subscribe the Facebook Page instead',
      errorCode: 3,
    };
  }

  async function attempt(accessToken: string): Promise<SubscribeWebhooksResult> {
    const withComments = await subscribeMetaAccountToAppWebhooks({
      pageOrIgId: targetId,
      accessToken,
      subscribedFields: FACEBOOK_PAGE_SUBSCRIBED_FIELDS,
    });
    if (withComments.ok) return withComments;

    // Meta sometimes rejects `comments` on the Page edge — keep feed+messages.
    if (looksLikeInvalidCommentsField(withComments)) {
      console.warn(
        '[meta/subscribe-webhooks] Page rejected comments field — retrying without it',
        targetId,
        withComments.error
      );
      const withoutComments = await subscribeMetaAccountToAppWebhooks({
        pageOrIgId: targetId,
        accessToken,
        subscribedFields: FACEBOOK_PAGE_SUBSCRIBED_FIELDS_FALLBACK,
      });
      return { ...withoutComments, usedFallback: true };
    }

    return withComments;
  }

  if (primary) {
    const first = await attempt(primary);
    if (first.ok || !shouldRetryWithPageToken(first) || !fallback || fallback === primary) {
      return first;
    }
    console.warn(
      '[meta/subscribe-webhooks] retrying with workspace primary Page token',
      targetId,
      first.error
    );
    const second = await attempt(fallback);
    return { ...second, usedFallback: true };
  }

  if (fallback) {
    const only = await attempt(fallback);
    return { ...only, usedFallback: true };
  }

  return {
    ok: false,
    targetId,
    fields,
    error: 'missing_page_access_token',
  };
}

/**
 * Best-effort: subscribe Instagram Business Account for `comments` + messages
 * using the linked Page Access Token (never a User token).
 */
export async function subscribeInstagramCommentsBestEffort(input: {
  igUserId: string;
  pageAccessToken: string;
}): Promise<SubscribeWebhooksResult> {
  const igUserId = String(input.igUserId || '').trim();
  const pageAccessToken = String(input.pageAccessToken || '').trim();
  if (!igUserId || !pageAccessToken) {
    return {
      ok: false,
      targetId: igUserId,
      fields: INSTAGRAM_SUBSCRIBED_FIELDS,
      error: 'missing_ig_id_or_page_token',
    };
  }

  const result = await subscribeMetaAccountToAppWebhooks({
    pageOrIgId: igUserId,
    accessToken: pageAccessToken,
    subscribedFields: INSTAGRAM_SUBSCRIBED_FIELDS,
    allowInstagramId: true,
  });

  if (!result.ok) {
    console.warn(
      '[meta/subscribe-webhooks] Instagram comments subscribe best-effort failed',
      { igUserId, error: result.error, errorCode: result.errorCode }
    );
  } else {
    console.log(
      '[meta/subscribe-webhooks] Instagram comments subscribed',
      igUserId,
      INSTAGRAM_SUBSCRIBED_FIELDS
    );
  }

  return result;
}

/**
 * After OAuth: subscribe each Facebook Page with feed/messages/comments,
 * then best-effort subscribe linked Instagram for comments+messages.
 */
export async function subscribePagesAndInstagramAfterOAuth(input: {
  pages: Array<{
    id?: string | null;
    access_token?: string | null;
    instagram_business_account?: { id?: string | null } | null;
  }>;
  /** Optional workspace primary page token for Error #3 fallback. */
  fallbackPageAccessToken?: string | null;
}): Promise<SubscribeWebhooksResult[]> {
  const results: SubscribeWebhooksResult[] = [];
  const seenPages = new Set<string>();
  const seenIg = new Set<string>();
  const fallback = String(input.fallbackPageAccessToken || '').trim();

  for (const page of input.pages) {
    const pageId = String(page.id || '').trim();
    const pageToken = String(page.access_token || '').trim();
    if (!pageId || !pageToken || pageId.startsWith('user-')) continue;
    if (isInstagramAccountId(null, pageId)) continue;

    if (!seenPages.has(pageId)) {
      seenPages.add(pageId);
      results.push(
        await subscribeWithPageTokenFallback({
          targetId: pageId,
          platform: 'facebook',
          pageAccessToken: pageToken,
          fallbackPageAccessToken: fallback || pageToken,
        })
      );
    }

    const igId = String(page.instagram_business_account?.id || '').trim();
    if (igId && !seenIg.has(igId)) {
      seenIg.add(igId);
      results.push(
        await subscribeInstagramCommentsBestEffort({
          igUserId: igId,
          pageAccessToken: pageToken,
        })
      );
    }
  }

  return results;
}

/** @deprecated Prefer subscribePagesAndInstagramAfterOAuth. */
export async function subscribePagesAfterOAuth(
  pages: Array<{
    id?: string | null;
    access_token?: string | null;
    instagram_business_account?: { id?: string | null } | null;
  }>
): Promise<SubscribeWebhooksResult[]> {
  return subscribePagesAndInstagramAfterOAuth({ pages });
}

/**
 * Subscribe Facebook Page (+ optional linked IG comments) after connect / re-sync.
 */
export async function subscribeMetaAccountsAfterConnect(input: {
  pageId?: string | null;
  pageAccessToken?: string | null;
  igUserId?: string | null;
  fallbackAccessToken?: string | null;
}): Promise<SubscribeWebhooksResult[]> {
  const results: SubscribeWebhooksResult[] = [];
  const pageToken =
    String(input.pageAccessToken || '').trim() ||
    String(input.fallbackAccessToken || '').trim();
  const pageId = String(input.pageId || '').trim();
  const fallback = String(input.fallbackAccessToken || '').trim();
  const igUserId = String(input.igUserId || '').trim();

  if (pageId && pageToken && !isInstagramAccountId(null, pageId)) {
    results.push(
      await subscribeWithPageTokenFallback({
        targetId: pageId,
        platform: 'facebook',
        pageAccessToken: pageToken,
        fallbackPageAccessToken: fallback,
      })
    );
  }

  if (igUserId && pageToken) {
    results.push(
      await subscribeInstagramCommentsBestEffort({
        igUserId,
        pageAccessToken: pageToken,
      })
    );
  }

  return results;
}

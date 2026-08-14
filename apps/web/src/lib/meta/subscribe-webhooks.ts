/**
 * Register a Facebook Page / Instagram account for this app's Meta webhooks
 * via POST /{id}/subscribed_apps (Graph API v21.0).
 *
 * STRICT: never mix Page fields with Instagram fields — Graph Error #100.
 * ALWAYS prefer a Page Access Token (from /me/accounts) — Graph Error #3
 * often means a User token was used where a Page token is required.
 */

/** Instagram Business Account webhook fields only. */
export const INSTAGRAM_SUBSCRIBED_FIELDS = 'comments,messages,mentions';

/** Facebook Page webhook fields only. */
export const FACEBOOK_PAGE_SUBSCRIBED_FIELDS =
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

export function subscribedFieldsForAccount(
  platform: string | null | undefined,
  platformUserId: string | null | undefined
): string {
  return isInstagramAccountId(platform, platformUserId)
    ? INSTAGRAM_SUBSCRIBED_FIELDS
    : FACEBOOK_PAGE_SUBSCRIBED_FIELDS;
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

/**
 * Subscribe one Page or IG Business account with platform-correct fields.
 * Uses query-string style (Meta subscribed_apps convention).
 */
export async function subscribeMetaAccountToAppWebhooks(input: {
  pageOrIgId: string;
  accessToken: string;
  /** Comma-separated subscribed_fields (required for strict split). */
  subscribedFields: string;
}): Promise<SubscribeWebhooksResult> {
  const targetId = String(input.pageOrIgId || '').trim();
  const accessToken = String(input.accessToken || '').trim();
  const subscribedFields = String(input.subscribedFields || '').trim();
  if (!targetId || !accessToken || !subscribedFields) {
    return {
      ok: false,
      targetId,
      fields: subscribedFields,
      error: 'missing_page_or_token_or_fields',
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
 * Subscribe with Page Access Token preference + automatic fallback token.
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
  const fields = subscribedFieldsForAccount(input.platform, targetId);
  const primary = String(input.pageAccessToken || '').trim();
  const fallback = String(input.fallbackPageAccessToken || '').trim();

  if (!targetId) {
    return { ok: false, targetId: '', fields, error: 'missing_target_id' };
  }

  if (primary) {
    const first = await subscribeMetaAccountToAppWebhooks({
      pageOrIgId: targetId,
      accessToken: primary,
      subscribedFields: fields,
    });
    if (first.ok || !shouldRetryWithPageToken(first) || !fallback || fallback === primary) {
      return first;
    }
    console.warn(
      '[meta/subscribe-webhooks] retrying with workspace primary Page token',
      targetId,
      first.error
    );
    const second = await subscribeMetaAccountToAppWebhooks({
      pageOrIgId: targetId,
      accessToken: fallback,
      subscribedFields: fields,
    });
    return { ...second, usedFallback: true };
  }

  if (fallback) {
    const only = await subscribeMetaAccountToAppWebhooks({
      pageOrIgId: targetId,
      accessToken: fallback,
      subscribedFields: fields,
    });
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
 * After OAuth: Page → feed,messages,messaging_postbacks
 *              IG Business → comments,messages,mentions
 * Always uses each page.access_token (Page Access Token).
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
  const seen = new Set<string>();
  const fallback = String(input.fallbackPageAccessToken || '').trim();

  for (const page of input.pages) {
    const pageId = String(page.id || '').trim();
    const pageToken = String(page.access_token || '').trim();
    if (!pageId || !pageToken || pageId.startsWith('user-')) continue;

    if (!seen.has(pageId)) {
      seen.add(pageId);
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
    if (igId && !seen.has(igId)) {
      seen.add(igId);
      results.push(
        await subscribeWithPageTokenFallback({
          targetId: igId,
          platform: 'instagram',
          pageAccessToken: pageToken,
          fallbackPageAccessToken: fallback || pageToken,
        })
      );
    }
  }

  return results;
}

/** @deprecated Prefer subscribePagesAndInstagramAfterOAuth */
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
 * Subscribe Page + Instagram ids with strict field split (best-effort).
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
  const igUserId = String(input.igUserId || '').trim();
  const fallback = String(input.fallbackAccessToken || '').trim();

  if (pageId && pageToken) {
    results.push(
      await subscribeWithPageTokenFallback({
        targetId: pageId,
        platform: 'facebook',
        pageAccessToken: pageToken,
        fallbackPageAccessToken: fallback,
      })
    );
  }

  if (igUserId && pageToken && igUserId !== pageId) {
    results.push(
      await subscribeWithPageTokenFallback({
        targetId: igUserId,
        platform: 'instagram',
        pageAccessToken: pageToken,
        fallbackPageAccessToken: fallback,
      })
    );
  }

  return results;
}

/**
 * Register a Facebook Page / Instagram account for this app's Meta webhooks
 * via POST /{id}/subscribed_apps (Graph API v21.0).
 *
 * STRICT: never mix Page fields with Instagram fields — Graph Error #100.
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
  raw?: unknown;
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
        raw: json,
      };
    }

    console.log(
      '[meta/subscribe-webhooks] ok',
      targetId,
      subscribedFields
    );
    return { ok: true, targetId, fields: subscribedFields, raw: json };
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

/**
 * After OAuth: Page → feed,messages,messaging_postbacks
 *              IG Business → comments,messages,mentions
 */
export async function subscribePagesAndInstagramAfterOAuth(input: {
  pages: Array<{
    id?: string | null;
    access_token?: string | null;
    instagram_business_account?: { id?: string | null } | null;
  }>;
}): Promise<SubscribeWebhooksResult[]> {
  const results: SubscribeWebhooksResult[] = [];
  const seen = new Set<string>();

  for (const page of input.pages) {
    const pageId = String(page.id || '').trim();
    const pageToken = String(page.access_token || '').trim();
    if (!pageId || !pageToken || pageId.startsWith('user-')) continue;

    if (!seen.has(pageId)) {
      seen.add(pageId);
      results.push(
        await subscribeMetaAccountToAppWebhooks({
          pageOrIgId: pageId,
          accessToken: pageToken,
          subscribedFields: FACEBOOK_PAGE_SUBSCRIBED_FIELDS,
        })
      );
    }

    const igId = String(page.instagram_business_account?.id || '').trim();
    if (igId && !seen.has(igId)) {
      seen.add(igId);
      results.push(
        await subscribeMetaAccountToAppWebhooks({
          pageOrIgId: igId,
          accessToken: pageToken,
          subscribedFields: INSTAGRAM_SUBSCRIBED_FIELDS,
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

  if (pageId && pageToken) {
    results.push(
      await subscribeMetaAccountToAppWebhooks({
        pageOrIgId: pageId,
        accessToken: pageToken,
        subscribedFields: FACEBOOK_PAGE_SUBSCRIBED_FIELDS,
      })
    );
  }

  if (igUserId && pageToken && igUserId !== pageId) {
    results.push(
      await subscribeMetaAccountToAppWebhooks({
        pageOrIgId: igUserId,
        accessToken: pageToken,
        subscribedFields: INSTAGRAM_SUBSCRIBED_FIELDS,
      })
    );
  }

  return results;
}

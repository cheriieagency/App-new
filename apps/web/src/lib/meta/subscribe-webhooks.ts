/**
 * Register a Facebook Page / Instagram account for this app's Meta webhooks
 * via POST /{id}/subscribed_apps (Graph API v21.0).
 */

/** Fields used for Comment-to-DM + Inbox (re-sync / general). */
const SUBSCRIBE_FIELDS = [
  'feed',
  'comments',
  'messages',
  'mentions',
] as const;

/** Fields Meta documents for Page webhook subscription at connect time. */
const PAGE_CONNECT_FIELDS = [
  'feed',
  'messages',
  'messaging_postbacks',
] as const;

export type SubscribeWebhooksResult = {
  ok: boolean;
  targetId: string;
  error?: string;
  raw?: unknown;
};

/**
 * Subscribe one Page or IG Business account to the app webhook fields.
 * Prefer the Page access token when available.
 *
 * Uses query-string access_token (Meta Page subscribed_apps convention) and
 * also accepts JSON body for re-sync callers.
 */
export async function subscribeMetaAccountToAppWebhooks(input: {
  pageOrIgId: string;
  accessToken: string;
  fields?: string[];
  /** When true, use query-param style (OAuth callback). Default: JSON body. */
  useQueryParams?: boolean;
}): Promise<SubscribeWebhooksResult> {
  const targetId = String(input.pageOrIgId || '').trim();
  const accessToken = String(input.accessToken || '').trim();
  if (!targetId || !accessToken) {
    return {
      ok: false,
      targetId,
      error: 'missing_page_or_token',
    };
  }

  const fields = input.fields?.length
    ? input.fields
    : [...SUBSCRIBE_FIELDS];

  try {
    let res: Response;
    if (input.useQueryParams) {
      const subUrl = new URL(
        `https://graph.facebook.com/v21.0/${encodeURIComponent(targetId)}/subscribed_apps`
      );
      subUrl.searchParams.set('subscribed_fields', fields.join(','));
      subUrl.searchParams.set('access_token', accessToken);
      res = await fetch(subUrl.toString(), { method: 'POST' });
    } else {
      const subscribeUrl = `https://graph.facebook.com/v21.0/${encodeURIComponent(
        targetId
      )}/subscribed_apps`;
      res = await fetch(subscribeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: accessToken,
          subscribed_fields: fields,
        }),
      });
    }

    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      error?: { message?: string; type?: string; code?: number };
    };

    if (!res.ok || json.error) {
      const message =
        json.error?.message || `subscribed_apps failed (${res.status})`;
      console.warn('[meta/subscribe-webhooks]', targetId, message, json.error);
      return { ok: false, targetId, error: message, raw: json };
    }

    console.log('[meta/subscribe-webhooks] ok', targetId, fields.join(','));
    return { ok: true, targetId, raw: json };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'subscribed_apps_network_error';
    console.warn('[meta/subscribe-webhooks]', targetId, message);
    return { ok: false, targetId, error: message };
  }
}

/**
 * After OAuth: subscribe each Facebook Page with its Page Access Token.
 * Uses feed,messages,messaging_postbacks (Meta Page connect convention).
 */
export async function subscribePagesAfterOAuth(
  pages: Array<{ id?: string | null; access_token?: string | null }>
): Promise<SubscribeWebhooksResult[]> {
  const results: SubscribeWebhooksResult[] = [];
  const seen = new Set<string>();

  for (const page of pages) {
    const pageId = String(page.id || '').trim();
    const pageToken = String(page.access_token || '').trim();
    if (!pageId || !pageToken || seen.has(pageId)) continue;
    if (pageId.startsWith('user-')) continue;
    seen.add(pageId);

    results.push(
      await subscribeMetaAccountToAppWebhooks({
        pageOrIgId: pageId,
        accessToken: pageToken,
        fields: [...PAGE_CONNECT_FIELDS],
        useQueryParams: true,
      })
    );
  }

  return results;
}

/**
 * Subscribe Page + Instagram ids after OAuth (best-effort, never throws).
 */
export async function subscribeMetaAccountsAfterConnect(input: {
  pageId?: string | null;
  pageAccessToken?: string | null;
  igUserId?: string | null;
  /** Fallback token (user long-lived) when page token missing. */
  fallbackAccessToken?: string | null;
  fields?: string[];
}): Promise<SubscribeWebhooksResult[]> {
  const results: SubscribeWebhooksResult[] = [];
  const pageToken =
    String(input.pageAccessToken || '').trim() ||
    String(input.fallbackAccessToken || '').trim();
  const pageId = String(input.pageId || '').trim();
  const igUserId = String(input.igUserId || '').trim();
  const fields = input.fields?.length
    ? input.fields
    : [...SUBSCRIBE_FIELDS];

  if (pageId && pageToken) {
    results.push(
      await subscribeMetaAccountToAppWebhooks({
        pageOrIgId: pageId,
        accessToken: pageToken,
        fields,
      })
    );
  }

  // Also try IG scoped id (some setups require both).
  if (igUserId && pageToken && igUserId !== pageId) {
    results.push(
      await subscribeMetaAccountToAppWebhooks({
        pageOrIgId: igUserId,
        accessToken: pageToken,
        fields,
      })
    );
  }

  return results;
}

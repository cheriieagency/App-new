/**
 * Register a Facebook Page / Instagram account for this app's Meta webhooks
 * via POST /{id}/subscribed_apps (Graph API v21.0).
 */

const SUBSCRIBE_FIELDS = [
  'feed',
  'comments',
  'messages',
  'mentions',
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
 */
export async function subscribeMetaAccountToAppWebhooks(input: {
  pageOrIgId: string;
  accessToken: string;
  fields?: string[];
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

  const subscribeUrl = `https://graph.facebook.com/v21.0/${encodeURIComponent(
    targetId
  )}/subscribed_apps`;

  try {
    const res = await fetch(subscribeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: accessToken,
        subscribed_fields: fields,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      error?: { message?: string };
    };

    if (!res.ok || json.error) {
      const message =
        json.error?.message || `subscribed_apps failed (${res.status})`;
      console.warn('[meta/subscribe-webhooks]', targetId, message);
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
 * Subscribe Page + Instagram ids after OAuth (best-effort, never throws).
 */
export async function subscribeMetaAccountsAfterConnect(input: {
  pageId?: string | null;
  pageAccessToken?: string | null;
  igUserId?: string | null;
  /** Fallback token (user long-lived) when page token missing. */
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
      })
    );
  }

  // Also try IG scoped id (some setups require both).
  if (igUserId && pageToken && igUserId !== pageId) {
    results.push(
      await subscribeMetaAccountToAppWebhooks({
        pageOrIgId: igUserId,
        accessToken: pageToken,
      })
    );
  }

  return results;
}

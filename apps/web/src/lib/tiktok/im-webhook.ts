/**
 * Parse TikTok webhook payloads for Direct Messaging events.
 * Event: im.message.receive (content may be a JSON string).
 */

export type TikTokImIncoming = {
  event: string;
  businessOpenId: string | null;
  senderOpenId: string;
  username: string | null;
  avatarUrl: string | null;
  content: string;
  mediaUrl: string | null;
  messageId: string | null;
  conversationId: string | null;
  createTime: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseContentField(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return asRecord(parsed) || {};
    } catch {
      return { text: raw };
    }
  }
  return {};
}

function pickString(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

/** Extract inbound IM events from a TikTok webhook body (supports batch arrays). */
export function extractTikTokImEvents(payload: unknown): TikTokImIncoming[] {
  const roots: Record<string, unknown>[] = [];
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const rec = asRecord(item);
      if (rec) roots.push(rec);
    }
  } else {
    const rec = asRecord(payload);
    if (rec) roots.push(rec);
    // Some deliveries nest under `data` / `events`.
    const nested = asRecord(rec?.data);
    if (nested) roots.push(nested);
    if (Array.isArray(rec?.events)) {
      for (const item of rec!.events as unknown[]) {
        const e = asRecord(item);
        if (e) roots.push(e);
      }
    }
  }

  const out: TikTokImIncoming[] = [];
  for (const root of roots) {
    const event = String(root.event || root.type || '').trim();
    if (
      event &&
      event !== 'im.message.receive' &&
      event !== 'im.message' &&
      !event.includes('im.message')
    ) {
      // Still allow generic message-shaped payloads without a typed event.
      if (!root.content && !root.message && !root.text) continue;
    }

    const content = parseContentField(
      root.content ?? root.message ?? root.data
    );
    const sender =
      asRecord(content.sender) ||
      asRecord(content.from_user) ||
      asRecord(root.sender) ||
      {};

    const text =
      pickString(
        content.text,
        content.message,
        content.content,
        asRecord(content.text_message)?.text,
        asRecord(content.message_body)?.text
      ) || '';

    const mediaUrl = pickString(
      content.media_url,
      content.image_url,
      asRecord(content.image)?.url,
      asRecord(content.media)?.url
    );

    const senderOpenId =
      pickString(
        content.from_user_id,
        content.sender_id,
        content.user_openid,
        sender.open_id,
        sender.user_openid,
        root.from_user_id,
        root.sender_openid
      ) || '';

    // Business / creator open id that owns the inbox (for workspace lookup).
    const businessOpenId = pickString(
      root.user_openid,
      root.to_user_id,
      content.to_user_id,
      content.business_id,
      content.owner_openid
    );

    if (!senderOpenId && !text && !mediaUrl) continue;

    out.push({
      event: event || 'im.message.receive',
      businessOpenId,
      senderOpenId: senderOpenId || 'unknown',
      username: pickString(
        content.username,
        content.unique_id,
        content.display_name,
        sender.username,
        sender.display_name,
        sender.unique_id
      ),
      avatarUrl: pickString(
        content.avatar_url,
        content.avatar,
        sender.avatar_url,
        sender.avatar
      ),
      content: text,
      mediaUrl,
      messageId: pickString(
        content.message_id,
        content.msg_id,
        content.id,
        root.message_id
      ),
      conversationId: pickString(
        content.conversation_id,
        content.conversationId,
        root.conversation_id
      ),
      createTime:
        typeof root.create_time === 'number'
          ? new Date(root.create_time * 1000).toISOString()
          : pickString(content.create_time, root.create_time),
    });
  }

  return out;
}

/**
 * Parse Meta Instagram / Page messaging webhooks into normalized DM events.
 * Handles: messages (text + quick_reply) and messaging_postbacks.
 */

import type { IncomingDmEvent } from '@/lib/dm-flows/types';

type MessagingItem = {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number | string;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
    quick_reply?: { payload?: string };
  };
  postback?: {
    mid?: string;
    title?: string;
    payload?: string;
  };
};

type WebhookBody = {
  object?: string;
  entry?: Array<{
    id?: string;
    messaging?: MessagingItem[];
    standby?: MessagingItem[];
  }>;
};

export function extractMessagingEventsFromWebhook(
  payload: unknown
): IncomingDmEvent[] {
  const root = payload as WebhookBody;
  const objectType = String(root.object || '').toLowerCase();
  if (
    objectType &&
    objectType !== 'instagram' &&
    objectType !== 'page'
  ) {
    return [];
  }

  const events: IncomingDmEvent[] = [];

  for (const entry of root.entry || []) {
    const entryId = entry.id ? String(entry.id) : null;
    const bags = [
      ...(Array.isArray(entry.messaging) ? entry.messaging : []),
      ...(Array.isArray(entry.standby) ? entry.standby : []),
    ];

    for (const item of bags) {
      // Ignore echo (messages we sent ourselves).
      if (item.message?.is_echo) continue;

      const senderId = String(item.sender?.id || '').trim();
      if (!senderId) continue;
      // Skip if sender is the Page / IG account itself.
      if (entryId && senderId === entryId) continue;

      const text = item.message?.text
        ? String(item.message.text).trim()
        : null;
      const payloadFromQr = item.message?.quick_reply?.payload
        ? String(item.message.quick_reply.payload).trim()
        : null;
      const payloadFromPostback = item.postback?.payload
        ? String(item.postback.payload).trim()
        : null;
      const payload = payloadFromPostback || payloadFromQr || null;
      const mid = String(
        item.message?.mid || item.postback?.mid || ''
      ).trim() || null;

      if (!text && !payload) continue;

      const tsRaw = item.timestamp;
      const timestamp =
        typeof tsRaw === 'number'
          ? tsRaw
          : tsRaw
            ? Number(tsRaw) || null
            : null;

      events.push({
        senderId,
        pageId: objectType === 'page' ? entryId : null,
        igAccountId: objectType === 'instagram' ? entryId : null,
        text,
        payload,
        mid,
        timestamp,
      });
    }
  }

  return events;
}

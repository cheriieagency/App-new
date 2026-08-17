/**
 * TikTok Direct Messaging — send helper.
 * POST https://open.tiktokapis.com/v2/im/message/send/
 */

export type TikTokImSendResult =
  | { ok: true; messageId: string | null; raw?: unknown }
  | { ok: false; error: string; status?: number; raw?: unknown };

/**
 * Dispatch a text DM via TikTok IM API.
 * Body shape varies by product surface — we try the documented v2 IM endpoint
 * with recipient open_id + text, and surface API errors clearly.
 */
export async function sendTikTokImMessage(input: {
  accessToken: string;
  recipientOpenId: string;
  text: string;
  conversationId?: string | null;
}): Promise<TikTokImSendResult> {
  const accessToken = input.accessToken.trim();
  const recipient = input.recipientOpenId.trim();
  const text = input.text.trim();
  if (!accessToken) return { ok: false, error: 'missing_access_token' };
  if (!recipient) return { ok: false, error: 'missing_recipient' };
  if (!text) return { ok: false, error: 'empty_message' };

  const body: Record<string, unknown> = {
    recipient_type: 'open_id',
    recipient: recipient,
    message_type: 'text',
    text: { body: text },
  };
  if (input.conversationId?.trim()) {
    body.conversation_id = input.conversationId.trim();
  }

  try {
    const res = await fetch('https://open.tiktokapis.com/v2/im/message/send/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const errObj = raw.error as Record<string, unknown> | undefined;
    const code = errObj?.code ?? raw.code;
    const message =
      (typeof errObj?.message === 'string' && errObj.message) ||
      (typeof raw.message === 'string' && raw.message) ||
      null;

    const success =
      res.ok &&
      (code === undefined ||
        code === 0 ||
        code === 'ok' ||
        code === 'success');

    if (!success) {
      return {
        ok: false,
        error: message || `tiktok_im_send_failed (${res.status})`,
        status: res.status,
        raw,
      };
    }

    const data = (raw.data as Record<string, unknown> | undefined) || raw;
    const messageId =
      (typeof data.message_id === 'string' && data.message_id) ||
      (typeof data.msg_id === 'string' && data.msg_id) ||
      (typeof (data.message as Record<string, unknown> | undefined)?.message_id ===
        'string' &&
        String(
          (data.message as Record<string, unknown>).message_id
        )) ||
      null;

    return { ok: true, messageId, raw };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'tiktok_im_send_failed',
    };
  }
}

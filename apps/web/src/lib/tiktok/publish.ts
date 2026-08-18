/**
 * TikTok Content Posting — PULL_FROM_URL (public HTTPS media).
 * Video: POST /v2/post/publish/video/init/ then poll status.
 * Photo: POST /v2/post/publish/content/init/
 */

export type TikTokPublishKind = 'image' | 'video';

export type TikTokPublishResult = {
  id: string;
  publishId?: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function headersToRecord(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function tikTokErrorMessage(raw: Record<string, unknown>, status: number): string {
  const err = raw.error as Record<string, unknown> | undefined;
  const message =
    (typeof err?.message === 'string' && err.message) ||
    (typeof raw.message === 'string' && raw.message) ||
    null;
  const code = err?.code ?? raw.code;
  if (message && code != null) return `${message} (${String(code)})`;
  return message || `TikTok publish failed (${status})`;
}

function extractPublishId(raw: Record<string, unknown>): string | null {
  const data = (raw.data as Record<string, unknown> | undefined) || raw;
  const id =
    (typeof data.publish_id === 'string' && data.publish_id) ||
    (typeof data.creation_id === 'string' && data.creation_id) ||
    (typeof data.id === 'string' && data.id) ||
    null;
  return id?.trim() || null;
}

async function tikTokJson(
  url: string,
  init: RequestInit,
  step: string
): Promise<Record<string, unknown>> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (error) {
    console.error(`[tiktok/${step}] network failure`, {
      url,
      error: error instanceof Error ? error.message : error,
    });
    throw new Error(
      `Failed to ${step}: network error (${error instanceof Error ? error.message : 'fetch failed'})`
    );
  }

  const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const err = raw.error as Record<string, unknown> | undefined;
  const code = err?.code ?? raw.code;
  const ok =
    res.ok &&
    (code === undefined || code === 0 || code === 'ok' || code === 'success');

  if (!ok) {
    console.error(`[tiktok/${step}] API failed`, {
      url,
      status: res.status,
      payload: init.body ? String(init.body).slice(0, 800) : null,
      responseHeaders: headersToRecord(res.headers),
      responseBody: raw,
    });
    throw new Error(`Failed to create media container: ${tikTokErrorMessage(raw, res.status)}`);
  }

  return raw;
}

async function waitForTikTokPublishReady(
  accessToken: string,
  publishId: string
): Promise<void> {
  const maxAttempts = 5;
  const delayMs = 3000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const raw = await tikTokJson(
      'https://open.tiktokapis.com/v2/post/publish/status/fetch/',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({ publish_id: publishId }),
      },
      'publish status'
    );

    const data = (raw.data as Record<string, unknown> | undefined) || {};
    const status = String(data.status || data.status_code || '')
      .trim()
      .toUpperCase();

    if (
      status === 'PUBLISH_COMPLETE' ||
      status === 'FINISHED' ||
      status === 'READY' ||
      status === 'SEND_TO_USER_INBOX'
    ) {
      return;
    }
    if (status === 'FAILED' || status === 'ERROR') {
      const failMsg =
        (typeof data.fail_reason === 'string' && data.fail_reason) || status;
      throw new Error(`Failed to create media container: TikTok status ${failMsg}`);
    }

    if (attempt < maxAttempts) await sleep(delayMs);
  }

  throw new Error(
    `TikTok publish_id ${publishId} was not READY after ${maxAttempts} status checks.`
  );
}

/**
 * Publish a photo or video to TikTok via PULL_FROM_URL.
 * Requires a public HTTPS media URL and Content Posting scopes.
 */
export async function publishTikTokPost(input: {
  accessToken: string;
  mediaUrl: string;
  caption: string;
  kind?: TikTokPublishKind;
}): Promise<TikTokPublishResult> {
  const accessToken = input.accessToken.trim();
  const mediaUrl = input.mediaUrl.trim();
  const caption = input.caption.trim().slice(0, 2200);
  if (!accessToken) throw new Error('TikTok access token missing');
  if (!mediaUrl) {
    throw new Error('Failed to create media container: media URL is empty');
  }

  const isVideo =
    input.kind === 'video' ||
    (input.kind !== 'image' && /\.(mp4|mov|m4v|webm)(\?|#|$)/i.test(mediaUrl));

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json; charset=UTF-8',
  };

  let raw: Record<string, unknown>;
  try {
    if (isVideo) {
      raw = await tikTokJson(
        'https://open.tiktokapis.com/v2/post/publish/video/init/',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            post_info: {
              title: caption || 'New video',
              privacy_level: 'PUBLIC_TO_EVERYONE',
              disable_duet: false,
              disable_comment: false,
              disable_stitch: false,
            },
            source_info: {
              source: 'PULL_FROM_URL',
              video_url: mediaUrl,
            },
          }),
        },
        'create media container'
      );
    } else {
      raw = await tikTokJson(
        'https://open.tiktokapis.com/v2/post/publish/content/init/',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            post_info: {
              title: caption || 'New post',
              description: caption,
              privacy_level: 'PUBLIC_TO_EVERYONE',
              disable_comment: false,
            },
            source_info: {
              source: 'PULL_FROM_URL',
              photo_cover_index: 0,
              photo_images: [mediaUrl],
            },
            post_mode: 'DIRECT_POST',
            media_type: 'PHOTO',
          }),
        },
        'create media container'
      );
    }
  } catch (error) {
    console.error('[tiktok/create media container] threw', {
      isVideo,
      mediaUrl: mediaUrl.slice(0, 180),
      error: error instanceof Error ? error.message : error,
    });
    throw error instanceof Error
      ? error
      : new Error('Failed to create media container: unknown TikTok error');
  }

  const publishId = extractPublishId(raw);
  if (!publishId) {
    console.error('[tiktok/create media container] missing publish_id', {
      isVideo,
      mediaUrl: mediaUrl.slice(0, 180),
      responseBody: raw,
    });
    throw new Error(
      'Failed to create media container: TikTok did not return id / creation_id / publish_id'
    );
  }

  if (isVideo) {
    await waitForTikTokPublishReady(accessToken, publishId);
  }

  return { id: publishId, publishId };
}

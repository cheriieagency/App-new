/**
 * TikTok Content Posting — PULL_FROM_URL (public HTTPS media).
 * Video: POST /v2/post/publish/video/init/ then poll status.
 * Photo: POST /v2/post/publish/content/init/ (DIRECT_POST).
 *
 * Requires Login Kit scope `video.publish` and a privacy_level from
 * /v2/post/publish/creator_info/query/ (never hardcode PUBLIC_TO_EVERYONE).
 */

import { toVerifiedPublishMediaUrl } from '@/lib/media/proxy-url';

export type TikTokPublishKind = 'image' | 'video';

export type TikTokPublishResult = {
  id: string;
  publishId?: string;
  pending?: boolean;
};

type CreatorInfo = {
  privacyLevel: string;
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
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

function explainTikTokCode(code: string, message: string): string {
  const c = code.toLowerCase();
  if (c === 'url_ownership_unverified') {
    return (
      `${message} Verify your media host under Content Posting → PULL_FROM_URL ` +
      'in the TikTok Developer Portal (e.g. your Supabase storage domain).'
    );
  }
  if (c === 'privacy_level_option_mismatch') {
    return (
      `${message} Unaudited TikTok apps can only post as private (SELF_ONLY). ` +
      'Reconnect TikTok and try again.'
    );
  }
  if (
    c === 'access_token_invalid' ||
    c === 'invalid_access_token' ||
    c === 'access_token_expired'
  ) {
    return 'TikTok session expired — reconnect under Settings → Socials.';
  }
  if (c === 'scope_not_authorized' || c.includes('scope')) {
    return (
      `${message} Disconnect and reconnect TikTok so clikd: can request ` +
      'video.publish (Direct Post).'
    );
  }
  return message;
}

function tikTokErrorMessage(raw: Record<string, unknown>, status: number): string {
  const err = raw.error as Record<string, unknown> | undefined;
  const message =
    (typeof err?.message === 'string' && err.message) ||
    (typeof raw.message === 'string' && raw.message) ||
    null;
  const code = String(err?.code ?? raw.code ?? '').trim();
  const combined =
    message && code && code !== 'ok'
      ? `${message} (${code})`
      : message || `TikTok publish failed (${status})`;
  return code ? explainTikTokCode(code, combined) : combined;
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
      `TikTok ${step} network error (${error instanceof Error ? error.message : 'fetch failed'})`
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
    throw new Error(tikTokErrorMessage(raw, res.status));
  }

  return raw;
}

function pickPrivacyLevel(options: string[]): string {
  const preferred = [
    'PUBLIC_TO_EVERYONE',
    'MUTUAL_FOLLOW_FRIENDS',
    'FOLLOWER_OF_CREATOR',
    'SELF_ONLY',
  ];
  for (const level of preferred) {
    if (options.includes(level)) return level;
  }
  return options[0] || 'SELF_ONLY';
}

/** Direct Post requires a privacy_level the creator is allowed to use. */
async function queryCreatorInfo(accessToken: string): Promise<CreatorInfo> {
  const raw = await tikTokJson(
    'https://open.tiktokapis.com/v2/post/publish/creator_info/query/',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({}),
    },
    'creator_info'
  );

  const data = (raw.data as Record<string, unknown> | undefined) || {};
  const options = Array.isArray(data.privacy_level_options)
    ? (data.privacy_level_options as unknown[]).map((x) => String(x))
    : [];

  return {
    privacyLevel: pickPrivacyLevel(options),
    commentDisabled: Boolean(data.comment_disabled),
    duetDisabled: Boolean(data.duet_disabled),
    stitchDisabled: Boolean(data.stitch_disabled),
  };
}

async function waitForTikTokPublishReady(
  accessToken: string,
  publishId: string
): Promise<{ pending: boolean }> {
  const maxAttempts = 20;
  const delayMs = 3000;
  let lastStatus = '';

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
    lastStatus = String(data.status || data.status_code || '')
      .trim()
      .toUpperCase();

    if (
      lastStatus === 'PUBLISH_COMPLETE' ||
      lastStatus === 'FINISHED' ||
      lastStatus === 'READY' ||
      lastStatus === 'SEND_TO_USER_INBOX'
    ) {
      return { pending: false };
    }
    if (lastStatus === 'FAILED' || lastStatus === 'ERROR') {
      const failMsg =
        (typeof data.fail_reason === 'string' && data.fail_reason) || lastStatus;
      throw new Error(`TikTok rejected the post: ${failMsg}`);
    }

    if (attempt < maxAttempts) await sleep(delayMs);
  }

  // TikTok often still processes after ~60s — the job was accepted.
  console.warn('[tiktok] publish still processing after poll window', {
    publishId,
    lastStatus,
  });
  return { pending: true };
}

/**
 * Publish a photo or video to TikTok via PULL_FROM_URL.
 * Requires a public HTTPS media URL and Content Posting (`video.publish`).
 */
export async function publishTikTokPost(input: {
  accessToken: string;
  mediaUrl: string;
  caption: string;
  kind?: TikTokPublishKind;
  extraImageUrls?: string[];
}): Promise<TikTokPublishResult> {
  const accessToken = input.accessToken.trim();
  const sourceMediaUrl = input.mediaUrl.trim();
  const caption = input.caption.trim().slice(0, 2200);
  if (!accessToken) throw new Error('TikTok access token missing');
  if (!sourceMediaUrl) {
    throw new Error('TikTok requires a public HTTPS media URL');
  }

  const isVideo =
    input.kind === 'video' ||
    (input.kind !== 'image' &&
      /\.(mp4|mov|m4v|webm)(\?|#|$)/i.test(sourceMediaUrl));

  // TikTok URL Properties are on www.clikd.app — never send supabase.co.
  const mediaUrl = toVerifiedPublishMediaUrl(sourceMediaUrl);

  const creator = await queryCreatorInfo(accessToken);

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
              privacy_level: creator.privacyLevel,
              disable_duet: creator.duetDisabled,
              disable_comment: creator.commentDisabled,
              disable_stitch: creator.stitchDisabled,
            },
            source_info: {
              source: 'PULL_FROM_URL',
              video_url: mediaUrl,
            },
          }),
        },
        'video init'
      );
    } else {
      const photoImages = [
        mediaUrl,
        ...(input.extraImageUrls || [])
          .map((u) => toVerifiedPublishMediaUrl(u.trim()))
          .filter((u) => u && u !== mediaUrl),
      ].slice(0, 35);

      raw = await tikTokJson(
        'https://open.tiktokapis.com/v2/post/publish/content/init/',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            post_info: {
              title: caption || 'New post',
              description: caption,
              privacy_level: creator.privacyLevel,
              disable_comment: creator.commentDisabled,
            },
            source_info: {
              source: 'PULL_FROM_URL',
              photo_cover_index: 0,
              photo_images: photoImages,
            },
            post_mode: 'DIRECT_POST',
            media_type: 'PHOTO',
          }),
        },
        'photo init'
      );
    }
  } catch (error) {
    console.error('[tiktok/init] threw', {
      isVideo,
      mediaUrl: mediaUrl.slice(0, 180),
      error: error instanceof Error ? error.message : error,
    });
    throw error instanceof Error
      ? error
      : new Error('TikTok publish failed');
  }

  const publishId = extractPublishId(raw);
  if (!publishId) {
    console.error('[tiktok/init] missing publish_id', {
      isVideo,
      mediaUrl: mediaUrl.slice(0, 180),
      responseBody: raw,
    });
    throw new Error('TikTok did not return a publish_id');
  }

  if (isVideo) {
    const { pending } = await waitForTikTokPublishReady(accessToken, publishId);
    return { id: publishId, publishId, pending };
  }

  return { id: publishId, publishId };
}

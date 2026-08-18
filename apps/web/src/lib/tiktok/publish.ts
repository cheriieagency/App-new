/**
 * TikTok Content Posting.
 *
 * Videos: FILE_UPLOAD (we download from Supabase and PUT to TikTok).
 *   Avoids PULL_FROM_URL domain verification — that path 404s until
 *   /api/media is live on www.clikd.app.
 * Photos: PULL_FROM_URL only (TikTok restriction). Try verified proxy, then
 *   the raw Supabase URL.
 *
 * Unaudited apps cannot Direct Post to public TikTok accounts — we fall back
 * to inbox / MEDIA_UPLOAD so the creator can finish the post in the TikTok app.
 */

import { toVerifiedPublishMediaUrl } from '@/lib/media/proxy-url';
import { TIKTOK_POSTING_SCOPE_HELP } from '@/lib/tiktok/scopes';

export type TikTokPublishKind = 'image' | 'video';

export type TikTokPublishResult = {
  id: string;
  publishId?: string;
  pending?: boolean;
  inbox?: boolean;
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
      `${message} Photos still need a verified URL. Add https://www.clikd.app ` +
      'under URL Properties in the TikTok Developer Portal, deploy /api/media, ' +
      'or add your Supabase storage host. Videos no longer need this.'
    );
  }
  if (c === 'privacy_level_option_mismatch') {
    return (
      `${message} Unaudited TikTok apps can only post as private (SELF_ONLY).`
    );
  }
  if (c === 'unaudited_client_can_only_post_to_private_accounts') {
    return (
      'Unaudited TikTok apps can only Direct Post if the TikTok account is Private. ' +
      'Set the account to Private, or we send the post to your TikTok inbox instead.'
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
    return TIKTOK_POSTING_SCOPE_HELP;
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

function tikTokErrorCode(raw: Record<string, unknown>): string {
  const err = raw.error as Record<string, unknown> | undefined;
  return String(err?.code ?? raw.code ?? '')
    .trim()
    .toLowerCase();
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

function extractUploadUrl(raw: Record<string, unknown>): string | null {
  const data = (raw.data as Record<string, unknown> | undefined) || raw;
  const url = typeof data.upload_url === 'string' ? data.upload_url.trim() : '';
  return url || null;
}

class TikTokApiError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
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
    throw new TikTokApiError(
      tikTokErrorMessage(raw, res.status),
      tikTokErrorCode(raw)
    );
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

async function queryCreatorInfo(accessToken: string): Promise<CreatorInfo | null> {
  try {
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
  } catch (error) {
    console.warn('[tiktok] creator_info unavailable — Direct Post may be blocked', error);
    return null;
  }
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

  console.warn('[tiktok] publish still processing after poll window', {
    publishId,
    lastStatus,
  });
  return { pending: true };
}

async function downloadMedia(url: string): Promise<{
  bytes: Uint8Array;
  contentType: string;
  size: number;
}> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Could not download media for TikTok upload (${res.status}). Re-upload the file.`
    );
  }
  const buffer = new Uint8Array(await res.arrayBuffer());
  if (!buffer.byteLength) {
    throw new Error('Downloaded media file is empty');
  }
  const contentType =
    res.headers.get('content-type')?.split(';')[0]?.trim() ||
    'application/octet-stream';
  return { bytes: buffer, contentType, size: buffer.byteLength };
}

function planChunks(size: number): { chunkSize: number; totalChunkCount: number } {
  const fiveMb = 5 * 1024 * 1024;
  const sixtyFourMb = 64 * 1024 * 1024;
  if (size <= sixtyFourMb) {
    return { chunkSize: size, totalChunkCount: 1 };
  }
  const chunkSize = 10 * 1024 * 1024;
  const totalChunkCount = Math.max(1, Math.floor(size / chunkSize));
  return { chunkSize, totalChunkCount };
}

async function putFileToTikTok(input: {
  uploadUrl: string;
  bytes: Uint8Array;
  contentType: string;
  chunkSize: number;
  totalChunkCount: number;
}): Promise<void> {
  const { uploadUrl, bytes, contentType, chunkSize, totalChunkCount } = input;
  const total = bytes.byteLength;

  for (let i = 0; i < totalChunkCount; i++) {
    const start = i * chunkSize;
    const isLast = i === totalChunkCount - 1;
    const end = isLast ? total : Math.min(start + chunkSize, total);
    const chunk = bytes.subarray(start, end);

    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(chunk.byteLength),
        'Content-Range': `bytes ${start}-${end - 1}/${total}`,
      },
      body: Buffer.from(chunk),
    });

    if (!res.ok && res.status !== 201 && res.status !== 206) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `TikTok file upload failed (${res.status})${text ? `: ${text.slice(0, 180)}` : ''}`
      );
    }
  }
}

async function initVideoUpload(
  accessToken: string,
  endpoint: string,
  sourceInfo: Record<string, unknown>,
  postInfo?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const body: Record<string, unknown> = { source_info: sourceInfo };
  if (postInfo) body.post_info = postInfo;
  return tikTokJson(
    endpoint,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify(body),
    },
    endpoint.includes('inbox') ? 'inbox video init' : 'video init'
  );
}

async function publishVideoViaFileUpload(input: {
  accessToken: string;
  mediaUrl: string;
  caption: string;
  creator: CreatorInfo | null;
}): Promise<TikTokPublishResult> {
  const file = await downloadMedia(input.mediaUrl);
  const mime =
    file.contentType.startsWith('video/') || file.contentType.startsWith('image/')
      ? file.contentType
      : 'video/mp4';
  const { chunkSize, totalChunkCount } = planChunks(file.size);
  const sourceInfo = {
    source: 'FILE_UPLOAD',
    video_size: file.size,
    chunk_size: chunkSize,
    total_chunk_count: totalChunkCount,
  };

  const postInfo = input.creator
    ? {
        title: input.caption.slice(0, 2200) || 'New video',
        privacy_level: input.creator.privacyLevel,
        disable_duet: input.creator.duetDisabled,
        disable_comment: input.creator.commentDisabled,
        disable_stitch: input.creator.stitchDisabled,
      }
    : undefined;

  let inbox = false;
  let raw: Record<string, unknown>;

  try {
    if (!input.creator) {
      throw new TikTokApiError(
        'Direct Post unavailable without creator_info',
        'scope_not_authorized'
      );
    }
    raw = await initVideoUpload(
      input.accessToken,
      'https://open.tiktokapis.com/v2/post/publish/video/init/',
      sourceInfo,
      postInfo
    );
  } catch (directError) {
    const code =
      directError instanceof TikTokApiError ? directError.code : '';
    console.warn('[tiktok] Direct Post blocked — trying inbox upload', {
      code,
      error: directError instanceof Error ? directError.message : directError,
    });
    try {
      raw = await initVideoUpload(
        input.accessToken,
        'https://open.tiktokapis.com/v2/post/publish/inbox/video/init/',
        sourceInfo
      );
      inbox = true;
    } catch (inboxError) {
      const inboxCode =
        inboxError instanceof TikTokApiError ? inboxError.code : '';
      if (
        code === 'scope_not_authorized' ||
        inboxCode === 'scope_not_authorized'
      ) {
        throw new Error(TIKTOK_POSTING_SCOPE_HELP);
      }
      throw inboxError instanceof Error ? inboxError : directError;
    }
  }

  const publishId = extractPublishId(raw);
  const uploadUrl = extractUploadUrl(raw);
  if (!publishId || !uploadUrl) {
    throw new Error('TikTok did not return publish_id / upload_url');
  }

  await putFileToTikTok({
    uploadUrl,
    bytes: file.bytes,
    contentType: mime,
    chunkSize,
    totalChunkCount,
  });

  const { pending } = await waitForTikTokPublishReady(
    input.accessToken,
    publishId
  );
  return { id: publishId, publishId, pending, inbox };
}

function uniquePhotoUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const trimmed = raw.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out.slice(0, 35);
}

async function publishPhotoPost(input: {
  accessToken: string;
  photoUrls: string[];
  caption: string;
  creator: CreatorInfo | null;
}): Promise<TikTokPublishResult> {
  const candidates = [
    uniquePhotoUrls(input.photoUrls.map((u) => toVerifiedPublishMediaUrl(u))),
    uniquePhotoUrls(input.photoUrls),
  ].filter((list) => list.length > 0);

  const title = input.caption.trim().slice(0, 90) || 'New post';
  const description = input.caption.trim().slice(0, 4000);

  let lastError: Error | null = null;

  for (const photoImages of candidates) {
    const tryModes: Array<'DIRECT_POST' | 'MEDIA_UPLOAD'> = input.creator
      ? ['DIRECT_POST', 'MEDIA_UPLOAD']
      : ['MEDIA_UPLOAD'];

    for (const postMode of tryModes) {
      try {
        const postInfo: Record<string, unknown> = {
          title,
          description,
        };
        if (postMode === 'DIRECT_POST' && input.creator) {
          postInfo.privacy_level = input.creator.privacyLevel;
          postInfo.disable_comment = input.creator.commentDisabled;
          postInfo.auto_add_music = true;
        }

        const raw = await tikTokJson(
          'https://open.tiktokapis.com/v2/post/publish/content/init/',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${input.accessToken}`,
              'Content-Type': 'application/json; charset=UTF-8',
            },
            body: JSON.stringify({
              post_info: postInfo,
              source_info: {
                source: 'PULL_FROM_URL',
                photo_cover_index: 0,
                photo_images: photoImages,
              },
              post_mode: postMode,
              media_type: 'PHOTO',
            }),
          },
          `photo ${postMode}`
        );

        const publishId = extractPublishId(raw);
        if (!publishId) throw new Error('TikTok did not return a publish_id');
        return {
          id: publishId,
          publishId,
          inbox: postMode === 'MEDIA_UPLOAD',
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('TikTok photo publish failed');
        const code = error instanceof TikTokApiError ? error.code : '';
        if (code === 'scope_not_authorized') {
          throw new Error(TIKTOK_POSTING_SCOPE_HELP);
        }
      }
    }
  }

  throw lastError || new Error('TikTok photo publish failed');
}

/**
 * Publish a photo or video to TikTok.
 * Videos use FILE_UPLOAD; photos use PULL_FROM_URL (API limitation).
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
    throw new Error(
      'TikTok requires a photo or video. Add media in Post Studio before Publish.'
    );
  }

  const isVideo =
    input.kind === 'video' ||
    (input.kind !== 'image' &&
      /\.(mp4|mov|m4v|webm)(\?|#|$)/i.test(sourceMediaUrl));

  const creator = await queryCreatorInfo(accessToken);

  if (isVideo) {
    return publishVideoViaFileUpload({
      accessToken,
      mediaUrl: sourceMediaUrl,
      caption,
      creator,
    });
  }

  return publishPhotoPost({
    accessToken,
    photoUrls: [sourceMediaUrl, ...(input.extraImageUrls || [])],
    caption,
    creator,
  });
}

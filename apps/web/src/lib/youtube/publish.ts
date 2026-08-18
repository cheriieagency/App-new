/**
 * YouTube Data API v3 — resumable video upload (videos.insert).
 */

import type { YoutubeMeta } from '@/lib/mock-content-planner';

export type PublishYouTubeVideoInput = {
  accessToken: string;
  videoUrl: string;
  title: string;
  description?: string;
  youtube?: YoutubeMeta | null;
};

async function fetchVideoBytes(videoUrl: string): Promise<{
  bytes: ArrayBuffer;
  contentType: string;
}> {
  const res = await fetch(videoUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch video for YouTube (${res.status})`);
  }
  const contentType = res.headers.get('content-type') || 'video/mp4';
  const bytes = await res.arrayBuffer();
  return { bytes, contentType };
}

/** Upload a video from a public HTTPS URL to the authenticated channel. */
export async function publishYouTubeVideo(
  input: PublishYouTubeVideoInput
): Promise<{ id: string }> {
  const meta = input.youtube;
  const title = (meta?.title || input.title || 'Untitled').slice(0, 100);
  const description = (input.description || '').slice(0, 5000);
  const tags = meta?.tags?.length ? meta.tags.slice(0, 30) : undefined;
  const privacyStatus = meta?.privacy || 'public';
  const categoryId = meta?.category?.trim() || '22';

  const { bytes, contentType } = await fetchVideoBytes(input.videoUrl.trim());

  const initUrl = new URL(
    'https://www.googleapis.com/upload/youtube/v3/videos'
  );
  initUrl.searchParams.set('uploadType', 'resumable');
  initUrl.searchParams.set('part', 'snippet,status');

  const initRes = await fetch(initUrl.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      'Content-Type': 'application/json',
      'X-Upload-Content-Type': contentType,
      'X-Upload-Content-Length': String(bytes.byteLength),
    },
    body: JSON.stringify({
      snippet: {
        title: meta?.is_shorts && !title.toLowerCase().includes('#shorts')
          ? `${title} #Shorts`
          : title,
        description,
        tags,
        categoryId,
      },
      status: {
        privacyStatus,
        selfDeclaredMadeForKids: false,
      },
    }),
  });

  const location = initRes.headers.get('location');
  if (!initRes.ok || !location) {
    const err = (await initRes.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(
      err.error?.message || `YouTube upload init failed (${initRes.status})`
    );
  }

  const uploadRes = await fetch(location, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(bytes.byteLength),
    },
    body: bytes,
  });

  const data = (await uploadRes.json().catch(() => ({}))) as {
    id?: string;
    error?: { message?: string };
  };

  if (!uploadRes.ok || !data.id) {
    throw new Error(
      data.error?.message || `YouTube upload failed (${uploadRes.status})`
    );
  }

  return { id: data.id };
}

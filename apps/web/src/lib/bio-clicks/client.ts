/**
 * Client helpers for Link-in-bio click tracking.
 */

'use client';

export type TrackBioClickPayload = {
  workspaceId: string;
  handle?: string;
  slug: string;
  blockId?: string;
  title?: string;
  destinationUrl?: string;
};

function postBioClick(
  payload: TrackBioClickPayload & { registerOnly?: boolean }
): void {
  if (typeof window === 'undefined') return;
  const slug = payload.slug?.trim();
  const workspaceId = payload.workspaceId?.trim();
  if (!slug || !workspaceId) return;

  const body = JSON.stringify({
    workspaceId,
    handle: payload.handle?.replace(/^@/, '') || undefined,
    slug,
    blockId: payload.blockId,
    title: payload.title,
    destinationUrl: payload.destinationUrl,
    registerOnly: payload.registerOnly === true,
  });

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const ok = navigator.sendBeacon(
        '/api/bio/click',
        new Blob([body], { type: 'application/json' })
      );
      if (ok) return;
    }
  } catch {
    /* fall through to fetch */
  }

  void fetch('/api/bio/click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
    credentials: 'include',
  }).catch(() => {
    /* ignore network errors — analytics must not break the bio UX */
  });
}

/** Fire-and-forget click record (beacon preferred so navigation isn't blocked). */
export function trackBioLinkClick(payload: TrackBioClickPayload): void {
  postBioClick(payload);
}

/** Register destinations so /r/{slug} redirects work — does NOT count clicks. */
export function registerBioLinkDestinations(payload: {
  workspaceId: string;
  handle?: string;
  links: Array<{
    slug: string;
    blockId?: string;
    title?: string;
    destinationUrl: string;
  }>;
}): void {
  if (typeof window === 'undefined') return;
  for (const link of payload.links) {
    if (!link.slug || !link.destinationUrl) continue;
    postBioClick({
      workspaceId: payload.workspaceId,
      handle: payload.handle,
      slug: link.slug,
      blockId: link.blockId,
      title: link.title,
      destinationUrl: link.destinationUrl,
      registerOnly: true,
    });
  }
}

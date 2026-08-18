/**
 * GET /api/media?url=<supabase-storage-https-url>
 *
 * Streams a Supabase Storage file through the verified clikd.app host so
 * TikTok / Meta PULL_FROM_URL can fetch media without verifying supabase.co.
 */

import {
  isAllowedSupabaseMediaUrl,
  isVerifiedMediaProxyUrl,
} from '@/lib/media/proxy-url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Large videos — TikTok/Meta may take a while to pull the stream. */
export const maxDuration = 60;

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
]);

function copyUpstreamHeaders(upstream: Headers): Headers {
  const out = new Headers();
  const pass = [
    'content-type',
    'content-length',
    'content-range',
    'accept-ranges',
    'etag',
    'last-modified',
    'cache-control',
  ];
  for (const name of pass) {
    const value = upstream.get(name);
    if (value) out.set(name, value);
  }
  if (!out.has('cache-control')) {
    out.set('cache-control', 'public, max-age=3600, s-maxage=3600');
  }
  if (!out.has('accept-ranges')) {
    out.set('accept-ranges', 'bytes');
  }
  out.set('content-disposition', 'inline');
  out.set('x-content-type-options', 'nosniff');
  return out;
}

export async function GET(request: Request) {
  const target = new URL(request.url).searchParams.get('url')?.trim() || '';
  if (!target) {
    return Response.json(
      { error: 'url query parameter is required' },
      { status: 400 }
    );
  }

  if (isVerifiedMediaProxyUrl(target)) {
    return Response.json(
      { error: 'nested media proxy URLs are not allowed' },
      { status: 400 }
    );
  }

  if (!isAllowedSupabaseMediaUrl(target)) {
    return Response.json(
      {
        error: 'url_not_allowed',
        message: 'Only HTTPS Supabase Storage URLs can be proxied.',
      },
      { status: 400 }
    );
  }

  const range = request.headers.get('range');
  const accept = request.headers.get('accept');

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        ...(range ? { Range: range } : {}),
        ...(accept ? { Accept: accept } : { Accept: '*/*' }),
      },
    });
  } catch (error) {
    console.error('[api/media] upstream fetch failed', {
      error: error instanceof Error ? error.message : error,
    });
    return Response.json(
      { error: 'upstream_fetch_failed' },
      { status: 502 }
    );
  }

  const location = upstream.headers.get('location');
  if (
    upstream.status >= 300 &&
    upstream.status < 400 &&
    location &&
    isAllowedSupabaseMediaUrl(location)
  ) {
    try {
      upstream = await fetch(location, {
        method: 'GET',
        redirect: 'manual',
        headers: {
          ...(range ? { Range: range } : {}),
          ...(accept ? { Accept: accept } : { Accept: '*/*' }),
        },
      });
    } catch (error) {
      console.error('[api/media] redirect fetch failed', error);
      return Response.json(
        { error: 'upstream_fetch_failed' },
        { status: 502 }
      );
    }
  }

  if (!upstream.ok && upstream.status !== 206) {
    console.error('[api/media] upstream status', {
      status: upstream.status,
      contentType: upstream.headers.get('content-type'),
    });
    return Response.json(
      { error: 'upstream_error', status: upstream.status },
      { status: upstream.status === 404 ? 404 : 502 }
    );
  }

  const headers = copyUpstreamHeaders(upstream.headers);
  for (const name of HOP_BY_HOP) {
    headers.delete(name);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}

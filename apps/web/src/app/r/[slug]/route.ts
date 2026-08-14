import { NextRequest, NextResponse } from 'next/server';
import {
  appendUtmParams,
  getDemoDestination,
  recordDemoClick,
} from '@/lib/bio-utm';
import {
  hashVisitorKey,
  recordBioLinkClick,
  resolveBioLinkDestination,
} from '@/lib/bio-clicks/persist';

/**
 * Short bio-store redirect: /r/{slug}
 * Records a real click, then sends the visitor to the destination with UTM params.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug) {
    return NextResponse.redirect(new URL('/', request.url), 302);
  }

  const cookieVid = request.cookies.get('clikd_vid')?.value || null;
  const visitorKey = hashVisitorKey({
    cookie: cookieVid,
    ip:
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip'),
    ua: request.headers.get('user-agent'),
  });

  // Keep legacy in-memory counter for same-process demos without DATABASE_URL.
  recordDemoClick(slug, visitorKey);

  let destination = '';
  let handle = 'creator';
  let workspaceId = '';
  let title: string | null = null;
  let blockId: string | null = null;
  let userId: string | null = null;

  try {
    const resolved = await resolveBioLinkDestination(slug);
    if (resolved?.destination_url) {
      destination = resolved.destination_url;
      handle = resolved.handle || handle;
      workspaceId = resolved.workspace_id;
      title = resolved.title;
      blockId = resolved.block_id;
      userId = resolved.user_id;
    }
  } catch (error) {
    console.warn('[r/slug] resolve failed', error);
  }

  if (!destination) {
    const registered = getDemoDestination(slug);
    if (registered?.destination) {
      destination = registered.destination;
      handle = registered.handle || handle;
      title = registered.title || title;
    }
  }

  if (workspaceId) {
    try {
      await recordBioLinkClick({
        workspaceId,
        userId,
        handle,
        slug,
        blockId,
        title,
        destinationUrl: destination || null,
        visitorKey,
      });
    } catch (error) {
      console.warn('[r/slug] record click failed', error);
    }
  }

  const res = destination
    ? NextResponse.redirect(
        appendUtmParams(destination, { handle, slug }),
        302
      )
    : (() => {
        const fallback = new URL('/', request.url);
        fallback.searchParams.set('utm_source', 'nordic_creator');
        fallback.searchParams.set('utm_medium', 'bio_store');
        fallback.searchParams.set('utm_content', slug);
        return NextResponse.redirect(fallback.toString(), 302);
      })();

  if (!cookieVid) {
    res.cookies.set('clikd_vid', visitorKey, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return res;
}

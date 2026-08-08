import { NextRequest } from 'next/server';
import {
  appendUtmParams,
  getDemoDestination,
  recordDemoClick,
} from '@/lib/bio-utm';

/**
 * Short bio-store redirect: /r/{slug}
 * Records a click (demo) and sends the visitor to the destination with UTM params.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug) {
    return Response.redirect(new URL('/', request.url), 302);
  }

  const visitor =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('user-agent')?.slice(0, 40) ||
    'anon';

  recordDemoClick(slug, visitor);

  const registered = getDemoDestination(slug);
  if (registered?.destination) {
    const target = appendUtmParams(registered.destination, {
      handle: registered.handle,
      slug,
    });
    return Response.redirect(target, 302);
  }

  // Fallback: send to landing with UTM still attached for analytics demos.
  const fallback = new URL('/', request.url);
  fallback.searchParams.set('utm_source', 'nordic_creator');
  fallback.searchParams.set('utm_medium', 'bio_store');
  fallback.searchParams.set('utm_content', slug);
  return Response.redirect(fallback.toString(), 302);
}

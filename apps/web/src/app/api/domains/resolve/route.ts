/**
 * GET /api/domains/resolve?host=example.se
 * Public lookup used by middleware for custom-domain rewrites.
 */

import { normalizeDomain, resolveDomainHost } from '@/lib/domains/persist';

export async function GET(request: Request) {
  const host = new URL(request.url).searchParams.get('host') || '';
  const domain = normalizeDomain(host);
  if (!domain) {
    return Response.json({ ok: false, found: false }, { status: 400 });
  }

  try {
    const record = await resolveDomainHost(domain);
    if (!record) {
      return Response.json({ ok: true, found: false });
    }
    const slug = (record.slug || record.default_community_slug || '')
      .replace(/^@/, '')
      .trim();
    return Response.json({
      ok: true,
      found: true,
      domain: record.domain,
      verified: record.verified,
      slug: slug || null,
      default_community_slug: record.default_community_slug,
      rewrite_bio: slug ? `/bio/${encodeURIComponent(slug)}` : null,
      rewrite_community: record.default_community_slug
        ? `/communities/${encodeURIComponent(record.default_community_slug)}`
        : null,
    });
  } catch (error) {
    console.warn('[domains/resolve]', error);
    return Response.json({ ok: false, found: false });
  }
}

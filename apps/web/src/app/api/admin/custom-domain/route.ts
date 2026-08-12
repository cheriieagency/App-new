import { requireFeature } from '@/lib/plan-guard';

/**
 * POST /api/admin/custom-domain — Pro-only custom domain linking (demo).
 */
export async function POST(request: Request) {
  const gate = await requireFeature('customDomain', request.headers);
  if (gate) return gate;

  try {
    const body = await request.json();
    const domain = String(body.domain ?? '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '');

    if (!domain || !domain.includes('.')) {
      return Response.json({ error: 'Valid domain required (e.g. yourname.se)' }, { status: 400 });
    }

    return Response.json({
      ok: true,
      domain,
      status: 'pending_dns',
      message: 'Custom domain queued (demo). Point DNS CNAME to clikd.app.',
    });
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}

export async function GET(request: Request) {
  const gate = await requireFeature('customDomain', request.headers);
  if (gate) return gate;
  return Response.json({ domain: null, status: 'unset', demo: true });
}

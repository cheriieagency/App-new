/**
 * GET/POST/DELETE /api/admin/domains
 * Pro-only custom domain management via Vercel Domains API.
 */

import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { requireFeature, requirePlanAtLeast } from '@/lib/plan-guard';
import { missingEnvKeys, missingEnvResponse, vercelEnv } from '@/lib/config/env';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
} from '@/lib/social/persist';
import {
  clearCustomDomain,
  dnsInstructions,
  getDomainForUser,
  normalizeDomain,
  saveCustomDomain,
  setDomainVerified,
} from '@/lib/domains/persist';
import {
  vercelAddDomain,
  vercelGetDomain,
  vercelRemoveDomain,
} from '@/lib/domains/vercel';

async function requireSession() {
  return auth.api.getSession({ headers: await headers() });
}

async function readWorkspaceId(
  request: Request,
  bodyWorkspaceId?: unknown
): Promise<string | null> {
  const jar = await cookies();
  return (
    (typeof bodyWorkspaceId === 'string' && bodyWorkspaceId.trim()) ||
    new URL(request.url).searchParams.get('workspaceId')?.trim() ||
    request.headers.get('x-workspace-id')?.trim() ||
    jar.get(ACTIVE_WORKSPACE_COOKIE)?.value ||
    jar.get(ACTIVE_WORKSPACE_COOKIE_ALIAS)?.value ||
    null
  );
}

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const gate = await requireFeature('customDomain', request.headers);
  if (gate) return gate;

  let record = null;
  try {
    record = await getDomainForUser(session.user.id);
  } catch (error) {
    console.error('[GET /api/admin/domains]', error);
    return Response.json({
      ok: true,
      domain: null,
      verified: false,
      status: 'unset',
      dns: null,
      error: 'schema_heal_pending',
    });
  }
  if (!record) {
    return Response.json({
      ok: true,
      domain: null,
      verified: false,
      status: 'unset',
      dns: null,
    });
  }

  let verified = record.verified;
  if (vercelEnv.token() && vercelEnv.projectId()) {
    try {
      const remote = await vercelGetDomain(record.domain);
      verified = remote.verified;
      if (verified !== record.verified) {
        await setDomainVerified({
          userId: session.user.id,
          domain: record.domain,
          verified,
        });
      }
    } catch {
      /* keep local flag */
    }
  }

  return Response.json({
    ok: true,
    domain: record.domain,
    verified,
    status: verified ? 'configured' : 'pending_dns',
    dns: dnsInstructions(record.domain),
    workspace_id: record.workspace_id,
    slug: record.slug,
  });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const planGate = await requirePlanAtLeast('pro', request.headers);
  if (planGate) return planGate;
  const featureGate = await requireFeature('customDomain', request.headers);
  if (featureGate) return featureGate;

  const missing = missingEnvKeys(...vercelEnv.requiredKeys);
  if (missing.length) {
    return missingEnvResponse(missing, 'Vercel');
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json(
      { error: 'DATABASE_URL required to persist custom domains' },
      { status: 503 }
    );
  }

  let body: {
    domain?: unknown;
    workspaceId?: unknown;
    slug?: unknown;
    workspaceName?: unknown;
    action?: unknown;
  } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Optional verify-only action.
  if (String(body.action || '') === 'verify') {
    const existing = await getDomainForUser(session.user.id);
    if (!existing) {
      return Response.json({ error: 'No domain connected' }, { status: 404 });
    }
    try {
      const remote = await vercelGetDomain(existing.domain);
      await setDomainVerified({
        userId: session.user.id,
        domain: existing.domain,
        verified: remote.verified,
      });
      return Response.json({
        ok: true,
        domain: existing.domain,
        verified: remote.verified,
        status: remote.verified ? 'configured' : 'pending_dns',
        dns: dnsInstructions(existing.domain),
      });
    } catch (error) {
      return Response.json(
        {
          error: 'verify_failed',
          message: error instanceof Error ? error.message : 'Verify failed',
        },
        { status: 502 }
      );
    }
  }

  const domain = normalizeDomain(String(body.domain ?? ''));
  if (!domain || !domain.includes('.') || /\s/.test(domain)) {
    return Response.json(
      { error: 'Valid domain required (e.g. yourname.se or hub.yourname.se)' },
      { status: 400 }
    );
  }

  const workspaceId =
    (await readWorkspaceId(request, body.workspaceId)) ||
    `ws-${session.user.id.slice(0, 8)}`;
  const slug = body.slug != null ? String(body.slug) : null;
  const workspaceName =
    body.workspaceName != null ? String(body.workspaceName) : null;

  try {
    const vercel = await vercelAddDomain(domain);
    const saved = await saveCustomDomain({
      userId: session.user.id,
      workspaceId,
      domain,
      slug,
      workspaceName,
      verified: vercel.verified,
    });

    return Response.json({
      ok: true,
      domain: saved.domain,
      verified: saved.verified,
      status: saved.verified ? 'configured' : 'pending_dns',
      dns: dnsInstructions(saved.domain),
      message: saved.verified
        ? 'Domain connected and verified'
        : 'Domain added. Update DNS, then tap Verify.',
    });
  } catch (error) {
    console.error('[api/admin/domains] POST', error);
    return Response.json(
      {
        error: 'domain_add_failed',
        message: error instanceof Error ? error.message : 'Failed to add domain',
      },
      { status: 502 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await requireSession();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const gate = await requireFeature('customDomain', request.headers);
  if (gate) return gate;

  let body: { domain?: unknown; workspaceId?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    /* optional body */
  }

  const existing = await getDomainForUser(session.user.id);
  const domain =
    normalizeDomain(String(body.domain ?? existing?.domain ?? '')) || null;

  if (!domain) {
    return Response.json({ error: 'No domain to remove' }, { status: 400 });
  }

  if (vercelEnv.token() && vercelEnv.projectId()) {
    try {
      await vercelRemoveDomain(domain);
    } catch (error) {
      console.warn('[api/admin/domains] Vercel delete', error);
    }
  }

  await clearCustomDomain({
    userId: session.user.id,
    workspaceId:
      (typeof body.workspaceId === 'string' && body.workspaceId) ||
      existing?.workspace_id,
    domain,
  });

  return Response.json({ ok: true, removed: domain });
}

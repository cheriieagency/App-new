/**
 * GET/POST /api/admin/reports/automation
 * 1st-of-month automation settings for the active workspace.
 */

import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
} from '@/lib/social/persist';
import {
  getAutomationConfig,
  upsertAutomationConfig,
} from '@/lib/reports/persist';

async function readWorkspaceId(request: Request, bodyWorkspaceId?: unknown) {
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

const DEFAULT_CONFIG = {
  enabled: false,
  recipient_emails: [] as string[],
  platforms: ['instagram', 'facebook', 'tiktok'],
  custom_email_note: null as string | null,
  subject_template: 'Your {{month}} performance report — {{workspace}}',
  hide_ai_on_public_link: false,
};

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workspaceId = await readWorkspaceId(request);
  if (!workspaceId) {
    return Response.json({ ok: true, config: { ...DEFAULT_CONFIG, workspace_id: null } });
  }

  const config = await getAutomationConfig({
    userId: session.user.id,
    workspaceId,
  });

  return Response.json({
    ok: true,
    config: config || {
      ...DEFAULT_CONFIG,
      workspace_id: workspaceId,
      user_id: session.user.id,
    },
  });
}

export async function POST(request: Request) {
  return upsert(request);
}

export async function PUT(request: Request) {
  return upsert(request);
}

async function upsert(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    workspaceId?: unknown;
    enabled?: unknown;
    recipientEmails?: unknown;
    platforms?: unknown;
    customEmailNote?: unknown;
    subjectTemplate?: unknown;
    hideAiOnPublicLink?: unknown;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const workspaceId = await readWorkspaceId(request, body.workspaceId);
  if (!workspaceId) {
    return Response.json({ error: 'workspaceId required' }, { status: 400 });
  }

  const recipientEmails = Array.isArray(body.recipientEmails)
    ? body.recipientEmails
        .map(String)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.includes('@'))
    : undefined;

  const platforms = Array.isArray(body.platforms)
    ? body.platforms.map(String).filter(Boolean)
    : undefined;

  try {
    const config = await upsertAutomationConfig({
      userId: session.user.id,
      workspaceId,
      enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
      recipientEmails,
      platforms,
      customEmailNote:
        body.customEmailNote !== undefined
          ? body.customEmailNote == null
            ? null
            : String(body.customEmailNote)
          : undefined,
      subjectTemplate:
        body.subjectTemplate != null
          ? String(body.subjectTemplate)
          : undefined,
      hideAiOnPublicLink:
        typeof body.hideAiOnPublicLink === 'boolean'
          ? body.hideAiOnPublicLink
          : undefined,
    });

    if (!config) {
      return Response.json(
        { error: 'DATABASE_URL required to save automation' },
        { status: 503 }
      );
    }

    return Response.json({ ok: true, config });
  } catch (error) {
    console.warn('[reports/automation]', error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to save automation',
      },
      { status: 500 }
    );
  }
}

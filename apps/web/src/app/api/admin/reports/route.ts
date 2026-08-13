/**
 * GET/POST /api/admin/reports
 * Directory of frozen monthly reports + manual report builder.
 */

import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
} from '@/lib/social/persist';
import { listMonthlyReports } from '@/lib/reports/persist';
import { buildAndSaveReport } from '@/lib/reports/build';

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

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized', reports: [] }, { status: 401 });
  }

  const workspaceId = await readWorkspaceId(request);
  if (!workspaceId) {
    return Response.json({
      ok: true,
      reports: [],
      message: 'Select a workspace',
    });
  }

  try {
    const reports = await listMonthlyReports(workspaceId);
    return Response.json({ ok: true, workspaceId, reports });
  } catch (error) {
    console.warn('[admin/reports GET]', error);
    return Response.json({
      ok: false,
      reports: [],
      error: error instanceof Error ? error.message : 'Failed to load reports',
    });
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    title?: unknown;
    startDate?: unknown;
    start_date?: unknown;
    endDate?: unknown;
    end_date?: unknown;
    dateRangeLabel?: unknown;
    date_range_label?: unknown;
    platforms?: unknown;
    includeAiAnalysis?: unknown;
    hideAiOnPublicLink?: unknown;
    workspaceId?: unknown;
    workspace_id?: unknown;
    workspaceName?: unknown;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const today = new Date().toISOString().split('T')[0];
  const workspaceId = await readWorkspaceId(
    request,
    body.workspaceId || body.workspace_id
  );
  if (!workspaceId) {
    return Response.json({ error: 'workspaceId required' }, { status: 400 });
  }

  // camelCase + snake_case with non-null date fallbacks
  const startDate = String(body.startDate || body.start_date || today).slice(
    0,
    10
  );
  const endDate = String(body.endDate || body.end_date || today).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return Response.json(
      { error: 'startDate and endDate must be YYYY-MM-DD' },
      { status: 400 }
    );
  }
  if (startDate > endDate) {
    return Response.json({ error: 'startDate must be ≤ endDate' }, { status: 400 });
  }

  const dateRangeLabel =
    String(body.dateRangeLabel || body.date_range_label || '').trim() ||
    `${startDate} - ${endDate}`;

  const platforms = Array.isArray(body.platforms)
    ? body.platforms.map(String).filter(Boolean)
    : ['instagram', 'facebook', 'tiktok'];

  const title =
    String(body.title || '').trim() || 'Monthly Analytics Report';

  try {
    const { report, metrics, ai } = await buildAndSaveReport({
      userId: session.user.id,
      workspaceId,
      workspaceName:
        body.workspaceName != null ? String(body.workspaceName) : null,
      title,
      startDate,
      endDate,
      dateRangeLabel,
      platforms,
      includeAiAnalysis: body.includeAiAnalysis !== false,
      hideAiOnPublicLink: Boolean(body.hideAiOnPublicLink),
      isAutomated: false,
    });

    if (!report) {
      return Response.json(
        { error: 'DATABASE_URL required to save reports' },
        { status: 503 }
      );
    }

    return Response.json({
      ok: true,
      report,
      metrics,
      aiInsights: ai,
    });
  } catch (error) {
    console.warn('[admin/reports POST]', error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Failed to build report',
      },
      { status: 500 }
    );
  }
}

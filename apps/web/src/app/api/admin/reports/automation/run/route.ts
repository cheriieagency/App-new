/**
 * POST /api/admin/reports/automation/run
 * Manually run previous-month report + optional email for this workspace.
 */

import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  ACTIVE_WORKSPACE_COOKIE,
  ACTIVE_WORKSPACE_COOKIE_ALIAS,
} from '@/lib/social/persist';
import { getAutomationConfig } from '@/lib/reports/persist';
import { buildAndSaveReport, previousCalendarMonth } from '@/lib/reports/build';
import { sendMonthlyReportEmails } from '@/lib/reports/email';

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

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    workspaceId?: unknown;
    workspaceName?: unknown;
    sendEmail?: unknown;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const workspaceId = await readWorkspaceId(request, body.workspaceId);
  if (!workspaceId) {
    return Response.json({ error: 'workspaceId required' }, { status: 400 });
  }

  const config = await getAutomationConfig({
    userId: session.user.id,
    workspaceId,
  });

  const platforms =
    config?.platforms?.length
      ? config.platforms
      : ['instagram', 'facebook', 'tiktok'];
  const period = previousCalendarMonth(new Date());
  const sendEmail = body.sendEmail !== false;
  const recipients = config?.recipient_emails || [];

  try {
    const { report, metrics, ai } = await buildAndSaveReport({
      userId: session.user.id,
      workspaceId,
      workspaceName:
        body.workspaceName != null ? String(body.workspaceName) : null,
      title: `${period.label} performance report`,
      startDate: period.start,
      endDate: period.end,
      dateRangeLabel: `${period.start} - ${period.end}`,
      platforms,
      includeAiAnalysis: true,
      hideAiOnPublicLink: Boolean(config?.hide_ai_on_public_link),
      isAutomated: true,
    });

    if (!report) {
      return Response.json(
        { error: 'DATABASE_URL required to save reports' },
        { status: 503 }
      );
    }

    let emails: Array<Record<string, unknown>> = [];
    if (sendEmail && recipients.length > 0) {
      emails = (await sendMonthlyReportEmails({
        report,
        recipients,
        customNote: config?.custom_email_note,
        subjectTemplate: config?.subject_template,
        workspaceName:
          body.workspaceName != null ? String(body.workspaceName) : undefined,
      })) as Array<Record<string, unknown>>;
    }

    return Response.json({
      ok: true,
      period,
      report,
      metrics,
      aiInsights: ai,
      emails,
      emailed: emails.length > 0,
      message:
        sendEmail && recipients.length === 0
          ? 'Report created. Save recipient emails to also send email.'
          : undefined,
    });
  } catch (error) {
    console.warn('[reports/automation/run]', error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to run automation',
      },
      { status: 500 }
    );
  }
}

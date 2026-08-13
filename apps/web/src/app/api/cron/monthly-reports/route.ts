/**
 * GET/POST /api/cron/monthly-reports
 * Vercel Cron — 1st of month 08:00 UTC.
 * Header: Authorization: Bearer ${CRON_SECRET}
 */

import { cronEnv, missingEnvKeys, missingEnvResponse } from '@/lib/config/env';
import { listEnabledAutomations } from '@/lib/reports/persist';
import { buildAndSaveReport, previousCalendarMonth } from '@/lib/reports/build';
import { sendMonthlyReportEmails } from '@/lib/reports/email';

function authorize(request: Request): boolean {
  const secret = cronEnv.secret();
  if (!secret) return false;
  const header = request.headers.get('authorization') || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const query = new URL(request.url).searchParams.get('secret') || '';
  return bearer === secret || query === secret;
}

async function runCron(request: Request) {
  const missing = missingEnvKeys(...cronEnv.requiredKeys);
  if (missing.length) {
    return missingEnvResponse(missing, 'Cron');
  }

  if (!authorize(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const period = previousCalendarMonth(new Date());
  const configs = await listEnabledAutomations();
  const results: Array<Record<string, unknown>> = [];

  for (const config of configs) {
    try {
      const title = period.label
        ? `${period.label} performance report`
        : 'Monthly Analytics Report';
      const dateRangeLabel = `${period.start} - ${period.end}`;
      const { report } = await buildAndSaveReport({
        userId: config.user_id,
        workspaceId: config.workspace_id,
        workspaceName: null,
        title,
        startDate: period.start,
        endDate: period.end,
        dateRangeLabel,
        platforms: config.platforms?.length
          ? config.platforms
          : ['instagram', 'facebook', 'tiktok'],
        includeAiAnalysis: true,
        hideAiOnPublicLink: config.hide_ai_on_public_link,
        isAutomated: true,
      });

      if (!report) {
        results.push({
          workspaceId: config.workspace_id,
          ok: false,
          error: 'save_failed',
        });
        continue;
      }

      const emails = await sendMonthlyReportEmails({
        report,
        recipients: config.recipient_emails,
        customNote: config.custom_email_note,
        subjectTemplate: config.subject_template,
      });

      results.push({
        workspaceId: config.workspace_id,
        ok: true,
        reportId: report.id,
        token: report.public_share_token,
        emails,
      });
    } catch (error) {
      console.warn('[cron/monthly-reports] workspace failed', config.workspace_id, error);
      results.push({
        workspaceId: config.workspace_id,
        ok: false,
        error: error instanceof Error ? error.message : 'failed',
      });
    }
  }

  return Response.json({
    ok: true,
    period,
    processed: results.length,
    results,
  });
}

export async function GET(request: Request) {
  return runCron(request);
}

export async function POST(request: Request) {
  return runCron(request);
}

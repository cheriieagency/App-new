/**
 * GET/POST /api/cron/monthly-reports
 * Daily cron at 08:00 UTC — runs automations whose send_day_of_month matches today.
 * Each config is unique per (user_id, workspace_id); reports never cross users/workspaces.
 * Header: Authorization: Bearer ${CRON_SECRET}
 */

import { cronEnv, missingEnvKeys, missingEnvResponse } from '@/lib/config/env';
import {
  findReportForPeriod,
  listEnabledAutomationsForDay,
  markAutomationSent,
} from '@/lib/reports/persist';
import { buildAndSaveReport, previousCalendarMonth } from '@/lib/reports/build';
import { sendMonthlyReportEmails } from '@/lib/reports/email';
import { userOwnsWorkspace } from '@/lib/social/workspace-access';

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

  const now = new Date();
  const utcDay = now.getUTCDate();
  const period = previousCalendarMonth(now);
  const periodKey = period.start.slice(0, 7); // YYYY-MM of the snapshot month
  const configs = await listEnabledAutomationsForDay(utcDay);
  const results: Array<Record<string, unknown>> = [];

  for (const config of configs) {
    try {
      // Skip if this user+workspace already sent for this period.
      if (config.last_sent_period === periodKey) {
        results.push({
          userId: config.user_id,
          workspaceId: config.workspace_id,
          ok: true,
          skipped: 'already_sent',
          periodKey,
        });
        continue;
      }

      // Ownership gate — never build for a workspace the user no longer owns.
      const owns = await userOwnsWorkspace(config.user_id, config.workspace_id);
      if (!owns) {
        results.push({
          userId: config.user_id,
          workspaceId: config.workspace_id,
          ok: false,
          error: 'workspace_not_owned',
        });
        continue;
      }

      const title = period.label
        ? `${period.label} performance report`
        : 'Monthly Analytics Report';
      const dateRangeLabel = `${period.start} - ${period.end}`;

      let report =
        (await findReportForPeriod({
          userId: config.user_id,
          workspaceId: config.workspace_id,
          periodStart: period.start,
          periodEnd: period.end,
        })) ?? null;

      if (!report) {
        const built = await buildAndSaveReport({
          userId: config.user_id,
          workspaceId: config.workspace_id,
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
        report = built.report;
      }

      if (!report) {
        results.push({
          userId: config.user_id,
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

      const emailSent = emails.some(
        (e) => (e as { ok?: boolean }).ok === true
      );
      if (emailSent) {
        await markAutomationSent({
          userId: config.user_id,
          workspaceId: config.workspace_id,
          periodKey,
        });
      }

      results.push({
        userId: config.user_id,
        workspaceId: config.workspace_id,
        ok: emailSent,
        reportId: report.id,
        token: report.public_share_token,
        emails,
        ...(emailSent ? {} : { error: 'email_failed' }),
      });
    } catch (error) {
      console.warn(
        '[cron/monthly-reports] failed',
        config.user_id,
        config.workspace_id,
        error
      );
      results.push({
        userId: config.user_id,
        workspaceId: config.workspace_id,
        ok: false,
        error: error instanceof Error ? error.message : 'failed',
      });
    }
  }

  return Response.json({
    ok: true,
    utcDay,
    period,
    periodKey,
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

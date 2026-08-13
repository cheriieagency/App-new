/**
 * Dispatch monthly report emails via Resend.
 */

import * as React from 'react';
import { sendEmail } from '@/lib/email/send';
import { MonthlyReportEmail } from '@/lib/email/templates/MonthlyReportEmail';
import { buildUnsubscribeUrl } from '@/lib/email/unsubscribe';
import { appBaseUrl } from '@/lib/config/env';
import type { MonthlyReportRow } from '@/lib/reports/persist';

export async function sendMonthlyReportEmails(input: {
  report: MonthlyReportRow;
  recipients: string[];
  customNote?: string | null;
  subjectTemplate?: string;
  workspaceName?: string;
}) {
  const origin = appBaseUrl();
  const shareUrl = `${origin}/reports/share/${input.report.public_share_token}`;
  const workspace =
    input.workspaceName || input.report.workspace_name || 'Workspace';
  const monthLabel = new Date(input.report.period_start + 'T12:00:00Z').toLocaleString(
    'en-US',
    { month: 'long', year: 'numeric', timeZone: 'UTC' }
  );
  const subject = (input.subjectTemplate || 'Your {{month}} performance report — {{workspace}}')
    .replace(/\{\{month\}\}/gi, monthLabel)
    .replace(/\{\{workspace\}\}/gi, workspace);

  const periodLabel = `${input.report.period_start} → ${input.report.period_end}`;
  const m = input.report.metrics;
  const results = [];

  for (const to of input.recipients) {
    const email = to.trim().toLowerCase();
    if (!email.includes('@')) continue;
    const result = await sendEmail({
      to: email,
      subject,
      unsubscribeEmail: email,
      tags: [
        { name: 'category', value: 'monthly_report' },
        { name: 'workspace', value: workspace.slice(0, 40) },
      ],
      react: React.createElement(MonthlyReportEmail, {
        workspaceName: workspace,
        title: input.report.title,
        periodLabel,
        views: m.views || 0,
        engagementRate: m.engagementRate || 0,
        followerGrowth: m.followerGrowth || 0,
        totalPosts: m.totalPosts || 0,
        shareUrl,
        customNote: input.customNote,
        unsubscribeUrl: buildUnsubscribeUrl(email, origin),
      }),
    });
    results.push({ email, ...result });
  }

  return results;
}

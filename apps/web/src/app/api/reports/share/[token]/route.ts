/**
 * GET /api/reports/share/[token]
 * Public (unauthenticated) frozen report payload for guest clients.
 */

import { getReportByShareToken } from '@/lib/reports/persist';

type Ctx = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: Ctx) {
  const { token: raw } = await context.params;
  const token = String(raw || '').trim();
  if (!token || token.length < 16) {
    return Response.json({ error: 'Invalid token' }, { status: 400 });
  }

  try {
    const report = await getReportByShareToken(token);
    if (!report) {
      return Response.json({ error: 'Report not found' }, { status: 404 });
    }

    if (
      report.public_link_expires_at &&
      new Date(report.public_link_expires_at).getTime() < Date.now()
    ) {
      return Response.json({ error: 'Link expired' }, { status: 410 });
    }

    const payload: Record<string, unknown> = {
      ok: true,
      id: report.id,
      title: report.title,
      workspaceName: report.workspace_name || 'Workspace',
      periodStart: report.period_start,
      periodEnd: report.period_end,
      platforms: report.platforms,
      metrics: report.metrics,
      isAutomated: report.is_automated,
      createdAt: report.created_at,
      verifiedSnapshot: true,
    };

    // Protect internal strategy notes from external clients when toggled.
    if (!report.hide_ai_on_public_link && report.ai_insights) {
      payload.aiInsights = report.ai_insights;
    }

    return Response.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.warn('[reports/share]', error);
    return Response.json({ error: 'Failed to load report' }, { status: 500 });
  }
}

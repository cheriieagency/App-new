/**
 * Build frozen report metrics from live social APIs for a date range.
 */

import { fetchLiveUnifiedPosts } from '@/lib/analytics/unified-posts';
import { listLiveSocialAccountsForUser } from '@/lib/social/persist';
import { generateReportAiInsights } from '@/lib/reports/ai-insights';
import {
  insertMonthlyReport,
  type AiInsights,
  type MonthlyReportRow,
  type ReportMetrics,
} from '@/lib/reports/persist';

export function previousCalendarMonth(ref = new Date()): {
  start: string;
  end: string;
  label: string;
} {
  const y = ref.getUTCFullYear();
  const m = ref.getUTCMonth(); // 0-indexed current month
  // Previous month
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0)); // last day of previous month
  const startIso = start.toISOString().slice(0, 10);
  const endIso = end.toISOString().slice(0, 10);
  const label = start.toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return { start: startIso, end: endIso, label };
}

function inRange(iso: string, start: string, end: string) {
  const d = iso.slice(0, 10);
  return d >= start && d <= end;
}

export async function collectReportMetrics(input: {
  userId: string;
  workspaceId: string;
  startDate: string;
  endDate: string;
  platforms?: string[];
}): Promise<ReportMetrics> {
  const allowed = new Set(
    (input.platforms || ['instagram', 'facebook', 'tiktok']).map((p) =>
      p.toLowerCase()
    )
  );

  const live = await fetchLiveUnifiedPosts({
    userId: input.userId,
    workspaceId: input.workspaceId,
    sort: 'engagementRate',
  });

  const posts = live.posts.filter(
    (p) =>
      allowed.has(p.platform) &&
      inRange(p.publishedAt, input.startDate, input.endDate)
  );

  const views = posts.reduce((n, p) => n + (p.impressions || 0), 0);
  const likes = posts.reduce((n, p) => n + (p.likes || 0), 0);
  const comments = posts.reduce((n, p) => n + (p.comments || 0), 0);
  const shares = posts.reduce((n, p) => n + (p.shares || 0), 0);
  const engagementRate =
    views > 0
      ? Math.round(((likes + comments + shares) / views) * 1000) / 10
      : 0;

  const accounts = await listLiveSocialAccountsForUser({
    userId: input.userId,
    workspaceId: input.workspaceId,
  });
  const followerGrowth = accounts
    .filter((a) => a.connected && allowed.has(a.platform))
    .reduce((n, a) => n + (Number(a.follower_count) || 0), 0);

  const byPlatform = new Map<
    string,
    { posts: number; views: number; likes: number; comments: number; shares: number }
  >();
  for (const p of posts) {
    const cur = byPlatform.get(p.platform) || {
      posts: 0,
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
    };
    cur.posts += 1;
    cur.views += p.impressions || 0;
    cur.likes += p.likes || 0;
    cur.comments += p.comments || 0;
    cur.shares += p.shares || 0;
    byPlatform.set(p.platform, cur);
  }

  const platformBreakdown = [...byPlatform.entries()].map(([platform, v]) => ({
    platform,
    posts: v.posts,
    views: v.views,
    likes: v.likes,
    comments: v.comments,
    engagementRate:
      v.views > 0
        ? Math.round(((v.likes + v.comments + v.shares) / v.views) * 1000) / 10
        : 0,
  }));

  const topPosts = [...posts]
    .sort((a, b) => b.engagementRate - a.engagementRate || b.impressions - a.impressions)
    .slice(0, 8)
    .map((p) => ({
      id: p.id,
      platform: p.platform,
      title: p.title,
      mediaUrl: p.mediaUrl,
      permalink: p.permalink,
      impressions: p.impressions,
      likes: p.likes,
      comments: p.comments,
      engagementRate: p.engagementRate,
      publishedAt: p.publishedAt,
    }));

  return {
    views,
    engagementRate,
    followerGrowth,
    totalPosts: posts.length,
    likes,
    comments,
    shares,
    topPosts,
    platformBreakdown,
  };
}

export async function buildAndSaveReport(input: {
  userId: string;
  workspaceId: string;
  workspaceName?: string | null;
  title?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  dateRangeLabel?: string | null;
  platforms?: string[];
  includeAiAnalysis?: boolean;
  hideAiOnPublicLink?: boolean;
  isAutomated?: boolean;
}): Promise<{ report: MonthlyReportRow | null; metrics: ReportMetrics; ai: AiInsights | null }> {
  const startDate =
    String(input.startDate || '').slice(0, 10) ||
    new Date().toISOString().slice(0, 10);
  const endDate =
    String(input.endDate || '').slice(0, 10) || startDate;
  const dateRangeLabel =
    String(input.dateRangeLabel || '').trim() || `${startDate} - ${endDate}`;
  const title =
    String(input.title || '').trim() || 'Monthly Analytics Report';
  const platforms = input.platforms?.length
    ? input.platforms
    : ['instagram', 'facebook', 'tiktok'];

  const metrics = await collectReportMetrics({
    userId: input.userId,
    workspaceId: input.workspaceId,
    startDate,
    endDate,
    platforms,
  });

  let ai: AiInsights | null = null;
  if (input.includeAiAnalysis !== false) {
    ai = await generateReportAiInsights({
      workspaceName: input.workspaceName || 'Workspace',
      periodStart: startDate,
      periodEnd: endDate,
      platforms,
      metrics,
    });
  }

  const report = await insertMonthlyReport({
    workspaceId: input.workspaceId,
    userId: input.userId,
    workspaceName: input.workspaceName,
    title,
    periodStart: startDate,
    periodEnd: endDate,
    dateRangeLabel,
    platforms,
    metrics,
    aiInsights: ai,
    includeAiAnalysis: input.includeAiAnalysis !== false,
    hideAiOnPublicLink: Boolean(input.hideAiOnPublicLink),
    isAutomated: Boolean(input.isAutomated),
  });

  return { report, metrics, ai };
}

/**
 * OpenAI gpt-4o-mini strategy insights for frozen monthly reports.
 */

import { openaiEnv } from '@/lib/config/env';
import type { AiInsights, ReportMetrics } from '@/lib/reports/persist';

export async function generateReportAiInsights(input: {
  workspaceName: string;
  periodStart: string;
  periodEnd: string;
  platforms: string[];
  metrics: ReportMetrics;
}): Promise<AiInsights> {
  const apiKey = openaiEnv.apiKey() || process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return fallbackInsights(input.metrics);
  }

  const top = input.metrics.topPosts
    .slice(0, 5)
    .map(
      (p, i) =>
        `${i + 1}. [${p.platform}] "${p.title}" — ${p.impressions} views, ER ${p.engagementRate}%`
    )
    .join('\n');

  const platformLines = input.metrics.platformBreakdown
    .map(
      (p) =>
        `- ${p.platform}: ${p.posts} posts, ${p.views} views, ER ${p.engagementRate}%`
    )
    .join('\n');

  const userContent = [
    `Brand: ${input.workspaceName}`,
    `Period: ${input.periodStart} → ${input.periodEnd}`,
    `Platforms: ${input.platforms.join(', ') || 'all'}`,
    '',
    'KPIs:',
    `- Views/Impressions: ${input.metrics.views}`,
    `- Engagement rate: ${input.metrics.engagementRate}%`,
    `- Follower growth: ${input.metrics.followerGrowth}`,
    `- Total posts: ${input.metrics.totalPosts}`,
    `- Likes: ${input.metrics.likes}, Comments: ${input.metrics.comments}`,
    '',
    'Platform breakdown:',
    platformLines || '(none)',
    '',
    'Top posts:',
    top || '(none)',
    '',
    'Return ONLY valid JSON with keys:',
    'executiveSummary (string, 2-3 sentences),',
    'wins (string array, 2-4 items),',
    'improvements (string array, 2-4 items),',
    'recommendations (string array, 3-5 actionable items).',
  ].join('\n');

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are a senior social media strategist for Nordic creators. Be specific, concise, and data-driven. Never invent metrics not provided.',
          },
          { role: 'user', content: userContent },
        ],
      }),
    });

    if (!res.ok) {
      console.warn('[reports/ai]', res.status, await res.text().catch(() => ''));
      return fallbackInsights(input.metrics);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string | null } }[];
    };
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) return fallbackInsights(input.metrics);

    const parsed = JSON.parse(raw) as Partial<AiInsights>;
    return {
      executiveSummary:
        String(parsed.executiveSummary || '').trim() ||
        fallbackInsights(input.metrics).executiveSummary,
      wins: Array.isArray(parsed.wins)
        ? parsed.wins.map(String).filter(Boolean).slice(0, 6)
        : [],
      improvements: Array.isArray(parsed.improvements)
        ? parsed.improvements.map(String).filter(Boolean).slice(0, 6)
        : [],
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.map(String).filter(Boolean).slice(0, 8)
        : [],
    };
  } catch (error) {
    console.warn('[reports/ai] failed', error);
    return fallbackInsights(input.metrics);
  }
}

function fallbackInsights(metrics: ReportMetrics): AiInsights {
  return {
    executiveSummary: `In this period you published ${metrics.totalPosts} posts with ${metrics.views.toLocaleString()} views and an average engagement rate of ${metrics.engagementRate}%. Use the wins and recommendations below to plan the next cycle.`,
    wins: [
      metrics.totalPosts > 0
        ? `Published ${metrics.totalPosts} pieces of content across connected channels`
        : 'Report snapshot created for this date range',
      metrics.engagementRate > 0
        ? `Average engagement rate of ${metrics.engagementRate}%`
        : 'Baseline metrics captured for future comparison',
    ],
    improvements: [
      'Increase posting consistency on the highest-ER platform',
      'Double-down on formats that appeared in top posts',
    ],
    recommendations: [
      'Schedule 3–5 posts/week on your strongest platform',
      'Repurpose the top post into Stories/Reels within 48 hours',
      'Add a clear CTA in captions to lift comments and saves',
    ],
  };
}

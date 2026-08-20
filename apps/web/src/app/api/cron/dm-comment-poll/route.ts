/**
 * GET/POST /api/cron/dm-comment-poll
 * Every minute — fetch recent Instagram comments and auto-run Comment-to-DM
 * rules (webhook backup when Meta does not deliver / admin tab is closed).
 * Header: Authorization: Bearer ${CRON_SECRET}
 */

import { cronEnv, missingEnvKeys, missingEnvResponse } from '@/lib/config/env';
import { pollAndProcessCommentAutomations } from '@/lib/dm-automations/poll-comments';

function authorize(request: Request): boolean {
  const secret = cronEnv.secret();
  if (!secret) return false;
  const header = request.headers.get('authorization') || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const query = new URL(request.url).searchParams.get('secret') || '';
  return bearer === secret || query === secret;
}

async function runCron() {
  const missing = missingEnvKeys(...cronEnv.requiredKeys);
  if (missing.length) {
    return missingEnvResponse(missing, 'Cron');
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json(
      { error: 'database_unavailable', message: 'DATABASE_URL is not configured' },
      { status: 503 }
    );
  }

  const result = await pollAndProcessCommentAutomations({
    lookbackMinutes: 30,
    maxCommentsPerAccount: 40,
  });

  return Response.json({
    ok: true,
    intervalSeconds: 60,
    ...result,
  });
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    return await runCron();
  } catch (error) {
    console.error('[cron/dm-comment-poll]', error);
    return Response.json(
      {
        error: 'poll_failed',
        message: error instanceof Error ? error.message : 'Failed',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}

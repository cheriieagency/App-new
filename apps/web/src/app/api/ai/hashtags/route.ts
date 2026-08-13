/**
 * POST /api/ai/hashtags
 * Authenticated OpenAI hashtag bucket generator (gpt-4o-mini).
 * Body: { workspaceId?, niche?, topHashtags? } → { buckets: [{ title, tags }] }
 */

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { generateHashtagBuckets } from '@/lib/ai/openai';
import { missingEnvKeys, missingEnvResponse, openaiEnv } from '@/lib/config/env';
import { requireFeature } from '@/lib/plan-guard';

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const gate = await requireFeature('aiCopilotSuite', request.headers);
  if (gate) return gate;

  const missing = missingEnvKeys(...openaiEnv.requiredKeys);
  if (missing.length) {
    return missingEnvResponse(missing, 'OpenAI');
  }

  let body: {
    workspaceId?: unknown;
    niche?: unknown;
    topHashtags?: unknown;
  } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const niche =
    body.niche != null && String(body.niche).trim()
      ? String(body.niche).trim()
      : undefined;
  const topHashtags = Array.isArray(body.topHashtags)
    ? body.topHashtags.map((t) => String(t)).filter(Boolean)
    : [];

  try {
    const buckets = await generateHashtagBuckets({ niche, topHashtags });
    return Response.json({
      ok: true,
      buckets,
      workspaceId:
        body.workspaceId != null ? String(body.workspaceId) : null,
    });
  } catch (error) {
    console.error('[api/ai/hashtags]', error);
    return Response.json(
      {
        error: 'hashtag_generation_failed',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to generate hashtag ideas',
      },
      { status: 502 }
    );
  }
}

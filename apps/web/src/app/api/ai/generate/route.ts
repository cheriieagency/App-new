/**
 * POST /api/ai/generate
 * Authenticated AI Copilot — social caption generation (gpt-4o-mini).
 * Body: { prompt, platform?, tone? } → { caption }
 */

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { generateSocialCaption } from '@/lib/ai/openai';
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

  let body: { prompt?: unknown; platform?: unknown; tone?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const prompt = String(body.prompt ?? '').trim();
  if (!prompt) {
    return Response.json({ error: 'prompt is required' }, { status: 400 });
  }

  try {
    const caption = await generateSocialCaption({
      prompt,
      platform: body.platform != null ? String(body.platform) : undefined,
      tone: body.tone != null ? String(body.tone) : undefined,
    });
    return Response.json({ caption });
  } catch (error) {
    console.error('[api/ai/generate]', error);
    return Response.json(
      {
        error: 'caption_generation_failed',
        message: error instanceof Error ? error.message : 'Failed to generate caption',
      },
      { status: 502 }
    );
  }
}

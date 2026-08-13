/**
 * OpenAI Chat Completions helpers for the clikd: AI Copilot.
 * Reads OPENAI_API_KEY from process.env (via openaiEnv).
 */

import { openaiEnv } from '@/lib/config/env';

export type GenerateSocialCaptionInput = {
  prompt: string;
  platform?: string;
  tone?: string;
};

const SYSTEM_PROMPT =
  'You are an expert social media copywriter for creators and brands. Generate engaging captions with emojis and 3-5 high-converting hashtags.';

/**
 * Generate a platform-ready social caption via gpt-4o-mini.
 * Returns the caption text string (never throws for missing key — caller checks).
 */
export async function generateSocialCaption(
  input: GenerateSocialCaptionInput
): Promise<string> {
  const apiKey = openaiEnv.apiKey() || process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const platform = (input.platform || 'instagram').trim();
  const tone = (input.tone || 'engaging').trim();
  const prompt = input.prompt.trim();
  if (!prompt) {
    throw new Error('prompt is required');
  }

  const userContent = [
    `Platform: ${platform}`,
    `Tone: ${tone}`,
    `Topic / brief: ${prompt}`,
    '',
    'Write one ready-to-post caption. Keep it concise. Include 3-5 relevant hashtags at the end.',
  ].join('\n');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error('[openai/generateSocialCaption]', res.status, detail.slice(0, 400));
    throw new Error(`OpenAI request failed (${res.status})`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };
  const caption = data.choices?.[0]?.message?.content?.trim();
  if (!caption) {
    throw new Error('OpenAI returned an empty caption');
  }
  return caption;
}

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

export type HashtagBucket = {
  title: string;
  tags: string[];
};

export type GenerateHashtagBucketsInput = {
  niche?: string;
  topHashtags?: string[];
};

const HASHTAG_SYSTEM_PROMPT = `You are an expert social media growth strategist. Analyze the creator's top hashtags and niche, then generate 3 high-converting hashtag buckets:
High Reach (Broad/Trending)
Niche Targeted (Specific Community)
Low Competition (High Conversion)
Return valid JSON with format: { "buckets": [ { "title": string, "tags": string[] } ] }
Each bucket must include 8-12 hashtags starting with #. No markdown, JSON only.`;

/** Generate 3 hashtag strategy buckets via gpt-4o-mini. */
export async function generateHashtagBuckets(
  input: GenerateHashtagBucketsInput
): Promise<HashtagBucket[]> {
  const apiKey = openaiEnv.apiKey() || process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const niche = (input.niche || 'creator / lifestyle brand').trim();
  const top = (input.topHashtags || []).filter(Boolean).slice(0, 20);
  const userContent = [
    `Niche: ${niche}`,
    top.length
      ? `Top hashtags already used: ${top.join(', ')}`
      : 'Top hashtags already used: (none yet — suggest strong starter sets)',
    '',
    'Return JSON only.',
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
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: HASHTAG_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error('[openai/generateHashtagBuckets]', res.status, detail.slice(0, 400));
    throw new Error(`OpenAI request failed (${res.status})`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error('OpenAI returned empty hashtag buckets');

  let parsed: { buckets?: HashtagBucket[] };
  try {
    parsed = JSON.parse(raw) as { buckets?: HashtagBucket[] };
  } catch {
    throw new Error('OpenAI returned invalid JSON for hashtag buckets');
  }

  const buckets = (parsed.buckets || [])
    .filter((b) => b && typeof b.title === 'string' && Array.isArray(b.tags))
    .map((b) => ({
      title: b.title.trim() || 'Hashtag set',
      tags: b.tags
        .map((tag) => {
          const t = String(tag || '').trim();
          if (!t) return '';
          return t.startsWith('#') ? t : `#${t}`;
        })
        .filter(Boolean)
        .slice(0, 16),
    }))
    .filter((b) => b.tags.length > 0)
    .slice(0, 3);

  if (buckets.length === 0) {
    throw new Error('OpenAI returned no usable hashtag buckets');
  }
  return buckets;
}

/**
 * Shared OpenAI Chat Completions helper for /api/ai/* routes.
 * Requires OPENAI_API_KEY in apps/web/.env.local (see .env.example).
 */

import { missingEnvResponse, openaiEnv } from '@/lib/config/env';

type ChatMessage = { role: string; content: string };

export async function createOpenAIChatStream(messages: ChatMessage[]): Promise<Response> {
  const apiKey = openaiEnv.apiKey();
  if (!apiKey) {
    return missingEnvResponse([...openaiEnv.requiredKeys], 'OpenAI');
  }

  const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: openaiEnv.model(),
      messages,
      stream: true,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '');
    console.error('[openai]', upstream.status, detail);
    return Response.json(
      { error: 'openai_upstream_error', status: upstream.status, detail: detail.slice(0, 400) },
      { status: 502 }
    );
  }

  // Convert SSE chat.completion.chunk → plain text token stream for existing clients.
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = upstream.body.getReader();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const data = trimmed.slice(5).trim();
            if (data === '[DONE]') continue;
            try {
              const json = JSON.parse(data) as {
                choices?: { delta?: { content?: string } }[];
              };
              const token = json.choices?.[0]?.delta?.content;
              if (token) controller.enqueue(encoder.encode(token));
            } catch {
              // skip malformed SSE lines
            }
          }
        }
      } catch (err) {
        console.error('[openai] stream error', err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}

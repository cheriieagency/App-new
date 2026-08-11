import { createOpenAIChatStream } from '@/lib/config/openai';

export async function POST(request: Request) {
  try {
    const { messages, lessonContext } = await request.json();

    const systemPrompt = `You are a helpful AI learning assistant for clikd: Community. You help members understand course content and navigate to the right lessons.

Available course lessons:
${lessonContext || 'No lessons available yet.'}

Guidelines:
1. Be concise and practical — 2-4 sentences per point
2. When referencing a specific lesson, use EXACTLY this format: [LESSON:lesson_id:Lesson Title]
   Example: "Start with [LESSON:3:Facebook Ads Basics] to understand the fundamentals."
3. Only reference lessons that exist in the list above (use the exact ID from [id] prefix)
4. If a lesson isn't directly relevant, don't force a reference
5. Answer as if you deeply understand the course content
6. Be encouraging and motivating — members are learning new skills`;

    return createOpenAIChatStream([
      { role: 'system', content: systemPrompt },
      ...(Array.isArray(messages) ? messages : []),
    ]);
  } catch (error) {
    console.error('Assistant AI error:', error);
    return Response.json({ error: 'AI assistant failed' }, { status: 500 });
  }
}

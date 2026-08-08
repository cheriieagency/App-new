const ACTION_CONFIGS: Record<string, { system: string; userPrefix: string }> = {
  'course-outline': {
    system: `You are an expert course creator for digital entrepreneurs. Create structured, engaging educational content with clear modules and lesson breakdowns. Format with numbered modules and bulleted lesson titles.`,
    userPrefix: 'Generate a comprehensive course outline',
  },
  'community-post': {
    system: `You are a community manager for Nordic Creator Community, a platform for Scandinavian digital creators. Write authentic, warm posts that drive engagement and inspire. Keep the tone conversational and motivating.`,
    userPrefix: 'Write an engaging community post',
  },
  'sales-email': {
    system: `You are a conversion-focused email copywriter for digital products. Write compelling sequences with clear subject lines and CTAs. Format as:\n\nEMAIL 1 - [Title]\nSubject: ...\n[Body]\n\nEMAIL 2 - [Title]\nSubject: ...\n[Body]\n\nEMAIL 3 - [Title]\nSubject: ...\n[Body]`,
    userPrefix: 'Write a 3-email sales email sequence',
  },
  headlines: {
    system: `You are a direct-response copywriter specializing in high-converting sales pages for digital creators. Write headlines that address pain points and aspirations. Number each headline 1-10.`,
    userPrefix: 'Generate 10 powerful sales page headlines',
  },
};

export async function POST(request: Request) {
  try {
    const { action, topic } = await request.json();

    const config = ACTION_CONFIGS[action];
    if (!config) {
      return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
    }

    const topicSuffix = topic
      ? ` about: "${topic}". Tailored for Nordic Creator Community — a platform for Scandinavian digital creators.`
      : ` for Nordic Creator Community — a platform for Scandinavian digital creators.`;

    const userMessage = config.userPrefix + topicSuffix;

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_CREATE_BASE_URL}/integrations/chat-gpt/conversationgpt4`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.ANYTHING_PROJECT_TOKEN}`,
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: config.system },
            { role: 'user', content: userMessage },
          ],
          stream: true,
        }),
      }
    );

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/plain',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('Creator AI error:', error);
    return new Response(JSON.stringify({ error: 'AI generation failed' }), { status: 500 });
  }
}

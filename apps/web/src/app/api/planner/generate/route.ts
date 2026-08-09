import {
  generateContentIdeas,
  polishCaption,
  type ContentTone,
  type SocialPlatform,
} from '@/lib/mock-content-planner';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = String(body.action ?? 'ideas');

    if (action === 'polish') {
      const caption = String(body.caption ?? '');
      const tone = (body.tone as ContentTone) || 'inspirerande';
      return Response.json({ caption: polishCaption(caption, tone) });
    }

    const platforms = Array.isArray(body.platforms)
      ? (body.platforms as SocialPlatform[])
      : [];
    const ideas = generateContentIdeas({
      prompt: String(body.prompt ?? ''),
      platforms,
      tone: (body.tone as ContentTone) || 'inspirerande',
    });

    return Response.json({ ideas });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}
